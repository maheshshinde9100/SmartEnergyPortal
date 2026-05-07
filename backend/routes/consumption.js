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
  getConsumptionPredictions,
  getCurrentTariffForUser
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

  body('appliances.*.usageSlots')
    .optional()
    .isArray()
    .withMessage('Usage slots must be an array'),

  body('appliances.*.usageSlots.*')
    .optional()
    .isInt({ min: 0, max: 23 })
    .withMessage('Usage slot must be between 0 and 23'),

  body('appliances.*.timeRanges')
    .optional()
    .isArray()
    .withMessage('Time ranges must be an array')
    .bail()
    .custom((ranges) => {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      return ranges.every((range) => {
        const hasStart = typeof range?.start === 'string' && range.start.trim().length > 0;
        const hasEnd = typeof range?.end === 'string' && range.end.trim().length > 0;
        if (!hasStart && !hasEnd) return true;
        return hasStart && hasEnd && timeRegex.test(range.start) && timeRegex.test(range.end);
      });
    })
    .withMessage('Each time range must include valid start and end values in HH:mm format'),
  
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
router.get('/tariff', authenticate, getCurrentTariffForUser);
router.put('/:id', authenticate, consumptionValidation, validate, updateConsumption);
router.delete('/:id', authenticate, deleteConsumption);

export default router;