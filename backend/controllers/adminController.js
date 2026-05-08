import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import Consumption from '../models/Consumption.js';
import TariffRate from '../models/TariffRate.js';

// Get admin dashboard overview
export const getAdminOverview = async (req, res) => {
  try {
    // Get total users count
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const verifiedUsers = await User.countDocuments({ role: 'user', isVerified: true });

    // Get consumption statistics
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Get stats for current month
    const currentMonthStats = await Consumption.aggregate([
      { $match: { month: currentMonth, year: currentYear } },
      { $group: { _id: null, totalUnits: { $sum: '$totalUnits' }, totalBill: { $sum: '$estimatedBill' } } }
    ]);

    // Get overall stats (sum of latest record for each user)
    const latestConsumptionPerUser = await Consumption.aggregate([
      { $sort: { year: -1, month: -1 } },
      { $group: {
          _id: '$userId',
          latestUnits: { $first: '$totalUnits' },
          latestBill: { $first: '$estimatedBill' }
      }},
      { $group: {
          _id: null,
          totalUnits: { $sum: '$latestUnits' },
          totalBill: { $sum: '$latestBill' }
      }}
    ]);

    // Calculate system-wide projected consumption from custom appliances
    const customAppliancesStats = await Appliance.aggregate([
      { $match: { isCustom: true, isActive: true } },
      { $group: {
          _id: null,
          totalProjectedUnits: { 
            $sum: { 
              $divide: [
                { $multiply: ['$defaultWattage', { $ifNull: ['$usageHints.estimatedDailyHours', 4] }, 30] },
                1000
              ]
            } 
          }
      }}
    ]);

    const projectedUnits = customAppliancesStats[0]?.totalProjectedUnits || 0;
    const historicalUnits = latestConsumptionPerUser[0]?.totalUnits || 0;
    const currentMonthUnits = currentMonthStats[0]?.totalUnits || 0;

    const totalConsumption = Math.max(currentMonthUnits, projectedUnits, historicalUnits);
    let totalRevenue = currentMonthStats[0]?.totalBill || 0;

    console.log('📊 Admin Overview Stats:', {
      projectedUnits,
      historicalUnits,
      currentMonthUnits,
      selectedTotal: totalConsumption
    });

    // Estimate revenue if we are using projected units or if bill is 0 but consumption is not
    if (totalConsumption > 0 && (totalRevenue === 0 || totalConsumption > historicalUnits)) {
      const currentTariff = await TariffRate.getCurrentTariff();
      if (currentTariff) {
        totalRevenue = currentTariff.calculateBill(totalConsumption);
      } else {
        totalRevenue = totalConsumption * 5.5; // Default average rate
      }
    }

    // Get monthly growth
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    
    const lastMonthConsumption = await Consumption.aggregate([
      { $match: { month: lastMonth, year: lastMonthYear } },
      { $group: { _id: null, totalUnits: { $sum: '$totalUnits' } } }
    ]);

    const lastMonthTotal = lastMonthConsumption[0]?.totalUnits || 0;
    const monthlyGrowth = lastMonthTotal > 0 ? ((totalConsumption - lastMonthTotal) / lastMonthTotal * 100) : 0;

    // Get appliances count
    const totalAppliances = await Appliance.countDocuments();
    const customAppliancesCount = await Appliance.countDocuments({ isCustom: true });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          inactive: totalUsers - activeUsers
        },
        consumption: {
          currentMonth: Math.round(totalConsumption * 100) / 100,
          lastMonth: Math.round(lastMonthTotal * 100) / 100,
          growth: Math.round(monthlyGrowth * 100) / 100,
          isProjected: !currentMonthStats[0]
        },
        revenue: {
          currentMonth: Math.round(totalRevenue * 100) / 100,
          total: Math.round(totalRevenue * 100) / 100
        },
        appliances: {
          total: totalAppliances,
          custom: customAppliancesCount,
          default: totalAppliances - customAppliancesCount
        }
      }
    });
  } catch (error) {
    // Admin overview error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin overview'
    });
  }
};

