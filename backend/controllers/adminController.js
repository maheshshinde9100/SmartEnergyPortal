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
    
    const currentMonthConsumption = await Consumption.aggregate([
      { $match: { month: currentMonth, year: currentYear } },
      { $group: { _id: null, totalUnits: { $sum: '$totalUnits' }, totalBill: { $sum: '$estimatedBill' } } }
    ]);

    const totalConsumption = currentMonthConsumption[0]?.totalUnits || 0;
    const totalRevenue = currentMonthConsumption[0]?.totalBill || 0;

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
    const customAppliances = await Appliance.countDocuments({ isCustom: true });

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
          growth: Math.round(monthlyGrowth * 100) / 100
        },
        revenue: {
          currentMonth: Math.round(totalRevenue * 100) / 100,
          total: Math.round(totalRevenue * 100) / 100
        },
        appliances: {
          total: totalAppliances,
          custom: customAppliances,
          default: totalAppliances - customAppliances
        }
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
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
        const latestConsumption = await Consumption.findOne({ userId: user._id })
          .sort({ year: -1, month: -1 });
        
        const totalRecords = await Consumption.countDocuments({ userId: user._id });
        
        return {
          ...user.toObject(),
          consumption: {
            latest: latestConsumption ? {
              month: latestConsumption.month,
              year: latestConsumption.year,
              totalUnits: latestConsumption.totalUnits,
              estimatedBill: latestConsumption.estimatedBill
            } : null,
            totalRecords
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
    console.error('Get all users error:', error);
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
      default:
        startDate.setMonth(startDate.getMonth() - 6);
    }

    // Monthly consumption trends
    const monthlyTrends = await Consumption.aggregate([
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
    console.error('Consumption analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consumption analytics'
    });
  }
};

