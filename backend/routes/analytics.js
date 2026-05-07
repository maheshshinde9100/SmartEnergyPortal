import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Consumption from '../models/Consumption.js';
import Appliance from '../models/Appliance.js';

const router = express.Router();

const parseTimeToMinutes = (timeString) => {
  if (!timeString || typeof timeString !== 'string' || !timeString.includes(':')) return null;
  const [hoursStr, minutesStr] = timeString.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

const addMinutesRangeToHourlyBuckets = (buckets, startMinutes, endMinutes, monthlyKwh) => {
  if (!Array.isArray(buckets) || buckets.length !== 24) return;
  if (typeof monthlyKwh !== 'number' || !Number.isFinite(monthlyKwh) || monthlyKwh <= 0) return;

  const totalMinutes =
    endMinutes >= startMinutes ? (endMinutes - startMinutes) : ((24 * 60 - startMinutes) + endMinutes);
  if (totalMinutes <= 0) return;

  for (let hour = 0; hour < 24; hour += 1) {
    const hourStart = hour * 60;
    const hourEnd = hourStart + 60;

    let overlap = 0;
    if (endMinutes >= startMinutes) {
      const start = Math.max(startMinutes, hourStart);
      const end = Math.min(endMinutes, hourEnd);
      overlap = Math.max(0, end - start);
    } else {
      // crosses midnight: [start..1440) + [0..end)
      const startA = Math.max(startMinutes, hourStart);
      const endA = Math.min(24 * 60, hourEnd);
      const overlapA = Math.max(0, endA - startA);

      const startB = Math.max(0, hourStart);
      const endB = Math.min(endMinutes, hourEnd);
      const overlapB = Math.max(0, endB - startB);

      overlap = overlapA + overlapB;
    }

    if (overlap > 0) {
      buckets[hour] += (monthlyKwh * (overlap / totalMinutes));
    }
  }
};

// Get consumption trends
router.get('/trends', authenticate, async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    const userId = req.user.id;
    
    let startDate = new Date();
    switch (period) {
      case '3months':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case '2years':
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    const consumptionData = await Consumption.find({
      userId,
      submittedAt: { $gte: startDate }
    }).sort({ year: 1, month: 1 });

    // Process data for trends
    const monthlyTrends = consumptionData.map(record => ({
      month: new Date(record.year, record.month - 1).toLocaleDateString('en-US', { month: 'short' }),
      year: record.year,
      consumption: record.totalUnits,
      bill: record.estimatedBill,
      prediction: record.totalUnits * 1.05 // Simple prediction logic
    }));

    res.json({
      success: true,
      data: {
        monthly: monthlyTrends,
        summary: {
          totalConsumption: consumptionData.reduce((sum, record) => sum + record.totalUnits, 0),
          averageMonthly: consumptionData.length > 0 ? 
            consumptionData.reduce((sum, record) => sum + record.totalUnits, 0) / consumptionData.length : 0,
          totalBill: consumptionData.reduce((sum, record) => sum + record.estimatedBill, 0)
        }
      }
    });
  } catch (error) {
    console.error('Analytics trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trends'
    });
  }
});