// Get all users with pagination
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { role: 'user' };
    
    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { msebCustomerId: { $regex: search, $options: 'i' } }
      ];
    }

    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);

    // Get consumption data for each user
    const usersWithConsumption = await Promise.all(
      users.map(async (user) => {
        const consumptionHistory = await Consumption.find({ userId: user._id })
          .sort({ year: -1, month: -1 });
        
        const latestConsumption = consumptionHistory[0] || null;
        const totalRecords = consumptionHistory.length;
        let totalConsumption = consumptionHistory.reduce((sum, rec) => sum + rec.totalUnits, 0);
        let totalBill = consumptionHistory.reduce((sum, rec) => sum + rec.estimatedBill, 0);
        
        // Calculate projection if no history
        let projectedUnits = 0;
        if (totalRecords === 0) {
          const userAppliances = await Appliance.find({ createdBy: user._id, isCustom: true });
          userAppliances.forEach(app => {
            const hours = app.usageHints?.estimatedDailyHours || 4;
            projectedUnits += (app.defaultWattage * hours * 30) / 1000;
          });

          if (projectedUnits > 0) {
            totalConsumption = projectedUnits;
            // Rough estimate for bill in the list view
            totalBill = projectedUnits * 5.5;
          }
        }

        return {
          ...user.toObject(),
          consumption: {
            latest: latestConsumption ? {
              month: latestConsumption.month,
              year: latestConsumption.year,
              totalUnits: latestConsumption.totalUnits,
              estimatedBill: latestConsumption.estimatedBill,
              isEstimated: false
            } : null,
            statistics: {
              totalRecords: user.statistics?.totalRecords || totalRecords,
              totalConsumption: user.statistics?.totalConsumption || Math.round(totalConsumption * 100) / 100,
              totalBill: user.statistics?.totalBill || Math.round(totalBill * 100) / 100
            }
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithConsumption,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: skip + users.length < totalUsers,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    // Get all users error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// Get consumption analytics for admin
export const getConsumptionAnalytics = async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    
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

    // Monthly consumption trends
    let monthlyTrends = await Consumption.aggregate([
      {
        $match: {
          $or: [
            { year: { $gt: startDate.getFullYear() } },
            { 
              year: startDate.getFullYear(),
              month: { $gte: startDate.getMonth() + 1 }
            }
          ]
        }
      },
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          totalConsumption: { $sum: '$totalUnits' },
          totalBill: { $sum: '$estimatedBill' },
          userCount: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          month: '$_id.month',
          year: '$_id.year',
          totalConsumption: 1,
          totalBill: 1,
          userCount: { $size: '$userCount' }
        }
      },
      { $sort: { year: 1, month: 1 } }
    ]);

    // Fallback: if selected window has no data, return latest available 12 months.
    if (monthlyTrends.length === 0) {
      monthlyTrends = await Consumption.aggregate([
        {
          $group: {
            _id: { month: '$month', year: '$year' },
            totalConsumption: { $sum: '$totalUnits' },
            totalBill: { $sum: '$estimatedBill' },
            userCount: { $addToSet: '$userId' }
          }
        },
        {
          $project: {
            month: '$_id.month',
            year: '$_id.year',
            totalConsumption: 1,
            totalBill: 1,
            userCount: { $size: '$userCount' }
          }
        },
        { $sort: { year: -1, month: -1 } },
        { $limit: 12 },
        { $sort: { year: 1, month: 1 } }
      ]);
    }

    // Regional consumption
    const regionalConsumption = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $lookup: {
          from: 'consumptions',
          localField: '_id',
          foreignField: 'userId',
          as: 'consumptions'
        }
      },
      {
        $group: {
          _id: '$profile.address.city',
          totalConsumption: { $sum: { $sum: '$consumptions.totalUnits' } },
          userCount: { $sum: 1 }
        }
      },
      { $sort: { totalConsumption: -1 } },
      { $limit: 10 }
    ]);

    // Top consuming users
    const topConsumers = await Consumption.aggregate([
      {
        $group: {
          _id: '$userId',
          totalConsumption: { $sum: '$totalUnits' },
          totalBill: { $sum: '$estimatedBill' },
          recordCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: { $concat: ['$user.profile.firstName', ' ', '$user.profile.lastName'] },
          email: '$user.email',
          msebCustomerId: '$user.msebCustomerId',
          city: '$user.profile.address.city',
          totalConsumption: 1,
          totalBill: 1,
          recordCount: 1,
          averageConsumption: { $divide: ['$totalConsumption', '$recordCount'] }
        }
      },
      { $sort: { totalConsumption: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        monthlyTrends,
        regionalConsumption,
        topConsumers
      }
    });
  } catch (error) {
    // Consumption analytics error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consumption analytics'
    });
  }
};

