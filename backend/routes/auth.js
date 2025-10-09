import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refreshToken,
  logout,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { authenticate, verifyRefreshToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('msebCustomerId')
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('MSEB Customer ID must be between 8-20 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('MSEB Customer ID must contain only uppercase letters and numbers'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('mobile')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('profile.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name must contain only letters and spaces'),
  
  body('profile.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name must contain only letters and spaces'),
  
  body('profile.address.village')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Village name must be between 2-100 characters'),
  
  body('profile.address.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City name must be between 2-100 characters'),
  
  body('profile.address.pincode')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Please provide a valid 6-digit pincode'),
  
  body('profile.address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State name must be between 2-50 characters')
];

const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or MSEB Customer ID is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const otpValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or mobile number is required'),
  
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  
  body('type')
    .isIn(['email', 'mobile'])
    .withMessage('Type must be either email or mobile')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh-token', refreshTokenValidation, validate, verifyRefreshToken, refreshToken);
router.post('/logout', authenticate, logout);
router.post('/verify-otp', otpValidation, validate, verifyOTP);
router.post('/resend-otp', 
  [
    body('identifier').trim().notEmpty().withMessage('Email or mobile number is required'),
    body('type').isIn(['email', 'mobile']).withMessage('Type must be either email or mobile')
  ], 
  validate, 
  resendOTP
);

// Password reset routes
router.post('/forgot-password', 
  [body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')], 
  validate, 
  forgotPassword
);

router.post('/reset-password', 
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  ], 
  validate, 
  resetPassword
);

export default router;