// Get peak hours analysis
router.get('/peak-hours', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const latestConsumption = await Consumption.findOne({ userId })
      .sort({ submittedAt: -1 })
      .populate('appliances.applianceId');

    if (!latestConsumption) {
      const empty = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        consumption: 0
      }));

      return res.json({
        success: true,
        data: empty
      });
    }

    const buckets = Array.from({ length: 24 }, () => 0);

    latestConsumption.appliances.forEach((appUsage) => {
      const appliance = appUsage.applianceId;
      if (!appliance) return;

      const wattage = appUsage.customWattage || appliance.defaultWattage || 0;
      const quantity = appUsage.quantity || 1;
      if (!wattage || wattage <= 0) return;

      // Monthly kWh for the appliance (based on stored dailyHours)
      const monthlyKwh = ((wattage * (appUsage.dailyHours || 0)) / 1000) * 30 * quantity;
      if (!Number.isFinite(monthlyKwh) || monthlyKwh <= 0) return;

      // Prefer usageSlots (explicit hourly selection)
      if (Array.isArray(appUsage.usageSlots) && appUsage.usageSlots.length > 0) {
        const uniqSlots = [...new Set(appUsage.usageSlots)].filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);
        if (uniqSlots.length > 0) {
          const perHour = monthlyKwh / uniqSlots.length;
          uniqSlots.forEach((h) => {
            buckets[h] += perHour;
          });
          return;
        }
      }

      // Next: timeRanges (multiple start/end ranges) distribute by minute overlap
      if (Array.isArray(appUsage.timeRanges) && appUsage.timeRanges.length > 0) {
        const validRanges = [];
        let totalMinutes = 0;

        appUsage.timeRanges.forEach(range => {
          const startMinutes = parseTimeToMinutes(range.start);
          const endMinutes = parseTimeToMinutes(range.end);
          if (startMinutes !== null && endMinutes !== null) {
            const diff = endMinutes >= startMinutes
              ? endMinutes - startMinutes
              : (24 * 60 - startMinutes) + endMinutes;
            if (diff > 0) {
              validRanges.push({ startMinutes, endMinutes, diff });
              totalMinutes += diff;
            }
          }
        });

        if (totalMinutes > 0) {
          validRanges.forEach((range) => {
            addMinutesRangeToHourlyBuckets(
              buckets,
              range.startMinutes,
              range.endMinutes,
              monthlyKwh * (range.diff / totalMinutes)
            );
          });
        }
        return;
      }

      // Fallback: distribute evenly across day based on dailyHours
      const hours = Math.max(0, Math.min(24, appUsage.dailyHours || 0));
      if (hours <= 0) return;
      const perHour = monthlyKwh / hours;
      for (let h = 0; h < 24; h += 1) {
        // naive: assume usage could happen anytime; keep distribution flat
        buckets[h] += perHour * (hours / 24);
      }
    });

    const peakHoursData = buckets.map((kwh, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      consumption: Math.round(kwh * 10) / 10
    }));

    res.json({
      success: true,
      data: peakHoursData
    });
  } catch (error) {
    console.error('Peak hours error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch peak hours data'
    });
  }
});

// Get appliance comparisons
router.get('/comparisons', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get latest consumption record
    const latestConsumption = await Consumption.findOne({ userId })
      .sort({ submittedAt: -1 })
      .populate('appliances.applianceId');

    if (!latestConsumption) {
      return res.json({
        success: true,
        data: {
          appliances: [],
          seasonal: []
        }
      });
    }

    // Calculate appliance breakdown
    const applianceBreakdown = latestConsumption.appliances.map(appliance => {
      const dailyConsumption = (appliance.customWattage || appliance.applianceId.defaultWattage) * 
                              appliance.dailyHours * appliance.quantity / 1000;
      const monthlyConsumption = dailyConsumption * 30;
      
      return {
        name: appliance.applianceId.name,
        consumption: Math.round(monthlyConsumption * 10) / 10,
        percentage: Math.round((monthlyConsumption / latestConsumption.totalUnits) * 100)
      };
    }).sort((a, b) => b.consumption - a.consumption);

    // Seasonal data derived from consumption records (last 12 months)
    const last12 = await Consumption.find({ userId })
      .sort({ year: -1, month: -1 })
      .limit(12);

    const seasonOfMonth = (m) => {
      // India-ish seasons for Maharashtra: Winter(Dec-Feb), Summer(Mar-May), Monsoon(Jun-Sep), Post-monsoon(Oct-Nov)
      if ([12, 1, 2].includes(m)) return 'Winter';
      if ([3, 4, 5].includes(m)) return 'Summer';
      if ([6, 7, 8, 9].includes(m)) return 'Monsoon';
      return 'Post-monsoon';
    };

    const seasonalAgg = new Map();
    last12.forEach((rec) => {
      const season = seasonOfMonth(rec.month);
      const prev = seasonalAgg.get(season) || { season, consumption: 0, months: 0 };
      prev.consumption += rec.totalUnits || 0;
      prev.months += 1;
      seasonalAgg.set(season, prev);
    });

    const seasonalData = Array.from(seasonalAgg.values()).map((s) => {
      const avg = s.months > 0 ? (s.consumption / s.months) : 0;
      // Efficiency is a placeholder heuristic until smart-meter / device-level telemetry exists
      const efficiency = avg <= 0 ? 0 : Math.max(0, Math.min(100, 100 - (avg - 200) / 5));
      return {
        season: s.season,
        consumption: Math.round(avg * 10) / 10,
        efficiency: Math.round(efficiency)
      };
    });

    res.json({
      success: true,
      data: {
        appliances: applianceBreakdown,
        seasonal: seasonalData
      }
    });
  } catch (error) {
    console.error('Comparisons error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comparison data'
    });
  }
});