// Get system-wide predictions with advanced algorithms
export const getSystemPredictions = async (req, res) => {
  try {
    // Get all consumption data for the last 12 months for better prediction accuracy
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const historicalData = await Consumption.aggregate([
      {
        $match: {
          $or: [
            { year: { $gt: twelveMonthsAgo.getFullYear() } },
            { 
              year: twelveMonthsAgo.getFullYear(),
              month: { $gte: twelveMonthsAgo.getMonth() + 1 }
            }
          ]
        }
      },
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
      { $sort: { year: 1, month: 1 } }
    ]);

    if (historicalData.length < 2) {
      return res.json({
        success: true,
        data: {
          nextMonth: {
            consumption: 0,
            revenue: 0,
            users: 0
          },
          confidence: 0,
          trend: 'insufficient_data',
          historicalData: []
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
    const combinedPrediction = (
      weightedConsumption * 0.4 +
      (trendPrediction || weightedConsumption) * 0.3 +
      seasonalPrediction * 0.3
    );

    // User growth prediction based on historical trend
    const userGrowthRate = recentData.length >= 2 ? 
      (recentData[recentData.length - 1].userCount - recentData[0].userCount) / recentData.length : 0;
    const predictedUsers = Math.max(
      recentData[recentData.length - 1].userCount + userGrowthRate,
      recentData[recentData.length - 1].userCount * 1.02 // Minimum 2% growth
    );

    // Revenue prediction based on consumption and current tariff
    const avgRevenuePerUnit = recentData.reduce((sum, data) => 
      sum + (data.totalBill / data.totalConsumption), 0) / recentData.length;
    const predictedRevenue = combinedPrediction * avgRevenuePerUnit;

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
    console.error('System predictions error:', error);
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
    console.error('Update tariff error:', error);
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
      return res.status(404).json({
        success: false,
        message: 'No active tariff found'
      });
    }

    await currentTariff.populate('createdBy', 'profile.firstName profile.lastName email');

    res.json({
      success: true,
      data: currentTariff
    });
  } catch (error) {
    console.error('Get current tariff error:', error);
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
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// Get peak usage analysis
export const getPeakUsageAnalysis = async (req, res) => {
  try {
    // Get all consumption data with appliance details
    const consumptionData = await Consumption.find({})
      .populate({
        path: 'appliances.applianceId',
        select: 'name category defaultWattage usageHints'
      })
      .populate('userId', 'profile.address.city profile.firstName profile.lastName')
      .sort({ year: -1, month: -1 })
      .limit(1000); // Limit for performance

    // Analyze peak usage by time periods
    const peakAnalysis = {
      byTimeOfDay: {
        morning: { totalUsage: 0, appliances: {}, userCount: 0 },
        afternoon: { totalUsage: 0, appliances: {}, userCount: 0 },
        evening: { totalUsage: 0, appliances: {}, userCount: 0 },
        night: { totalUsage: 0, appliances: {}, userCount: 0 },
        allDay: { totalUsage: 0, appliances: {}, userCount: 0 }
      },
      byCategory: {},
      topPeakAppliances: [],
      regionalPeakUsage: {},
      totalUsers: new Set()
    };

    // Process consumption data
    consumptionData.forEach(consumption => {
      const userId = consumption.userId._id.toString();
      const userCity = consumption.userId.profile?.address?.city || 'Unknown';
      
      peakAnalysis.totalUsers.add(userId);

      consumption.appliances.forEach(appUsage => {
        const appliance = appUsage.applianceId;
        if (!appliance) return;

        const peakTime = appliance.usageHints?.peakUsageTime || 'all-day';
        const category = appliance.category;
        const dailyConsumption = (appliance.defaultWattage * appUsage.dailyHours) / 1000; // kWh
        const monthlyConsumption = dailyConsumption * 30 * appUsage.quantity;

        // Peak time analysis
        if (peakAnalysis.byTimeOfDay[peakTime]) {
          peakAnalysis.byTimeOfDay[peakTime].totalUsage += monthlyConsumption;
          peakAnalysis.byTimeOfDay[peakTime].userCount++;
          
          if (!peakAnalysis.byTimeOfDay[peakTime].appliances[appliance.name]) {
            peakAnalysis.byTimeOfDay[peakTime].appliances[appliance.name] = {
              usage: 0,
              count: 0,
              category: category,
              avgWattage: appliance.defaultWattage
            };
          }
          peakAnalysis.byTimeOfDay[peakTime].appliances[appliance.name].usage += monthlyConsumption;
          peakAnalysis.byTimeOfDay[peakTime].appliances[appliance.name].count++;
        }

        // Category analysis
        if (!peakAnalysis.byCategory[category]) {
          peakAnalysis.byCategory[category] = {
            totalUsage: 0,
            peakTimes: { morning: 0, afternoon: 0, evening: 0, night: 0, allDay: 0 },
            appliances: {}
          };
        }
        peakAnalysis.byCategory[category].totalUsage += monthlyConsumption;
        peakAnalysis.byCategory[category].peakTimes[peakTime] += monthlyConsumption;

        // Regional analysis
        if (!peakAnalysis.regionalPeakUsage[userCity]) {
          peakAnalysis.regionalPeakUsage[userCity] = {
            totalUsage: 0,
            peakTimes: { morning: 0, afternoon: 0, evening: 0, night: 0, allDay: 0 },
            userCount: new Set()
          };
        }
        peakAnalysis.regionalPeakUsage[userCity].totalUsage += monthlyConsumption;
        peakAnalysis.regionalPeakUsage[userCity].peakTimes[peakTime] += monthlyConsumption;
        peakAnalysis.regionalPeakUsage[userCity].userCount.add(userId);
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

    // Calculate peak hours (simplified simulation)
    const peakHours = [
      { hour: '06:00-08:00', consumption: 0, period: 'morning' },
      { hour: '08:00-10:00', consumption: 0, period: 'morning' },
      { hour: '10:00-12:00', consumption: 0, period: 'morning' },
      { hour: '12:00-14:00', consumption: 0, period: 'afternoon' },
      { hour: '14:00-16:00', consumption: 0, period: 'afternoon' },
      { hour: '16:00-18:00', consumption: 0, period: 'afternoon' },
      { hour: '18:00-20:00', consumption: 0, period: 'evening' },
      { hour: '20:00-22:00', consumption: 0, period: 'evening' },
      { hour: '22:00-00:00', consumption: 0, period: 'night' },
      { hour: '00:00-06:00', consumption: 0, period: 'night' }
    ];

    // Distribute usage across hours based on peak times
    peakHours.forEach(hourData => {
      const periodUsage = peakAnalysis.byTimeOfDay[hourData.period]?.totalUsage || 0;
      hourData.consumption = Math.round((periodUsage / 3) * 100) / 100; // Divide by 3 for 3 time slots per period
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
    console.error('Peak usage analysis error:', error);
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
    
    const user = await User.findById(userId).select('-password -refreshTokens');
    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get consumption history
    const consumptionHistory = await Consumption.find({ userId })
      .populate('appliances.applianceId', 'name category defaultWattage')
      .sort({ year: -1, month: -1 })
      .limit(12);

    // Get custom appliances
    const customAppliances = await Appliance.find({ createdBy: userId, isCustom: true });

    // Calculate statistics
    const totalConsumption = consumptionHistory.reduce((sum, record) => sum + record.totalUnits, 0);
    const totalBill = consumptionHistory.reduce((sum, record) => sum + record.estimatedBill, 0);
    const averageConsumption = consumptionHistory.length > 0 ? totalConsumption / consumptionHistory.length : 0;

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
      const avgRatePerUnit = totalBill / totalConsumption;
      const predictedBill = predictedConsumption * avgRatePerUnit;

      userPrediction = {
        nextMonth: {
          consumption: Math.round(predictedConsumption * 100) / 100,
          estimatedBill: Math.round(predictedBill * 100) / 100
        },
        confidence: Math.min(90, Math.max(60, 70 + (recentData.length * 3))),
        basedOnMonths: recentData.length
      };
    }

    res.json({
      success: true,
      data: {
        user,
        consumption: {
          history: consumptionHistory,
          statistics: {
            totalRecords: consumptionHistory.length,
            totalConsumption: Math.round(totalConsumption * 100) / 100,
            totalBill: Math.round(totalBill * 100) / 100,
            averageConsumption: Math.round(averageConsumption * 100) / 100
          }
        },
        customAppliances,
        prediction: userPrediction
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details'
    });
  }
};