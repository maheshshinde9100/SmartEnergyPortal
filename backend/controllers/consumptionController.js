import Consumption from '../models/Consumption.js';
import Appliance from '../models/Appliance.js';
import TariffRate from '../models/TariffRate.js';

// Submit consumption data
export const submitConsumption = async (req, res) => {
  try {
    const { month, year, appliances } = req.body;
    const userId = req.user._id;

    // Validate month and year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit consumption data for future months'
      });
    }

    // Check if consumption already exists for this month/year
    const existingConsumption = await Consumption.findOne({ userId, month, year });
    if (existingConsumption) {
      return res.status(400).json({
        success: false,
        message: 'Consumption data already exists for this month. Use update instead.'
      });
    }

    // Validate and populate appliance data
    const applianceIds = appliances.map(app => app.applianceId);
    const applianceData = await Appliance.find({ _id: { $in: applianceIds } });

    if (applianceData.length !== applianceIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more appliances not found'
      });
    }

    // Calculate total consumption
    let totalUnits = 0;
    const processedAppliances = appliances.map(appUsage => {
      const appliance = applianceData.find(app => app._id.toString() === appUsage.applianceId);
      const wattage = appUsage.customWattage || appliance.defaultWattage;
      const dailyConsumption = (wattage * appUsage.dailyHours) / 1000; // kWh
      const monthlyConsumption = dailyConsumption * 30; // Assume 30 days
      const totalApplianceConsumption = monthlyConsumption * appUsage.quantity;
      
      totalUnits += totalApplianceConsumption;
      
      return {
        applianceId: appUsage.applianceId,
        quantity: appUsage.quantity,
        dailyHours: appUsage.dailyHours,
        customWattage: appUsage.customWattage
      };
    });

    // Calculate estimated bill using current tariff
    const currentTariff = await TariffRate.getCurrentTariff();
    let estimatedBill = 0;
    
    if (currentTariff) {
      estimatedBill = currentTariff.calculateBill(totalUnits);
    } else {
      // Default tariff calculation if no tariff is set
      estimatedBill = calculateDefaultBill(totalUnits);
    }

    // Create consumption record
    const consumption = new Consumption({
      userId,
      month,
      year,
      appliances: processedAppliances,
      totalUnits: Math.round(totalUnits * 100) / 100,
      estimatedBill: Math.round(estimatedBill * 100) / 100
    });

    await consumption.save();
    await consumption.populate('appliances.applianceId', 'name category defaultWattage');

    res.status(201).json({
      success: true,
      message: 'Consumption data submitted successfully',
      data: consumption
    });
  } catch (error) {
    // Submit consumption error
    res.status(500).json({
      success: false,
      message: 'Failed to submit consumption data'
    });
  }
};

// Get consumption history
export const getConsumptionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 12, page = 1 } = req.query;

    const skip = (page - 1) * limit;
    
    const consumptionHistory = await Consumption.find({ userId })
      .populate('appliances.applianceId', 'name category defaultWattage')
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Consumption.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        records: consumptionHistory,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords,
          hasNext: skip + consumptionHistory.length < totalRecords,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    // Get consumption history error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consumption history'
    });
  }
};

// Get current month consumption
export const getCurrentConsumption = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const currentConsumption = await Consumption.findOne({
      userId,
      month: currentMonth,
      year: currentYear
    }).populate('appliances.applianceId', 'name category defaultWattage');

    res.json({
      success: true,
      data: currentConsumption
    });
  } catch (error) {
    // Get current consumption error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current consumption'
    });
  }
};

