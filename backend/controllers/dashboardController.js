import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import Consumption from '../models/Consumption.js';
import TariffRate from '../models/TariffRate.js';

const calculateBillFromSlabs = (units, slabs = []) => {
    let bill = 0;
    let remainingUnits = units;
    const sortedSlabs = [...slabs].sort((a, b) => a.minUnits - b.minUnits);

    for (const slab of sortedSlabs) {
        if (remainingUnits <= 0) break;
        const slabRange = slab.maxUnits - slab.minUnits + 1;
        const slabUnits = Math.min(remainingUnits, slabRange);
        bill += slabUnits * slab.ratePerUnit;
        remainingUnits -= slabUnits;
    }

    return bill;
};

// Get user dashboard data
export const getDashboardData = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        
        console.log(`📊 Dashboard request from user: ${userId}, role: ${userRole}`);

        if (userRole === 'admin') {
            console.log('🔧 Fetching admin dashboard data...');
            // Admin dashboard data
            const dashboardData = await getAdminDashboardData();
            console.log('✅ Admin dashboard data fetched successfully');
            return res.json({
                success: true,
                data: dashboardData
            });
        } else {
            console.log('👤 Fetching user dashboard data...');
            // Regular user dashboard data
            const dashboardData = await getUserDashboardData(userId);
            console.log('✅ User dashboard data fetched successfully');
            return res.json({
                success: true,
                data: dashboardData
            });
        }
    } catch (error) {
        console.error('❌ Dashboard data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data'
        });
    }
};

// Get regular user dashboard data
const getUserDashboardData = async (userId) => {
    const currentTariff = await TariffRate.getCurrentTariff();
    // Get user's consumption records
    const consumptionRecords = await Consumption.find({ userId })
        .sort({ year: -1, month: -1 })
        .limit(12);

    // Get user's appliances
    const userAppliances = await Appliance.find({
        createdBy: userId,
        isActive: true
    });

    // Calculate consumption statistics
    let totalConsumption = consumptionRecords.reduce((sum, record) => sum + (record.totalUnits || 0), 0);
    let totalBill = consumptionRecords.reduce((sum, record) => sum + (record.estimatedBill || 0), 0);

    // Get current month consumption
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const currentMonthRecord = consumptionRecords.find(
        record => record.month === currentMonth && record.year === currentYear
    );

    // Get last month for comparison
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const lastMonthRecord = consumptionRecords.find(
        record => record.month === lastMonth && record.year === lastMonthYear
    );

    // Calculate monthly change
    let monthlyChange = 0;
    if (currentMonthRecord && lastMonthRecord) {
        monthlyChange = ((currentMonthRecord.totalUnits - lastMonthRecord.totalUnits) / lastMonthRecord.totalUnits) * 100;
    }

    // Get recent activity (last 6 months)
    const recentActivity = consumptionRecords.slice(0, 6).map(record => ({
        month: record.month,
        year: record.year,
        consumption: record.totalUnits,
        bill: record.estimatedBill,
        date: record.createdAt
    }));

    // Calculate average monthly consumption
    let averageConsumption = consumptionRecords.length > 0
        ? totalConsumption / consumptionRecords.length
        : 0;

    // Get appliances by category
    const appliancesByCategory = userAppliances.reduce((acc, appliance) => {
        const category = appliance.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push({
            name: appliance.name,
            wattage: appliance.defaultWattage,
            id: appliance._id
        });
        return acc;
    }, {});

    // Calculate estimated monthly consumption and cost based on appliances
    let estimatedMonthlyConsumption = 0;
    let estimatedMonthlyCost = 0;
    
    if (userAppliances.length > 0) {
        userAppliances.forEach(appliance => {
            // Use user's estimated daily hours if available, otherwise calculate average
            const avgHours = appliance.usageHints?.estimatedDailyHours 
                || (appliance.usageHints?.minHours 
                    ? (appliance.usageHints.minHours + (appliance.usageHints.maxHours || appliance.usageHints.minHours)) / 2
                    : 4);
            const dailyUsage = (avgHours * appliance.defaultWattage) / 1000; // kWh per day
            const monthlyUsage = dailyUsage * 30;
            estimatedMonthlyConsumption += monthlyUsage;
        });
        
        // If history is empty, use projections for statistics to avoid showing 0
        if (consumptionRecords.length === 0 && estimatedMonthlyConsumption > 0) {
            const currentTariff = await TariffRate.getCurrentTariff();
            let projectedBill = 0;
            if (currentTariff) {
                projectedBill = currentTariff.calculateBill(estimatedMonthlyConsumption);
            } else {
                projectedBill = estimatedMonthlyConsumption * 5.5;
            }

            // Populate these so the UI reflects the current configuration
            averageConsumption = estimatedMonthlyConsumption;
            totalConsumption = estimatedMonthlyConsumption;
            totalBill = projectedBill;
        }
        
        // Calculate estimated bill using tariff slabs
        if (estimatedMonthlyConsumption > 0) {
            estimatedMonthlyCost = currentTariff
                ? currentTariff.calculateBill(estimatedMonthlyConsumption)
                : calculateBillFromSlabs(estimatedMonthlyConsumption, [
                    { minUnits: 0, maxUnits: 100, ratePerUnit: 3.5 },
                    { minUnits: 101, maxUnits: 300, ratePerUnit: 4.5 },
                    { minUnits: 301, maxUnits: 500, ratePerUnit: 6.0 },
                    { minUnits: 501, maxUnits: 999999, ratePerUnit: 7.5 }
                ]);
        }
    }

    return {
        user: {
            totalConsumptionRecords: consumptionRecords.length,
            totalAppliances: userAppliances.length,
            totalConsumption: Math.round(totalConsumption * 100) / 100,
            totalBill: Math.round(totalBill * 100) / 100,
            averageConsumption: Math.round(averageConsumption * 100) / 100,
            estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100,
            estimatedMonthlyConsumption: Math.round(estimatedMonthlyConsumption * 100) / 100
        },
        currentMonth: {
            consumption: currentMonthRecord?.totalUnits || 0,
            bill: currentMonthRecord?.estimatedBill || 0,
            change: Math.round(monthlyChange * 100) / 100,
            trend: monthlyChange > 5 ? 'increasing' : monthlyChange < -5 ? 'decreasing' : 'stable',
            // If no consumption record exists, show estimated values
            isEstimated: !currentMonthRecord,
            estimatedConsumption: Math.round(estimatedMonthlyConsumption * 100) / 100,
            estimatedBill: Math.round(estimatedMonthlyCost * 100) / 100
        },
        recentActivity,
        appliances: {
            total: userAppliances.length,
            byCategory: appliancesByCategory,
            topConsumers: userAppliances
                .sort((a, b) => b.defaultWattage - a.defaultWattage)
                .slice(0, 5)
                .map(appliance => ({
                    name: appliance.name,
                    wattage: appliance.defaultWattage,
                    category: appliance.category
                }))
        },
        insights: {
            hasData: consumptionRecords.length > 0,
            hasAppliances: userAppliances.length > 0,
            needsAttention: monthlyChange > 20,
            showEstimated: userAppliances.length > 0 && consumptionRecords.length === 0,
            recommendation: getRecommendation(consumptionRecords, userAppliances, monthlyChange)
        }
    };
};

