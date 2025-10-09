import Appliance from '../models/Appliance.js';

// Get all appliances
export const getAllAppliances = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get only user's own appliances
    const appliances = await Appliance.find({ 
      isActive: true,
      createdBy: userId
    })
      .populate('createdBy', 'profile.firstName profile.lastName')
      .sort({ category: 1, name: 1 });

    res.json({
      success: true,
      data: appliances
    });
  } catch (error) {
    // Get appliances error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appliances'
    });
  }
};

// Get appliances by category
export const getAppliancesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user._id;

    const appliances = await Appliance.find({ 
      category: category,
      isActive: true,
      createdBy: userId
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: appliances
    });
  } catch (error) {
    // Get appliances by category error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appliances by category'
    });
  }
};

// Create appliance
export const createAppliance = async (req, res) => {
  try {
    const { name, category, defaultWattage, description, minHours, maxHours, peakUsageTime } = req.body;
    const userId = req.user._id;

    const appliance = new Appliance({
      name,
      category,
      defaultWattage,
      description,
      isCustom: true, // All appliances are user-created
      createdBy: userId,
      usageHints: {
        minHours: minHours ? parseFloat(minHours) : 0,
        maxHours: maxHours ? parseFloat(maxHours) : 24,
        peakUsageTime: peakUsageTime || '',
        typicalUsage: `Typically used ${minHours || 0}-${maxHours || 24} hours per day${peakUsageTime ? ` during ${peakUsageTime}` : ''}`
      }
    });

    await appliance.save();
    await appliance.populate('createdBy', 'profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Appliance created successfully',
      data: appliance
    });
  } catch (error) {
    // Create appliance error
    res.status(500).json({
      success: false,
      message: 'Failed to create appliance'
    });
  }
};

// Update appliance
export const updateAppliance = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, defaultWattage, description, minHours, maxHours, peakUsageTime } = req.body;
    const userId = req.user._id;

    const appliance = await Appliance.findOne({
      _id: id,
      createdBy: userId // Only allow users to update their own appliances
    });

    if (!appliance) {
      return res.status(404).json({
        success: false,
        message: 'Appliance not found or access denied'
      });
    }

    appliance.name = name || appliance.name;
    appliance.category = category || appliance.category;
    appliance.defaultWattage = defaultWattage || appliance.defaultWattage;
    appliance.description = description || appliance.description;
    
    // Update usage hints
    if (minHours !== undefined || maxHours !== undefined || peakUsageTime !== undefined) {
      appliance.usageHints = {
        minHours: minHours ? parseFloat(minHours) : appliance.usageHints?.minHours || 0,
        maxHours: maxHours ? parseFloat(maxHours) : appliance.usageHints?.maxHours || 24,
        peakUsageTime: peakUsageTime !== undefined ? peakUsageTime : appliance.usageHints?.peakUsageTime || '',
        typicalUsage: `Typically used ${minHours || appliance.usageHints?.minHours || 0}-${maxHours || appliance.usageHints?.maxHours || 24} hours per day${(peakUsageTime || appliance.usageHints?.peakUsageTime) ? ` during ${peakUsageTime || appliance.usageHints?.peakUsageTime}` : ''}`
      };
    }

    await appliance.save();
    await appliance.populate('createdBy', 'profile.firstName profile.lastName');

    res.json({
      success: true,
      message: 'Appliance updated successfully',
      data: appliance
    });
  } catch (error) {
    // Update appliance error
    res.status(500).json({
      success: false,
      message: 'Failed to update appliance'
    });
  }
};

// Delete appliance
export const deleteAppliance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const appliance = await Appliance.findOne({
      _id: id,
      createdBy: userId
    });

    if (!appliance) {
      return res.status(404).json({
        success: false,
        message: 'Appliance not found or access denied'
      });
    }

    await appliance.deleteOne();

    res.json({
      success: true,
      message: 'Appliance deleted successfully'
    });
  } catch (error) {
    // Delete appliance error
    res.status(500).json({
      success: false,
      message: 'Failed to delete appliance'
    });
  }
};

// Get appliance categories
export const getCategories = async (req, res) => {
  try {
    const categories = [
      'Lighting',
      'Cooling', 
      'Heating',
      'Kitchen',
      'Entertainment',
      'Laundry',
      'Office',
      'Industrial',
      'Other'
    ];

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    // Get categories error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

