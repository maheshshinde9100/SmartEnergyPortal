import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Consumption from '../models/Consumption.js';
import Appliance from '../models/Appliance.js';

const router = express.Router();

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
    
    // Mock peak hours data - in real implementation, this would come from smart meter data
    const peakHoursData = Array.from({ length: 24 }, (_, hour) => {
      let consumption;
      if (hour >= 6 && hour <= 8) consumption = 25 + Math.random() * 10; // Morning peak
      else if (hour >= 18 && hour <= 21) consumption = 35 + Math.random() * 15; // Evening peak
      else if (hour >= 22 || hour <= 5) consumption = 8 + Math.random() * 5; // Night low
      else consumption = 15 + Math.random() * 8; // Day average
      
      return {
        hour: `${hour.toString().padStart(2, '0')}:00`,
        consumption: Math.round(consumption * 10) / 10
      };
    });

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

    // Mock seasonal data
    const seasonalData = [
      { season: 'Winter', consumption: 280, efficiency: 85 },
      { season: 'Spring', consumption: 220, efficiency: 92 },
      { season: 'Summer', consumption: 380, efficiency: 78 },
      { season: 'Monsoon', consumption: 250, efficiency: 88 }
    ];

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