// Get efficiency recommendations
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's consumption patterns
    const recentConsumption = await Consumption.find({ userId })
      .sort({ submittedAt: -1 })
      .limit(3)
      .populate('appliances.applianceId');

    if (recentConsumption.length === 0) {
      return res.json({
        success: true,
        data: {
          score: 0,
          recommendations: ['Start tracking your appliance usage to get personalized recommendations']
        }
      });
    }

    // Calculate efficiency score (simplified logic)
    const avgConsumption = recentConsumption.reduce((sum, record) => sum + record.totalUnits, 0) / recentConsumption.length;
    const efficiencyScore = Math.max(0, Math.min(100, 100 - (avgConsumption - 200) / 5));

    // Generate recommendations based on consumption patterns
    const recommendations = [];
    
    if (avgConsumption > 300) {
      recommendations.push('Your consumption is above average. Consider upgrading to energy-efficient appliances.');
    }
    
    recommendations.push(
      'Use appliances during off-peak hours (11 PM - 6 AM) for lower tariff rates',
      'Set air conditioner temperature to 24°C for optimal efficiency',
      'Replace incandescent bulbs with LED lights to save up to 80% energy',
      'Unplug electronics when not in use to avoid phantom loads'
    );

    res.json({
      success: true,
      data: {
        score: Math.round(efficiencyScore),
        recommendations: recommendations.slice(0, 4),
        potentialSavings: Math.round(avgConsumption * 0.15 * 5) // Estimated monthly savings
      }
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations'
    });
  }
});

// Get consumption predictions
router.get('/predictions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get historical data for predictions
    const historicalData = await Consumption.find({ userId })
      .sort({ year: -1, month: -1 })
      .limit(6);

    if (historicalData.length < 2) {
      return res.json({
        success: true,
        data: {
          nextMonth: 0,
          confidence: 0,
          trend: 'insufficient_data'
        }
      });
    }

    // Simple moving average prediction
    const weights = [0.4, 0.3, 0.2, 0.1];
    const recentData = historicalData.slice(0, 4);
    
    const weightedSum = recentData.reduce((sum, data, index) => {
      const weight = weights[index] || 0.1;
      return sum + (data.totalUnits * weight);
    }, 0);

    // Apply seasonal factor
    const currentMonth = new Date().getMonth();
    const seasonalFactors = [0.9, 0.85, 0.95, 1.1, 1.3, 1.4, 1.5, 1.45, 1.2, 1.0, 0.9, 0.85];
    const seasonalFactor = seasonalFactors[currentMonth];
    
    const prediction = Math.round(weightedSum * seasonalFactor);
    const confidence = Math.min(95, Math.max(60, 85 - (6 - historicalData.length) * 5));

    // Determine trend
    const recent = historicalData[0].totalUnits;
    const previous = historicalData[1].totalUnits;
    const trend = recent > previous * 1.05 ? 'increasing' : 
                 recent < previous * 0.95 ? 'decreasing' : 'stable';

    res.json({
      success: true,
      data: {
        nextMonth: prediction,
        confidence,
        trend,
        factors: {
          seasonal: seasonalFactor,
          historical: weightedSum
        }
      }
    });
  } catch (error) {
    console.error('Predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions'
    });
  }
});

export default router;