const express = require('express');
const StatsController = require('../controllers/statsController');
const { validateComparativeStats, validateRateLimit } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply rate limiting
router.use(validateRateLimit(100, 60000)); // 100 requests per minute

// Get basic village statistics
router.get(
  '/',
  asyncHandler(StatsController.getVillageStats)
);

// Get comprehensive dashboard statistics
router.get(
  '/dashboard',
  asyncHandler(StatsController.getDashboardStats)
);

// Get summary statistics for a state (includes all districts)
router.get(
  '/summary',
  asyncHandler(StatsController.getSummaryStats)
);

// Get comparative statistics between regions
router.post(
  '/comparative',
  validateComparativeStats,
  asyncHandler(StatsController.getComparativeStats)
);

module.exports = router;