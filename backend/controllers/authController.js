import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateOTP, verifyOTPCode } from '../services/otpService.js';
import { sendEmail } from '../services/emailService.js';

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

// Register user
export const register = async (req, res) => {
  try {
    const {
      msebCustomerId,
      email,
      mobile,
      password,
      profile
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { msebCustomerId },
        { mobile }
      ]
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email) message = 'Email is already registered';
      else if (existingUser.msebCustomerId === msebCustomerId) message = 'MSEB Customer ID is already registered';
      else if (existingUser.mobile === mobile) message = 'Mobile number is already registered';
      
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Create new user
    const user = new User({
      msebCustomerId: msebCustomerId.toUpperCase(),
      email: email.toLowerCase(),
      mobile,
      password,
      profile
    });

    await user.save();

    // Generate OTP for email verification
    const emailOTP = generateOTP();
    const mobileOTP = generateOTP();

    // Store OTPs temporarily (in production, use Redis or database)
    // For now, we'll send them via email/SMS
    
    // Send verification email
    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - Smart Energy Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Welcome to Smart Energy Portal!</h2>
            <p>Hello ${profile.firstName},</p>
            <p>Thank you for registering with Smart Energy Portal. Please verify your email address using the OTP below:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #1f2937; font-size: 24px; letter-spacing: 2px;">${emailOTP}</h3>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't create this account, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px;">Smart Energy Portal - MSEB Customer Service</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // In production, also send SMS OTP for mobile verification

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email and mobile number.',
      data: {
        userId: user._id,
        email: user.email,
        mobile: user.mobile,
        requiresVerification: true
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or MSEB Customer ID
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { msebCustomerId: identifier.toUpperCase() }
      ]
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.addRefreshToken(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    // Remove sensitive data
    user.password = undefined;
    user.refreshTokens = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken,
        refreshToken,
        requiresVerification: !user.isVerified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const user = req.user;
    const oldRefreshToken = req.refreshToken;

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Replace old refresh token with new one
    user.removeRefreshToken(oldRefreshToken);
    user.addRefreshToken(newRefreshToken);
    await user.save();

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed. Please login again.'
    });
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      // Remove specific refresh token
      const fullUser = await User.findById(user._id);
      fullUser.removeRefreshToken(refreshToken);
      await fullUser.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { identifier, otp, type } = req.body;

    // In production, verify OTP from Redis/database
    // For now, we'll implement a basic verification
    const isValidOTP = verifyOTPCode(identifier, otp, type);

    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Find and update user
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobile: identifier }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update verification status
    if (type === 'email') {
      user.emailVerified = true;
    } else if (type === 'mobile') {
      user.mobileVerified = true;
    }

    // Check if both email and mobile are verified
    if (user.emailVerified && user.mobileVerified) {
      user.isVerified = true;
    }

    await user.save();

    res.json({
      success: true,
      message: `${type === 'email' ? 'Email' : 'Mobile'} verified successfully`,
      data: {
        isFullyVerified: user.isVerified,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { identifier, type } = req.body;

    // Find user
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobile: identifier }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const newOTP = generateOTP();

    if (type === 'email') {
      await sendEmail({
        to: user.email,
        subject: 'Email Verification OTP - Smart Energy Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Email Verification</h2>
            <p>Hello ${user.profile.firstName},</p>
            <p>Your new verification OTP is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
              <h3 style="color: #1f2937; font-size: 24px; letter-spacing: 2px;">${newOTP}</h3>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
          </div>
        `
      });
    }

    res.json({
      success: true,
      message: `New OTP sent to your ${type}`
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
};

// Forgot password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    // Generate reset token (in production, store in database with expiry)
    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Send reset email
    await sendEmail({
      to: email,
      subject: 'Password Reset - Smart Energy Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hello ${user.profile.firstName},</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Password reset link sent to your email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email'
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update password
    user.password = password;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    });
  }
};