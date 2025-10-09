import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardData } from '../controllers/dashboardController.js';

const router = express.Router();

// Get dashboard data (role-based)
router.get('/', authenticate, getDashboardData);

export default router;