// Get admin dashboard data
const getAdminDashboardData = async () => {
    // Get system-wide statistics
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    const totalAppliances = await Appliance.countDocuments({ isActive: true });
    const totalConsumptionRecords = await Consumption.countDocuments();

    // Use latest available period instead of strict calendar current month.
    const monthlySummary = await Consumption.aggregate([
        {
            $group: {
                _id: { month: '$month', year: '$year' },
                totalUnits: { $sum: '$totalUnits' },
                totalBill: { $sum: '$estimatedBill' },
                userCountSet: { $addToSet: '$userId' }
            }
        },
        {
            $project: {
                month: '$_id.month',
                year: '$_id.year',
                totalUnits: 1,
                totalBill: 1,
                activeUsers: { $size: '$userCountSet' }
            }
        },
        { $sort: { year: -1, month: -1 } },
        { $limit: 2 }
    ]);

    const latestPeriod = monthlySummary[0] || null;
    const previousPeriod = monthlySummary[1] || null;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    const historicalUnits = latestPeriod?.totalUnits || 0;
    const currentRecordsUnits = latestPeriod?.totalUnits || 0;
    
    // Prefer projection if it's higher than the latest historical period (handles new appliances)
    const systemConsumption = Math.max(currentRecordsUnits, projectedUnits, historicalUnits);
    let systemRevenue = latestPeriod?.totalBill || 0;

    console.log('📊 Admin Dashboard Logic:', {
        projectedUnits,
        historicalUnits,
        currentRecordsUnits,
        selectedConsumption: systemConsumption,
        initialRevenue: systemRevenue
    });

    // Estimate revenue if we are using projected units or if revenue is missing
    if (systemConsumption > historicalUnits || (systemConsumption > 0 && systemRevenue === 0)) {
        const currentTariff = await TariffRate.getCurrentTariff();
        if (currentTariff) {
            systemRevenue = currentTariff.calculateBill(systemConsumption);
        } else {
            systemRevenue = systemConsumption * 5.5;
        }
    }

    const activeUsersThisMonth = Math.max(latestPeriod?.activeUsers || 0, activeUsers);
    const previousConsumption = previousPeriod?.totalUnits || 0;
    const monthlyGrowth = previousConsumption > 0
        ? ((systemConsumption - previousConsumption) / previousConsumption) * 100
        : 100;

    // Get recent user registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await User.countDocuments({
        role: 'user',
        createdAt: { $gte: thirtyDaysAgo }
    });

    // Get top consuming users for latest available period
    const latestPeriodMatch = latestPeriod
        ? { month: latestPeriod.month, year: latestPeriod.year }
        : null;

    const topUsers = await Consumption.aggregate([
        ...(latestPeriodMatch ? [{ $match: latestPeriodMatch }] : []),
        {
            $group: {
                _id: '$userId',
                totalConsumption: { $sum: '$totalUnits' },
                totalBill: { $sum: '$estimatedBill' }
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
                city: '$user.profile.address.city',
                consumption: '$totalConsumption',
                bill: '$totalBill'
            }
        },
        { $sort: { consumption: -1 } },
        { $limit: 5 }
    ]);

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Consumption.aggregate([
        {
            $match: {
                $or: [
                    { year: { $gt: sixMonthsAgo.getFullYear() } },
                    {
                        year: sixMonthsAgo.getFullYear(),
                        month: { $gte: sixMonthsAgo.getMonth() + 1 }
                    }
                ]
            }
        },
        {
            $group: {
                _id: { month: '$month', year: '$year' },
                totalConsumption: { $sum: '$totalUnits' },
                totalRevenue: { $sum: '$estimatedBill' },
                userCount: { $addToSet: '$userId' }
            }
        },
        {
            $project: {
                month: '$_id.month',
                year: '$_id.year',
                consumption: '$totalConsumption',
                revenue: '$totalRevenue',
                users: { $size: '$userCount' }
            }
        },
        { $sort: { year: 1, month: 1 } }
    ]);

    return {
        system: {
            totalUsers,
            activeUsers,
            totalAppliances,
            totalConsumptionRecords,
            recentUsers,
            userGrowthRate: totalUsers > 0 ? (recentUsers / totalUsers * 100) : 0
        },
        currentMonth: {
            consumption: Math.round(systemConsumption * 100) / 100,
            revenue: Math.round(systemRevenue * 100) / 100,
            activeUsers: activeUsersThisMonth,
            growth: Math.round(monthlyGrowth * 100) / 100,
            trend: monthlyGrowth > 5 ? 'increasing' : monthlyGrowth < -5 ? 'decreasing' : 'stable',
            periodLabel: latestPeriod ? `${monthNames[(latestPeriod.month || 1) - 1]} ${latestPeriod.year}` : 'No data',
            comparisonLabel: previousPeriod ? `${monthNames[(previousPeriod.month || 1) - 1]} ${previousPeriod.year}` : null
        },
        topUsers,
        monthlyTrends,
        insights: {
            totalSystemLoad: Math.round(systemConsumption * 100) / 100,
            averageUserConsumption: activeUsersThisMonth > 0 ? Math.round((systemConsumption / activeUsersThisMonth) * 100) / 100 : 0,
            systemHealth: getSystemHealth(monthlyGrowth, activeUsers, totalUsers),
            alerts: getSystemAlerts(monthlyGrowth, activeUsersThisMonth, totalUsers)
        }
    };
};

