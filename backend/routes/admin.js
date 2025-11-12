import express from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import {
  getAdminOverview,
  getAllUsers,
  getConsumptionAnalytics,
  getSystemPredictions,
  getPeakUsageAnalysis,
  updateTariffRates,
  getCurrentTariff,
  toggleUserStatus,
  getUserDetails,
  deleteUser
} from '../controllers/adminController.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticate, requireAdmin);

// Validation rules
const tariffValidation = [
  body('slabs')
    .isArray({ min: 1 })
    .withMessage('At least one tariff slab is required'),
  
  body('slabs.*.minUnits')
    .isFloat({ min: 0 })
    .withMessage('Minimum units must be non-negative'),
  
  body('slabs.*.maxUnits')
    .isFloat({ min: 0 })
    .withMessage('Maximum units must be non-negative'),
  
  body('slabs.*.ratePerUnit')
    .isFloat({ min: 0 })
    .withMessage('Rate per unit must be non-negative'),
  
  body('effectiveFrom')
    .isISO8601()
    .withMessage('Valid effective date is required'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

// Routes
router.get('/overview', getAdminOverview);
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId/toggle-status', toggleUserStatus);
router.delete('/users/:userId', deleteUser);
router.get('/analytics', getConsumptionAnalytics);
router.get('/predictions', getSystemPredictions);
router.get('/peak-usage', getPeakUsageAnalysis);
router.get('/tariff', getCurrentTariff);
router.post('/tariff', tariffValidation, validate, updateTariffRates);

export default router;