// Get system-wide predictions with advanced algorithms
export const getSystemPredictions = async (req, res) => {
  try {
    // Get latest available 12 months (not strictly tied to current date window).
    const historicalData = await Consumption.aggregate([
      {
        $group: {
          _id: { month: '$month', year: '$year' },
          totalConsumption: { $sum: '$totalUnits' },
          totalBill: { $sum: '$estimatedBill' },
          userCount: { $addToSet: '$userId' },
          avgConsumptionPerUser: { $avg: '$totalUnits' }
        }
      },
      {
        $project: {
          month: '$_id.month',
          year: '$_id.year',
          totalConsumption: 1,
          totalBill: 1,
          userCount: { $size: '$userCount' },
          avgConsumptionPerUser: 1
        }
      },
      { $sort: { year: -1, month: -1 } },
      { $limit: 12 },
      { $sort: { year: 1, month: 1 } }
    ]);

    // Calculate current system-wide projected monthly units from active appliances
    const activeCustomAppliances = await Appliance.find({ isCustom: true, isActive: true });
    let projectedMonthlyUnits = 0;
    activeCustomAppliances.forEach(app => {
      const dailyHours = app.usageHints?.estimatedDailyHours || 4;
      const monthlyUnits = (app.defaultWattage * dailyHours * 30) / 1000;
      projectedMonthlyUnits += monthlyUnits;
    });

    const activeUsersCount = await User.countDocuments({ role: 'user', isActive: true });

    if (historicalData.length < 2) {
      // Fallback prediction based on active appliances and current user count
      const currentTariff = await TariffRate.getCurrentTariff();
      let fallbackRevenue = 0;
      
      const predictionBase = Math.max(projectedMonthlyUnits, 100); // Minimum 100kWh floor
      
      if (currentTariff) {
        fallbackRevenue = currentTariff.calculateBill(predictionBase);
      } else {
        fallbackRevenue = predictionBase * 5.5;
      }

      return res.json({
        success: true,
        data: {
          nextMonth: {
            consumption: Math.round(predictionBase),
            revenue: Math.round(fallbackRevenue),
            users: Math.round(activeUsersCount * 1.05) // Predict 5% growth
          },
          confidence: 40,
          trend: 'stable',
          historicalData: historicalData,
          isProjected: true
        }
      });
    }

    // Enhanced prediction algorithm combining multiple methods
    const recentData = historicalData.slice(-6); // Last 6 months for prediction
    
    // 1. Weighted Moving Average (40% weight)
    const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
    const weightedConsumption = recentData.slice(-5).reduce((sum, data, index) => {
      const weight = weights[index] || 0.05;
      return sum + (data.totalConsumption * weight);
    }, 0);

    // 2. Linear Trend Analysis (30% weight)
    let trendPrediction = 0;
    if (recentData.length >= 3) {
      const x = recentData.map((_, i) => i);
      const y = recentData.map(d => d.totalConsumption);
      const n = recentData.length;
      
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      trendPrediction = slope * n + intercept;
    }

    // 3. Seasonal Adjustment (30% weight)
    const nextMonth = new Date().getMonth() + 1;
    const seasonalFactors = {
      1: 0.9,   // January - Winter, moderate usage
      2: 0.85,  // February - Winter, lower usage
      3: 0.95,  // March - Spring transition
      4: 1.1,   // April - Moderate increase
      5: 1.3,   // May - Pre-summer increase
      6: 1.4,   // June - Summer peak begins
      7: 1.5,   // July - Peak summer
      8: 1.45,  // August - High summer
      9: 1.2,   // September - Post-summer
      10: 1.0,  // October - Moderate
      11: 0.9,  // November - Pre-winter
      12: 0.85  // December - Winter
    };
    
    const seasonalFactor = seasonalFactors[nextMonth] || 1.0;
    const lastMonthConsumption = recentData[recentData.length - 1].totalConsumption;
    const seasonalPrediction = lastMonthConsumption * seasonalFactor;

    // Combine predictions with weights
    const trendBase = weightedConsumption || (projectedMonthlyUnits / 100); // Small fallback if no history
    const combinedPrediction = Math.max(
      (
        trendBase * 0.4 +
        (trendPrediction || trendBase) * 0.3 +
        seasonalPrediction * 0.3
      ),
      projectedMonthlyUnits // Ensure prediction at least matches current appliance potential
    );

    // User growth prediction based on historical trend
    const userGrowthRate = recentData.length >= 2 ? 
      (recentData[recentData.length - 1].userCount - recentData[0].userCount) / recentData.length : 0;
    const predictedUsers = Math.max(
      recentData[recentData.length - 1].userCount + userGrowthRate,
      recentData[recentData.length - 1].userCount * 1.02 // Minimum 2% growth
    );

    // Revenue prediction based on consumption and current tariff
    let predictedRevenue = 0;
    const currentTariff = await TariffRate.getCurrentTariff();
    
    if (combinedPrediction > 0) {
      if (currentTariff) {
        predictedRevenue = currentTariff.calculateBill(combinedPrediction);
      } else {
        const avgRevenuePerUnit = recentData.length > 0
          ? recentData.reduce((sum, data) =>
            sum + (data.totalConsumption > 0 ? (data.totalBill / data.totalConsumption) : 0), 0) / recentData.length
          : 5.5;
        predictedRevenue = combinedPrediction * avgRevenuePerUnit;
      }
    }

    // Calculate confidence based on data consistency and amount
    let confidence = 60; // Base confidence
    
    // Increase confidence based on data points
    confidence += Math.min(25, historicalData.length * 2);
    
    // Adjust based on data consistency (lower variance = higher confidence)
    const consumptionValues = recentData.map(d => d.totalConsumption);
    const mean = consumptionValues.reduce((a, b) => a + b, 0) / consumptionValues.length;
    const variance = consumptionValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / consumptionValues.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    if (coefficientOfVariation < 0.1) confidence += 10; // Very consistent
    else if (coefficientOfVariation < 0.2) confidence += 5; // Moderately consistent
    else if (coefficientOfVariation > 0.4) confidence -= 10; // High variance

    confidence = Math.min(95, Math.max(50, confidence));

    // Determine trend with more sophisticated analysis
    let trend = 'stable';
    if (recentData.length >= 3) {
      const recent3Months = recentData.slice(-3).map(d => d.totalConsumption);
      const earlier3Months = recentData.slice(-6, -3).map(d => d.totalConsumption);
      
      if (recent3Months.length > 0 && earlier3Months.length > 0) {
        const recentAvg = recent3Months.reduce((a, b) => a + b, 0) / recent3Months.length;
        const earlierAvg = earlier3Months.reduce((a, b) => a + b, 0) / earlier3Months.length;
        
        const changePercent = ((recentAvg - earlierAvg) / earlierAvg) * 100;
        
        if (changePercent > 5) trend = 'increasing';
        else if (changePercent < -5) trend = 'decreasing';
        else trend = 'stable';
      }
    }

    res.json({
      success: true,
      data: {
        nextMonth: {
          consumption: Math.round(combinedPrediction),
          revenue: Math.round(predictedRevenue),
          users: Math.round(predictedUsers)
        },
        confidence: Math.round(confidence),
        trend,
        historicalData: historicalData.slice(-6), // Last 6 months
        predictionFactors: {
          weightedAverage: Math.round(weightedConsumption),
          trendAnalysis: Math.round(trendPrediction || 0),
          seasonalAdjustment: Math.round(seasonalPrediction),
          seasonalFactor,
          userGrowthRate: Math.round(userGrowthRate * 100) / 100,
          dataConsistency: Math.round((1 - coefficientOfVariation) * 100)
        }
      }
    });
  } catch (error) {
    // System predictions error
    res.status(500).json({
      success: false,
      message: 'Failed to generate system predictions'
    });
  }
};