// Helper function to get user recommendations
const getRecommendation = (consumptionRecords, appliances, monthlyChange) => {
    if (appliances.length === 0) {
        return "Add your appliances to start tracking energy consumption and get personalized insights.";
    }

    if (consumptionRecords.length === 0) {
        return "You have appliances added! Submit your monthly consumption data to see actual usage and get accurate predictions.";
    }

    if (monthlyChange > 20) {
        return "Your consumption increased significantly. Consider checking high-power appliances usage.";
    }

    if (monthlyChange < -10) {
        return "Great job! Your energy consumption is decreasing. Keep up the good work.";
    }

    return "Your energy usage is stable. Keep submitting monthly data for better predictions.";
};

// Helper function to get system health status
const getSystemHealth = (growth, activeUsers, totalUsers) => {
    if (!totalUsers) return 'needs_attention';
    const userEngagement = (activeUsers / totalUsers) * 100;

    if (userEngagement > 80 && Math.abs(growth) < 20) {
        return 'excellent';
    } else if (userEngagement > 60 && Math.abs(growth) < 30) {
        return 'good';
    } else if (userEngagement > 40) {
        return 'fair';
    } else {
        return 'needs_attention';
    }
};

// Helper function to get system alerts
const getSystemAlerts = (growth, activeUsers, totalUsers) => {
    const alerts = [];

    if (growth > 50) {
        alerts.push({
            type: 'warning',
            message: 'System consumption increased by more than 50% this month'
        });
    }

    if (totalUsers > 0 && (activeUsers / totalUsers) < 0.3) {
        alerts.push({
            type: 'info',
            message: 'Low user engagement - consider user activation campaigns'
        });
    }

    if (growth < -30) {
        alerts.push({
            type: 'success',
            message: 'Significant reduction in system-wide consumption'
        });
    }

    return alerts;
};

