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
    console.error('Get profile error:', error);
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
    console.error('Update profile error:', error);
    
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
    console.error('Change password error:', error);
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

    // Get consumption records count
    const totalConsumptionRecords = await Consumption.countDocuments({ userId });
    
    // Get average monthly consumption
    const consumptionData = await Consumption.find({ userId }).select('totalUnits');
    const averageMonthlyConsumption = consumptionData.length > 0 
      ? consumptionData.reduce((sum, record) => sum + record.totalUnits, 0) / consumptionData.length 
      : 0;
    
    // Get custom appliances count
    const totalCustomAppliances = await Appliance.countDocuments({ createdBy: userId, isCustom: true });
    
    // Calculate account age
    const accountAge = Math.floor((Date.now() - new Date(req.user.createdAt)) / (1000 * 60 * 60 * 24));

    const stats = {
      totalConsumptionRecords,
      averageMonthlyConsumption: Math.round(averageMonthlyConsumption * 10) / 10,
      totalCustomAppliances,
      accountAge,
      lastLogin: req.user.lastLogin || new Date(),
      verificationStatus: {
        email: req.user.emailVerified || false,
        mobile: req.user.mobileVerified || false,
        profile: true
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
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
    console.error('Update preferences error:', error);
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
    console.error('Get preferences error:', error);
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
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account'
    });
  }
};