// Update tariff rates
export const updateTariffRates = async (req, res) => {
  try {
    const { slabs, effectiveFrom, description } = req.body;
    const adminId = req.user._id;

    // Validate slabs
    if (!slabs || !Array.isArray(slabs) || slabs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid tariff slabs are required'
      });
    }

    // Create new tariff rate
    const newTariff = new TariffRate({
      slabs,
      effectiveFrom: new Date(effectiveFrom),
      createdBy: adminId,
      description,
      isActive: true
    });

    await newTariff.save();
    await newTariff.populate('createdBy', 'profile.firstName profile.lastName email');

    res.status(201).json({
      success: true,
      message: 'Tariff rates updated successfully',
      data: newTariff
    });
  } catch (error) {
    // Update tariff error
    res.status(500).json({
      success: false,
      message: 'Failed to update tariff rates'
    });
  }
};

// Get current tariff rates
export const getCurrentTariff = async (req, res) => {
  try {
    const currentTariff = await TariffRate.getCurrentTariff();
    
    if (!currentTariff) {
      return res.json({
        success: true,
        data: {
          slabs: [
            { minUnits: 0, maxUnits: 100, ratePerUnit: 3.5 },
            { minUnits: 101, maxUnits: 300, ratePerUnit: 4.5 },
            { minUnits: 301, maxUnits: 500, ratePerUnit: 6.0 },
            { minUnits: 501, maxUnits: 999999, ratePerUnit: 7.5 }
          ],
          effectiveFrom: null,
          description: 'Default tariff (no custom tariff configured yet)'
        }
      });
    }

    await currentTariff.populate('createdBy', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      data: currentTariff
    });
  } catch (error) {
    // Get current tariff error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current tariff'
    });
  }
};

