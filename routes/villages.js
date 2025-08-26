const express = require('express');
const VillageController = require('../controllers/villageController');
const {
  validateBoundsParams,
  validatePagination,
  validateZoom,
  validatePopulationRange,
  validateSearchQuery,
  validateObjectId,
  validateLocationParams,
  validateRateLimit
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply general rate limiting
router.use(validateRateLimit(200, 60000)); // 200 requests per minute

// Get all states
router.get(
  '/states',
  asyncHandler(VillageController.getStates)
);

// Get districts by state
router.get(
  '/districts/:state',
  validateLocationParams,
  asyncHandler(VillageController.getDistricts)
);

// Get subdistricts by state and district
router.get(
  '/subdistricts/:state/:district',
  validateLocationParams,
  asyncHandler(VillageController.getSubdistricts)
);

// Get villages with filtering
router.get(
  '/',
  validatePagination,
  validateZoom,
  validatePopulationRange,
  asyncHandler(VillageController.getVillages)
);

// Get villages within geographic bounds
router.get(
  '/bounds',
  validateBoundsParams,
  validateZoom,
  asyncHandler(VillageController.getVillagesInBounds)
);

// Search villages by name
router.get(
  '/search',
  validateSearchQuery,
  validatePagination,
  asyncHandler(VillageController.searchVillages)
);

// Get population distribution
router.get(
  '/population-distribution',
  asyncHandler(VillageController.getPopulationDistribution)
);

// Get village by ID
router.get(
  '/:id',
  validateObjectId('id'),
  asyncHandler(VillageController.getVillageById)
);

// Admin route - Delete all villages (for testing/reset)
router.delete(
  '/all',
  validateRateLimit(5, 3600000), // 5 requests per hour for admin actions
  asyncHandler(VillageController.deleteAllVillages)
);

module.exports = router;