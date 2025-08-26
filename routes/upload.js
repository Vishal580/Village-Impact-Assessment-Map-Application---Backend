const express = require('express');
const upload = require('../config/multer');
const UploadController = require('../controllers/uploadController');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRateLimit, validateShapefileUpload } = require('../middleware/validation');

const router = express.Router();

// Apply rate limiting to upload routes (stricter limits)
router.use(validateRateLimit(10, 60000)); // 10 requests per minute

// Upload and process shapefile
router.post(
  '/shapefile',
  upload.array('files', 10),
  validateShapefileUpload,
  asyncHandler(UploadController.uploadShapefile)
);

// Get shapefile metadata without processing
router.post(
  '/metadata',
  upload.array('files', 10),
  validateShapefileUpload,
  asyncHandler(UploadController.getShapefileMetadata)
);

// Validate shapefile structure
router.post(
  '/validate',
  upload.array('files', 10),
  validateShapefileUpload,
  asyncHandler(UploadController.validateShapefile)
);

module.exports = router;