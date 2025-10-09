import Appliance from '../models/Appliance.js';

// Get all appliances
export const getAllAppliances = async (req, res) => {
  try {
    const appliances = await Appliance.find({ isActive: true })
      .populate('createdBy', 'profile.firstName profile.lastName')
      .sort({ category: 1, name: 1 });

    res.json({
      success: true,
      data: appliances
    });
  } catch (error) {
    console.error('Get appliances error:', error);
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

    const appliances = await Appliance.find({ 
      category: category,
      isActive: true 
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: appliances
    });
  } catch (error) {
    console.error('Get appliances by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appliances by category'
    });
  }
};

// Create custom appliance
export const createAppliance = async (req, res) => {
  try {
    const { name, category, defaultWattage, description, minHours, maxHours, peakUsageTime } = req.body;
    const userId = req.user._id;

    const appliance = new Appliance({
      name,
      category,
      defaultWattage,
      description,
      isCustom: true,
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
      message: 'Custom appliance created successfully',
      data: appliance
    });
  } catch (error) {
    console.error('Create appliance error:', error);
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
      $or: [
        { isCustom: false }, // Default appliances can be updated by admins
        { createdBy: userId } // Custom appliances only by creator
      ]
    });

    if (!appliance) {
      return res.status(404).json({
        success: false,
        message: 'Appliance not found or access denied'
      });
    }

    // Only allow non-custom appliance updates by admins
    if (!appliance.isCustom && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update default appliances'
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
    console.error('Update appliance error:', error);
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
      isCustom: true,
      createdBy: userId
    });

    if (!appliance) {
      return res.status(404).json({
        success: false,
        message: 'Custom appliance not found or access denied'
      });
    }

    await appliance.deleteOne();

    res.json({
      success: true,
      message: 'Appliance deleted successfully'
    });
  } catch (error) {
    console.error('Delete appliance error:', error);
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
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Seed default appliances (run once)
export const seedDefaultAppliances = async () => {
  try {
    const count = await Appliance.countDocuments({ isCustom: false });
    
    if (count === 0) {
      const defaultAppliances = [
        { name: 'LED Bulb (9W)', category: 'Lighting', defaultWattage: 9, isCustom: false },
        { name: 'CFL Bulb (15W)', category: 'Lighting', defaultWattage: 15, isCustom: false },
        { name: 'Incandescent Bulb (60W)', category: 'Lighting', defaultWattage: 60, isCustom: false },
        { name: 'Tube Light (40W)', category: 'Lighting', defaultWattage: 40, isCustom: false },
        { name: 'Ceiling Fan', category: 'Cooling', defaultWattage: 75, isCustom: false },
        { name: 'Table Fan', category: 'Cooling', defaultWattage: 50, isCustom: false },
        { name: 'Air Conditioner (1.5 Ton)', category: 'Cooling', defaultWattage: 1500, isCustom: false },
        { name: 'Air Conditioner (1 Ton)', category: 'Cooling', defaultWattage: 1000, isCustom: false },
        { name: 'Air Cooler', category: 'Cooling', defaultWattage: 200, isCustom: false },
        { name: 'Refrigerator (Single Door)', category: 'Kitchen', defaultWattage: 150, isCustom: false },
        { name: 'Refrigerator (Double Door)', category: 'Kitchen', defaultWattage: 250, isCustom: false },
        { name: 'Microwave Oven', category: 'Kitchen', defaultWattage: 1000, isCustom: false },
        { name: 'Electric Kettle', category: 'Kitchen', defaultWattage: 1500, isCustom: false },
        { name: 'Mixer Grinder', category: 'Kitchen', defaultWattage: 500, isCustom: false },
        { name: 'Induction Cooktop', category: 'Kitchen', defaultWattage: 2000, isCustom: false },
        { name: 'Electric Iron', category: 'Laundry', defaultWattage: 1000, isCustom: false },
        { name: 'Washing Machine', category: 'Laundry', defaultWattage: 500, isCustom: false },
        { name: 'Television (LED 32")', category: 'Entertainment', defaultWattage: 60, isCustom: false },
        { name: 'Television (LED 55")', category: 'Entertainment', defaultWattage: 150, isCustom: false },
        { name: 'Desktop Computer', category: 'Office', defaultWattage: 300, isCustom: false },
        { name: 'Laptop', category: 'Office', defaultWattage: 65, isCustom: false },
        { name: 'Water Heater (Geyser)', category: 'Heating', defaultWattage: 2000, isCustom: false }
      ];

      await Appliance.insertMany(defaultAppliances);
      console.log('✅ Default appliances seeded successfully');
    }
  } catch (error) {
    console.error('❌ Error seeding default appliances:', error);
  }
};