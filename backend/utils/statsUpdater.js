import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import Consumption from '../models/Consumption.js';
import TariffRate from '../models/TariffRate.js';

/**
 * Recalculates and updates a user's stored energy statistics
 * @param {string} userId - The ID of the user to update
 */
export const updateUserStatistics = async (userId) => {
  try {
    // 1. Get consumption history
    const consumptionHistory = await Consumption.find({ userId })
      .sort({ year: -1, month: -1 });

    // 2. Get active custom appliances
    const appliances = await Appliance.find({
      createdBy: userId,
      isActive: true,
      isCustom: true
    });

    // 3. Calculate historical stats
    let totalRecords = consumptionHistory.length;
    let totalConsumption = consumptionHistory.reduce((sum, record) => sum + (record.totalUnits || 0), 0);
    let totalBill = consumptionHistory.reduce((sum, record) => sum + (record.estimatedBill || 0), 0);
    let averageMonthlyConsumption = totalRecords > 0 ? totalConsumption / totalRecords : 0;

    // 4. Calculate appliance-based projections (fallback if history is empty)
    let projectedMonthlyUnits = 0;
    appliances.forEach(app => {
      const dailyHours = app.usageHints?.estimatedDailyHours || 4;
      const monthlyUnits = (app.defaultWattage * dailyHours * 30) / 1000;
      projectedMonthlyUnits += monthlyUnits;
    });

    // 5. If history is zero/empty, use projections to avoid showing 0 in dashboard
    if (projectedMonthlyUnits > 0 && (totalRecords === 0 || totalConsumption === 0)) {
      const currentTariff = await TariffRate.getCurrentTariff();
      let projectedBill = 0;
      if (currentTariff) {
        projectedBill = currentTariff.calculateBill(projectedMonthlyUnits);
      } else {
        projectedBill = projectedMonthlyUnits * 5.5; // Fallback rate
      }

      // Populate statistics with projections
      totalConsumption = projectedMonthlyUnits;
      totalBill = projectedBill;
      averageMonthlyConsumption = projectedMonthlyUnits;
    }

    // 6. Update user document
    await User.findByIdAndUpdate(userId, {
      $set: {
        'statistics.totalConsumption': Math.round(totalConsumption * 100) / 100,
        'statistics.totalBill': Math.round(totalBill * 100) / 100,
        'statistics.averageMonthlyConsumption': Math.round(averageMonthlyConsumption * 100) / 100,
        'statistics.totalRecords': totalRecords,
        'statistics.lastUpdated': new Date()
      }
    });

    console.log(`✅ Statistics updated for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to update statistics for user ${userId}:`, error);
    return false;
  }
};
