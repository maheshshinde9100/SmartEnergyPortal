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

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile fields
    if (updates.profile) {
      if (updates.profile.firstName) user.profile.firstName = updates.profile.firstName;
      if (updates.profile.lastName) user.profile.lastName = updates.profile.lastName;
      
      if (updates.profile.address) {
        if (updates.profile.address.village) user.profile.address.village = updates.profile.address.village;
        if (updates.profile.address.city) user.profile.address.city = updates.profile.address.city;
        if (updates.profile.address.pincode) user.profile.address.pincode = updates.profile.address.pincode;
        if (updates.profile.address.state) user.profile.address.state = updates.profile.address.state;
      }
    }

    // Update email and mobile if provided
    if (updates.email && updates.email !== user.email) {
      // Check if email already exists
      const existingUser = await User.findOne({ email: updates.email.toLowerCase() });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
      user.email = updates.email.toLowerCase();
      user.emailVerified = false; // Require re-verification
    }

    if (updates.mobile && updates.mobile !== user.mobile) {
      // Check if mobile already exists
      const existingUser = await User.findOne({ mobile: updates.mobile });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number is already registered'
        });
      }
      user.mobile = updates.mobile;
      user.mobileVerified = false; // Require re-verification
    }

    await user.save();

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
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