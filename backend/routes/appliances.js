import express from 'express';
import { body } from 'express-validator';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getAllAppliances,
  getAppliancesByCategory,
  createAppliance,
  updateAppliance,
  deleteAppliance,
  getCategories
} from '../controllers/applianceController.js';

const router = express.Router();

// Validation rules
const applianceValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Appliance name must be between 2-100 characters'),
  
  body('category')
    .isIn(['Lighting', 'Cooling', 'Heating', 'Kitchen', 'Entertainment', 'Laundry', 'Office', 'Industrial', 'Other'])
    .withMessage('Invalid category'),
  
  body('defaultWattage')
    .isInt({ min: 1, max: 50000 })
    .withMessage('Wattage must be between 1-50000 watts'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

// Routes
router.get('/', optionalAuth, getAllAppliances);
router.get('/categories', getCategories);
router.get('/category/:category', optionalAuth, getAppliancesByCategory);
router.post('/', authenticate, applianceValidation, validate, createAppliance);
router.put('/:id', authenticate, applianceValidation, validate, updateAppliance);
router.delete('/:id', authenticate, deleteAppliance);

export default router;