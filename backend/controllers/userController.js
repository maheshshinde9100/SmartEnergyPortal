import User from '../models/User.js';
import Appliance from '../models/Appliance.js';
import Consumption from '../models/Consumption.js';

// Get user profile
export const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    // Get profile error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Validate required fields
    if (updates.profile) {
      if (!updates.profile.firstName || !updates.profile.firstName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'First name is required'
        });
      }
      if (!updates.profile.lastName || !updates.profile.lastName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Last name is required'
        });
      }
    }

    // Validate email format
    if (updates.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address'
        });
      }
    }

    // Validate mobile format
    if (updates.mobile) {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(updates.mobile)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 10-digit mobile number'
        });
      }
    }

    // Validate pincode format
    if (updates.profile?.address?.pincode) {
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(updates.profile.address.pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid 6-digit pincode'
        });
      }
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let emailChanged = false;
    let mobileChanged = false;

    // Update email if provided and different
    if (updates.email && updates.email.toLowerCase() !== user.email) {
      // Check if email already exists
      const existingUser = await User.findOne({ 
        email: updates.email.toLowerCase(),
        _id: { $ne: userId }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
      user.email = updates.email.toLowerCase();
      user.emailVerified = false; // Require re-verification
      emailChanged = true;
    }

    // Update mobile if provided and different
    if (updates.mobile && updates.mobile !== user.mobile) {
      // Check if mobile already exists
      const existingUser = await User.findOne({ 
        mobile: updates.mobile,
        _id: { $ne: userId }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is already registered'
        });
      }
      user.mobile = updates.mobile;
      user.mobileVerified = false; // Require re-verification
      mobileChanged = true;
    }

    // Update profile fields
    if (updates.profile) {
      if (updates.profile.firstName) {
        user.profile.firstName = updates.profile.firstName.trim();
      }
      if (updates.profile.lastName) {
        user.profile.lastName = updates.profile.lastName.trim();
      }
      
      if (updates.profile.address) {
        if (updates.profile.address.village !== undefined) {
          user.profile.address.village = updates.profile.address.village.trim();
        }
        if (updates.profile.address.city !== undefined) {
          user.profile.address.city = updates.profile.address.city.trim();
        }
        if (updates.profile.address.pincode !== undefined) {
          user.profile.address.pincode = updates.profile.address.pincode.trim();
        }
        if (updates.profile.address.state !== undefined) {
          user.profile.address.state = updates.profile.address.state.trim();
        }
      }
    }

    await user.save();

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;

    let message = 'Profile updated successfully';
    if (emailChanged || mobileChanged) {
      message += '. Please verify your ';
      if (emailChanged && mobileChanged) {
        message += 'email and mobile number';
      } else if (emailChanged) {
        message += 'email address';
      } else {
        message += 'mobile number';
      }
    }

    res.json({
      success: true,
      message,
      data: { 
        user: userResponse,
        requiresVerification: emailChanged || mobileChanged
      }
    });
  } catch (error) {
    // Update profile error
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: validationErrors[0] || 'Validation failed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    // Change password error
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Get user statistics
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get consumption records count and data
    const consumptionRecords = await Consumption.find({ userId }).select('totalUnits estimatedBill month year createdAt');
    const totalConsumptionRecords = consumptionRecords.length;
    
    // Calculate total and average consumption
    const totalConsumption = consumptionRecords.reduce((sum, record) => sum + (record.totalUnits || 0), 0);
    const averageMonthlyConsumption = totalConsumptionRecords > 0 
      ? totalConsumption / totalConsumptionRecords 
      : 0;
    
    // Calculate total bill amount
    const totalBillAmount = consumptionRecords.reduce((sum, record) => sum + (record.estimatedBill || 0), 0);
    const averageMonthlyBill = totalConsumptionRecords > 0 
      ? totalBillAmount / totalConsumptionRecords 
      : 0;
    
    // Get user's appliances count (all appliances are user-created now)
    const totalUserAppliances = await Appliance.countDocuments({ 
      createdBy: userId, 
      isActive: true 
    });
    
    // Calculate account age in days
    const accountAge = Math.floor((Date.now() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24));
    
    // Get latest consumption record
    const latestConsumption = consumptionRecords.length > 0 
      ? consumptionRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : null;

    // Calculate consumption trend (last 3 months vs previous 3 months)
    let consumptionTrend = 'stable';
    if (consumptionRecords.length >= 6) {
      const sortedRecords = consumptionRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const recent3Months = sortedRecords.slice(0, 3);
      const previous3Months = sortedRecords.slice(3, 6);
      
      const recentAvg = recent3Months.reduce((sum, r) => sum + r.totalUnits, 0) / 3;
      const previousAvg = previous3Months.reduce((sum, r) => sum + r.totalUnits, 0) / 3;
      
      const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
      
      if (changePercent > 10) consumptionTrend = 'increasing';
      else if (changePercent < -10) consumptionTrend = 'decreasing';
      else consumptionTrend = 'stable';
    }

    const stats = {
      // Consumption Statistics
      totalConsumptionRecords,
      totalConsumption: Math.round(totalConsumption * 100) / 100,
      averageMonthlyConsumption: Math.round(averageMonthlyConsumption * 100) / 100,
      
      // Billing Statistics
      totalBillAmount: Math.round(totalBillAmount * 100) / 100,
      averageMonthlyBill: Math.round(averageMonthlyBill * 100) / 100,
      
      // Appliance Statistics
      totalUserAppliances,
      
      // Account Information
      accountAge,
      lastLogin: req.user.lastLogin || req.user.createdAt,
      
      // Latest Activity
      latestConsumption: latestConsumption ? {
        month: latestConsumption.month,
        year: latestConsumption.year,
        units: latestConsumption.totalUnits,
        bill: latestConsumption.estimatedBill,
        date: latestConsumption.createdAt
      } : null,
      
      // Trends
      consumptionTrend,
      
      // Verification Status
      verificationStatus: {
        email: req.user.emailVerified || false,
        mobile: req.user.mobileVerified || false,
        profile: !!(req.user.profile?.firstName && req.user.profile?.lastName)
      },
      
      // Activity Summary
      hasConsumptionData: totalConsumptionRecords > 0,
      hasAppliances: totalUserAppliances > 0,
      isActiveUser: totalConsumptionRecords > 0 || totalUserAppliances > 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    // Get user stats error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    });
  }
};

// Update user preferences
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const preferences = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize preferences if not exists
    if (!user.preferences) {
      user.preferences = {};
    }

    // Update preferences
    Object.keys(preferences).forEach(key => {
      user.preferences[key] = preferences[key];
    });

    // Mark the preferences field as modified for Mongoose
    user.markModified('preferences');
    await user.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { preferences: user.preferences }
    });
  } catch (error) {
    // Update preferences error
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
};

// Get user preferences
export const getPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('preferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Default preferences if not set
    const defaultPreferences = {
      emailNotifications: true,
      smsNotifications: false,
      monthlyReports: true,
      energyAlerts: true,
      language: 'en',
      timezone: 'Asia/Kolkata'
    };

    const preferences = { ...defaultPreferences, ...user.preferences };

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    // Get preferences error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch preferences'
    });
  }
};

// Delete user account
export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    // Soft delete - deactivate account
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    // Delete account error
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};