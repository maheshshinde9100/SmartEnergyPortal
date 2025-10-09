import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getProfile,
  updateProfile,
  changePassword,
  getUserStats,
  updatePreferences,
  getPreferences,
  deleteAccount
} from '../controllers/userController.js';

const router = express.Router();

// Validation rules
const profileValidation = [
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2-50 characters'),
  
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2-50 characters'),
  
  body('profile.address.village')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Village name must be between 2-100 characters'),
  
  body('profile.address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City name must be between 2-100 characters'),
  
  body('profile.address.pincode')
    .optional()
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Please enter a valid 6-digit pincode'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('mobile')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please provide a valid 10-digit mobile number')
];

const passwordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const deleteAccountValidation = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
];

// Routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, profileValidation, validate, updateProfile);
router.post('/change-password', authenticate, passwordValidation, validate, changePassword);
router.get('/stats', authenticate, getUserStats);
router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, updatePreferences);
router.delete('/account', authenticate, deleteAccountValidation, validate, deleteAccount);

export default router;