// Update consumption data
export const updateConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const { appliances } = req.body;
    const userId = req.user._id;

    const consumption = await Consumption.findOne({ _id: id, userId });
    
    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: 'Consumption record not found'
      });
    }

    // Validate and populate appliance data
    const applianceIds = appliances.map(app => app.applianceId);
    const applianceData = await Appliance.find({ _id: { $in: applianceIds } });

    if (applianceData.length !== applianceIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more appliances not found'
      });
    }

    // Recalculate total consumption
    let totalUnits = 0;
    const processedAppliances = appliances.map(appUsage => {
      const appliance = applianceData.find(app => app._id.toString() === appUsage.applianceId);
      const wattage = appUsage.customWattage || appliance.defaultWattage;
      const dailyConsumption = (wattage * appUsage.dailyHours) / 1000;
      const monthlyConsumption = dailyConsumption * 30;
      const totalApplianceConsumption = monthlyConsumption * appUsage.quantity;
      
      totalUnits += totalApplianceConsumption;
      
      return {
        applianceId: appUsage.applianceId,
        quantity: appUsage.quantity,
        dailyHours: appUsage.dailyHours,
        customWattage: appUsage.customWattage
      };
    });

    // Recalculate estimated bill
    const currentTariff = await TariffRate.getCurrentTariff();
    let estimatedBill = 0;
    
    if (currentTariff) {
      estimatedBill = currentTariff.calculateBill(totalUnits);
    } else {
      estimatedBill = calculateDefaultBill(totalUnits);
    }

    // Update consumption record
    consumption.appliances = processedAppliances;
    consumption.totalUnits = Math.round(totalUnits * 100) / 100;
    consumption.estimatedBill = Math.round(estimatedBill * 100) / 100;

    await consumption.save();
    await consumption.populate('appliances.applianceId', 'name category defaultWattage');

    res.json({
      success: true,
      message: 'Consumption data updated successfully',
      data: consumption
    });
  } catch (error) {
    // Update consumption error
    res.status(500).json({
      success: false,
      message: 'Failed to update consumption data'
    });
  }
};

// Delete consumption record
export const deleteConsumption = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const consumption = await Consumption.findOne({ _id: id, userId });
    
    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: 'Consumption record not found'
      });
    }

    await consumption.deleteOne();

    res.json({
      success: true,
      message: 'Consumption record deleted successfully'
    });
  } catch (error) {
    // Delete consumption error
    res.status(500).json({
      success: false,
      message: 'Failed to delete consumption record'
    });
  }
};

// Get consumption predictions
export const getConsumptionPredictions = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get historical data for predictions (last 6 months)
    const historicalData = await Consumption.find({ userId })
      .sort({ year: -1, month: -1 })
      .limit(6);

    if (historicalData.length < 2) {
      return res.json({
        success: true,
        data: {
          nextMonth: 0,
          confidence: 0,
          trend: 'insufficient_data',
          message: 'Need at least 2 months of data for predictions'
        }
      });
    }

    // Simple moving average prediction with seasonal adjustment
    const weights = [0.4, 0.3, 0.2, 0.1];
    const recentData = historicalData.slice(0, 4);
    
    const weightedSum = recentData.reduce((sum, data, index) => {
      const weight = weights[index] || 0.1;
      return sum + (data.totalUnits * weight);
    }, 0);

    // Apply seasonal factor based on current month
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

    // Calculate predicted bill
    const currentTariff = await TariffRate.getCurrentTariff();
    let predictedBill = 0;
    
    if (currentTariff) {
      predictedBill = currentTariff.calculateBill(prediction);
    } else {
      predictedBill = calculateDefaultBill(prediction);
    }

    res.json({
      success: true,
      data: {
        nextMonth: prediction,
        predictedBill: Math.round(predictedBill * 100) / 100,
        confidence,
        trend,
        factors: {
          seasonal: seasonalFactor,
          historical: Math.round(weightedSum)
        }
      }
    });
  } catch (error) {
    // Get predictions error
    res.status(500).json({
      success: false,
      message: 'Failed to generate predictions'
    });
  }
};

// Helper function for default bill calculation
const calculateDefaultBill = (units) => {
  // Default MSEB tariff structure (simplified)
  const slabs = [
    { min: 0, max: 100, rate: 3.5 },
    { min: 101, max: 300, rate: 4.5 },
    { min: 301, max: 500, rate: 6.0 },
    { min: 501, max: Infinity, rate: 7.5 }
  ];

  let bill = 0;
  let remainingUnits = units;

  for (const slab of slabs) {
    if (remainingUnits <= 0) break;
    
    const slabUnits = Math.min(remainingUnits, slab.max - slab.min + 1);
    bill += slabUnits * slab.rate;
    remainingUnits -= slabUnits;
  }

  return bill;
};