// Toggle user status (activate/deactivate)
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found or cannot modify admin user'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { userId, isActive: user.isActive }
    });
  } catch (error) {
    // Toggle user status error
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// Get peak usage analysis
export const getPeakUsageAnalysis = async (req, res) => {
  try {
    const parseTimeToMinutes = (time) => {
      if (!time || typeof time !== 'string' || !time.includes(':')) return null;
      const [h, m] = time.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
      return (h * 60) + m;
    };

    const addRangeToBuckets = (buckets, startMinutes, endMinutes, monthlyKwh) => {
      const totalMinutes = endMinutes >= startMinutes
        ? endMinutes - startMinutes
        : ((24 * 60 - startMinutes) + endMinutes);
      if (totalMinutes <= 0 || monthlyKwh <= 0) return;

      for (let hour = 0; hour < 24; hour += 1) {
        const hourStart = hour * 60;
        const hourEnd = hourStart + 60;
        let overlap = 0;

        if (endMinutes >= startMinutes) {
          const s = Math.max(startMinutes, hourStart);
          const e = Math.min(endMinutes, hourEnd);
          overlap = Math.max(0, e - s);
        } else {
          const s1 = Math.max(startMinutes, hourStart);
          const e1 = Math.min(24 * 60, hourEnd);
          const s2 = Math.max(0, hourStart);
          const e2 = Math.min(endMinutes, hourEnd);
          overlap = Math.max(0, e1 - s1) + Math.max(0, e2 - s2);
        }

        if (overlap > 0) {
          buckets[hour] += monthlyKwh * (overlap / totalMinutes);
        }
      }
    };

    const getPeriodFromHour = (hour) => {
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';
      if (hour >= 18 && hour < 22) return 'evening';
      return 'night';
    };

    // Analyze custom appliances directly to show system capacity
    const customAppliancesData = await Appliance.find({ isCustom: true, isActive: true })
      .populate('createdBy', 'profile.address.city profile.firstName profile.lastName');

    // Get all consumption data with appliance details
    const consumptionData = await Consumption.find({})
      .populate({
        path: 'appliances.applianceId',
        select: 'name category defaultWattage usageHints'
      })
      .populate('userId', 'profile.address.city profile.firstName profile.lastName')
      .sort({ year: -1, month: -1 })
      .limit(1000);

    const hourBuckets = Array.from({ length: 24 }, () => 0);

    // Analyze peak usage dynamically from user-entered schedule data
    const peakAnalysis = {
      byTimeOfDay: {
        morning: { totalUsage: 0, appliances: {}, userCount: 0 },
        afternoon: { totalUsage: 0, appliances: {}, userCount: 0 },
        evening: { totalUsage: 0, appliances: {}, userCount: 0 },
        night: { totalUsage: 0, appliances: {}, userCount: 0 }
      },
      byCategory: {},
      topPeakAppliances: [],
      regionalPeakUsage: {},
      totalUsers: new Set()
    };

    // 1. Process custom appliances (installed capacity analysis)
    customAppliancesData.forEach(app => {
      if (!app.createdBy) return;
      const userId = app.createdBy._id.toString();
      const userCity = app.createdBy.profile?.address?.city || 'Unknown';
      peakAnalysis.totalUsers.add(userId);

      const category = app.category;
      const wattage = app.defaultWattage || 0;
      const hours = app.usageHints?.estimatedDailyHours || 4;
      const monthlyConsumption = (wattage * hours * 30) / 1000;
      if (monthlyConsumption <= 0) return;

      // Distribute usage across periods for peak analysis
      const periodUsage = monthlyConsumption / 4; 
      const perHour = monthlyConsumption / 24;

      ['morning', 'afternoon', 'evening', 'night'].forEach(period => {
        peakAnalysis.byTimeOfDay[period].totalUsage += periodUsage;
        peakAnalysis.byTimeOfDay[period].userCount++;
        if (!peakAnalysis.byTimeOfDay[period].appliances[app.name]) {
          peakAnalysis.byTimeOfDay[period].appliances[app.name] = { usage: 0, count: 0, category, avgWattage: wattage };
        }
        peakAnalysis.byTimeOfDay[period].appliances[app.name].usage += periodUsage;
        peakAnalysis.byTimeOfDay[period].appliances[app.name].count++;
      });

      for (let h = 0; h < 24; h++) hourBuckets[h] += perHour;

      if (!peakAnalysis.byCategory[category]) {
        peakAnalysis.byCategory[category] = {
          totalUsage: 0,
          peakTimes: { morning: 0, afternoon: 0, evening: 0, night: 0 },
          appliances: {}
        };
      }
      peakAnalysis.byCategory[category].totalUsage += monthlyConsumption;

      if (!peakAnalysis.regionalPeakUsage[userCity]) {
        peakAnalysis.regionalPeakUsage[userCity] = {
          totalUsage: 0,
          peakTimes: { morning: 0, afternoon: 0, evening: 0, night: 0 },
          userCount: new Set()
        };
      }
      peakAnalysis.regionalPeakUsage[userCity].totalUsage += monthlyConsumption;
      peakAnalysis.regionalPeakUsage[userCity].userCount.add(userId);
    });

    // 2. Process historical consumption (actual recorded data)
    // We only add this if it's not already accounted for by appliances, or we aggregate them
    consumptionData.forEach(consumption => {
      if (!consumption.userId) return;
      const userId = consumption.userId._id.toString();
      const userCity = consumption.userId.profile?.address?.city || 'Unknown';
      
      peakAnalysis.totalUsers.add(userId);

      consumption.appliances.forEach(appUsage => {
        const appliance = appUsage.applianceId;
        if (!appliance) return;

        const category = appliance.category;
        const wattage = appUsage.customWattage || appliance.defaultWattage || 0;
        const dailyConsumption = (wattage * appUsage.dailyHours) / 1000; 
        const monthlyConsumption = dailyConsumption * 30 * appUsage.quantity;
        if (!Number.isFinite(monthlyConsumption) || monthlyConsumption <= 0) return;

        // Skip adding if we want to avoid double counting projections? 
        // Actually, for "Analyzed" we want to show the data we HAVE.
        
        const hourContribByAppliance = Array.from({ length: 24 }, () => 0);
        const usageSlots = Array.isArray(appUsage.usageSlots) ? appUsage.usageSlots : [];

        if (usageSlots.length > 0) {
          const perHour = monthlyConsumption / usageSlots.length;
          usageSlots.forEach((hour) => {
            hourBuckets[hour] += perHour;
            hourContribByAppliance[hour] += perHour;
          });
        }

        // Aggregate into periods
        for (let hour = 0; hour < 24; hour++) {
          if (hourContribByAppliance[hour] <= 0) continue;
          const period = getPeriodFromHour(hour);
          peakAnalysis.byTimeOfDay[period].totalUsage += hourContribByAppliance[hour];
        }
      });
    });

    // Convert sets to counts
    Object.keys(peakAnalysis.regionalPeakUsage).forEach(city => {
      peakAnalysis.regionalPeakUsage[city].userCount = peakAnalysis.regionalPeakUsage[city].userCount.size;
    });

    // Generate top peak appliances
    const allAppliances = {};
    Object.values(peakAnalysis.byTimeOfDay).forEach(timeData => {
      Object.entries(timeData.appliances).forEach(([name, data]) => {
        if (!allAppliances[name]) {
          allAppliances[name] = { ...data, peakTime: '' };
        } else {
          allAppliances[name].usage += data.usage;
          allAppliances[name].count += data.count;
        }
      });
    });

    peakAnalysis.topPeakAppliances = Object.entries(allAppliances)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);

    const peakHours = hourBuckets.map((value, hour) => {
      const nextHour = (hour + 1) % 24;
      return {
        hour: `${hour.toString().padStart(2, '0')}:00-${nextHour.toString().padStart(2, '0')}:00`,
        consumption: Math.round(value * 100) / 100,
        period: getPeriodFromHour(hour)
      };
    });

    res.json({
      success: true,
      data: {
        peakAnalysis: {
          ...peakAnalysis,
          totalUsers: peakAnalysis.totalUsers.size
        },
        peakHours: peakHours.sort((a, b) => b.consumption - a.consumption),
        summary: {
          totalConsumptionAnalyzed: Object.values(peakAnalysis.byTimeOfDay).reduce((sum, time) => sum + time.totalUsage, 0),
          totalUsersAnalyzed: peakAnalysis.totalUsers.size,
          topPeakPeriod: Object.entries(peakAnalysis.byTimeOfDay).reduce((max, [period, data]) => 
            data.totalUsage > max.usage ? { period, usage: data.totalUsage } : max, 
            { period: 'morning', usage: 0 }
          )
        }
      }
    });
  } catch (error) {
    // Peak usage analysis error
    res.status(500).json({
      success: false,
      message: 'Failed to generate peak usage analysis'
    });
  }
};

