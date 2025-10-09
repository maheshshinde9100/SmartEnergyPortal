import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  submitConsumption,
  getConsumptionHistory,
  getCurrentConsumption,
  updateConsumption,
  deleteConsumption,
  getConsumptionPredictions
} from '../controllers/consumptionController.js';

const router = express.Router();

// Validation rules
const consumptionValidation = [
  body('month')
    .isInt({ min: 1, max: 12 })
    .withMessage('Month must be between 1-12'),
  
  body('year')
    .isInt({ min: 2020, max: new Date().getFullYear() })
    .withMessage('Year must be valid'),
  
  body('appliances')
    .isArray({ min: 1 })
    .withMessage('At least one appliance is required'),
  
  body('appliances.*.applianceId')
    .isMongoId()
    .withMessage('Valid appliance ID is required'),
  
  body('appliances.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('appliances.*.dailyHours')
    .isFloat({ min: 0, max: 24 })
    .withMessage('Daily hours must be between 0-24'),
  
  body('appliances.*.customWattage')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Custom wattage must be positive')
];

// Routes
router.post('/', authenticate, consumptionValidation, validate, submitConsumption);
router.get('/history', authenticate, getConsumptionHistory);
router.get('/current', authenticate, getCurrentConsumption);
router.get('/predictions', authenticate, getConsumptionPredictions);
router.put('/:id', authenticate, consumptionValidation, validate, updateConsumption);
router.delete('/:id', authenticate, deleteConsumption);

export default router;