// Get user details with consumption history and predictions
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fetch user with fresh data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get consumption history
    const consumptionHistory = await Consumption.find({ userId })
      .sort({ year: -1, month: -1 });

    const totalRecords = consumptionHistory.length;
    let totalUnitsHistory = consumptionHistory.reduce((sum, record) => sum + (record.totalUnits || 0), 0);
    let totalBillHistory = consumptionHistory.reduce((sum, record) => sum + (record.estimatedBill || 0), 0);
    let averageConsumptionHistory = totalRecords > 0 ? totalUnitsHistory / totalRecords : 0;

    // Get custom appliances
    const customAppliances = await Appliance.find({
      createdBy: userId,
      isCustom: true,
      isActive: true
    });

    // Calculate projections
    let projectedMonthlyUnits = 0;
    customAppliances.forEach(app => {
      const dailyHours = app.usageHints?.estimatedDailyHours || 4;
      const monthlyUnits = (app.defaultWattage * dailyHours * 30) / 1000;
      projectedMonthlyUnits += monthlyUnits;
    });

    // Resolve final statistics: Prioritize Database -> Then History -> Then Projections
    const finalTotalConsumption = user.statistics?.totalConsumption || totalUnitsHistory || projectedMonthlyUnits;
    const finalTotalBill = user.statistics?.totalBill || totalBillHistory || (projectedMonthlyUnits * 5.5);
    const finalAverageConsumption = user.statistics?.averageMonthlyConsumption || averageConsumptionHistory || projectedMonthlyUnits;
    const finalTotalRecords = user.statistics?.totalRecords || totalRecords;

    console.log(`🔍 [ADMIN] User Details Fetch: ${user.email}`, {
      db_stats: user.statistics,
      history_stats: { totalUnitsHistory, totalRecords },
      projections: projectedMonthlyUnits,
      resolved: { finalTotalConsumption, finalTotalBill, finalAverageConsumption }
    });

    // Generate user-specific prediction
    let userPrediction = null;
    if (consumptionHistory.length >= 2) {
      const recentData = consumptionHistory.slice(0, 6).reverse(); // Last 6 months, chronological order
      
      // Simple trend analysis for individual user
      const weights = [0.4, 0.3, 0.2, 0.1];
      const weightedConsumption = recentData.slice(-4).reduce((sum, data, index) => {
        const weight = weights[index] || 0.1;
        return sum + (data.totalUnits * weight);
      }, 0);

      // Apply seasonal factor
      const nextMonth = new Date().getMonth() + 1;
      const seasonalFactors = {
        1: 0.9, 2: 0.85, 3: 0.95, 4: 1.1, 5: 1.3, 6: 1.4,
        7: 1.5, 8: 1.45, 9: 1.2, 10: 1.0, 11: 0.9, 12: 0.85
      };
      
      const seasonalFactor = seasonalFactors[nextMonth] || 1.0;
      const predictedConsumption = weightedConsumption * seasonalFactor;
      
      // Estimate bill based on current tariff
      const avgRatePerUnit = finalTotalConsumption > 0 ? (finalTotalBill / finalTotalConsumption) : 5;
      const predictedBill = predictedConsumption * avgRatePerUnit;

      userPrediction = {
        nextMonth: {
          consumption: Math.round(predictedConsumption * 100) / 100,
          estimatedBill: Math.round(predictedBill * 100) / 100
        },
        confidence: Math.min(90, Math.max(60, 70 + (recentData.length * 3))),
        basedOnMonths: recentData.length
      };
    } else if (projectedMonthlyUnits > 0) {
      // Provide a prediction even with just appliance data
      const currentTariff = await TariffRate.getCurrentTariff();
      let projectedBill = 0;
      if (currentTariff) {
        projectedBill = currentTariff.calculateBill(projectedMonthlyUnits);
      } else {
        projectedBill = projectedMonthlyUnits * 5;
      }

      userPrediction = {
        nextMonth: {
          consumption: Math.round(projectedMonthlyUnits * 100) / 100,
          estimatedBill: Math.round(projectedBill * 100) / 100
        },
        confidence: 50,
        basedOnMonths: 0,
        isProjected: true
      };
    }

    res.json({
      success: true,
      data: {
        user,
        consumption: {
          history: consumptionHistory,
          statistics: {
            totalRecords: finalTotalRecords,
            totalConsumption: Math.round(finalTotalConsumption * 100) / 100,
            totalBill: Math.round(finalTotalBill * 100) / 100,
            averageConsumption: Math.round(finalAverageConsumption * 100) / 100,
            projectedMonthlyConsumption: Math.round(projectedMonthlyUnits * 100) / 100
          }
        },
        customAppliances,
        prediction: userPrediction
      }
    });
  } catch (error) {
    // Get user details error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
};

// Delete user and all associated data
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🗑️  Delete user request for ID:', userId);
    
    // Validate ObjectId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('❌ Invalid user ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    console.log('👤 User found:', user ? `${user.email} (${user.role})` : 'Not found');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting admin users
    if (user.role === 'admin') {
      console.log('⚠️  Attempted to delete admin user');
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete all associated data
    console.log('🗑️  Deleting associated data...');
    
    // 1. Delete user's appliances
    const appliancesDeleted = await Appliance.deleteMany({ createdBy: userId });
    console.log(`   ✅ Deleted ${appliancesDeleted.deletedCount} appliances`);
    
    // 2. Delete user's consumption records
    const consumptionDeleted = await Consumption.deleteMany({ userId: userId });
    console.log(`   ✅ Deleted ${consumptionDeleted.deletedCount} consumption records`);
    
    // 3. Delete the user
    await User.findByIdAndDelete(userId);
    console.log(`   ✅ Deleted user: ${user.email}`);

    console.log('✅ User deletion completed successfully');

    res.json({
      success: true,
      message: 'User and all associated data deleted successfully',
      data: {
        deletedAppliances: appliancesDeleted.deletedCount,
        deletedConsumptionRecords: consumptionDeleted.deletedCount
      }
    });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

