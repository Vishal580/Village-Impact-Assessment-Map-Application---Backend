const { POPULATION_COLORS, POPULATION_THRESHOLDS } = require('./constants');

/**
 * Get population color based on population count
 * @param {number} population - Population count
 * @returns {string} - Hex color code
 */
const getPopulationColor = (population) => {
  if (population < POPULATION_THRESHOLDS.VERY_SMALL) return POPULATION_COLORS.VERY_SMALL;
  if (population < POPULATION_THRESHOLDS.SMALL) return POPULATION_COLORS.SMALL;
  if (population < POPULATION_THRESHOLDS.MEDIUM_SMALL) return POPULATION_COLORS.MEDIUM_SMALL;
  if (population < POPULATION_THRESHOLDS.MEDIUM) return POPULATION_COLORS.MEDIUM;
  if (population < POPULATION_THRESHOLDS.LARGE) return POPULATION_COLORS.LARGE;
  if (population < POPULATION_THRESHOLDS.VERY_LARGE) return POPULATION_COLORS.VERY_LARGE;
  return POPULATION_COLORS.EXTREMELY_LARGE;
};

/**
 * Get population category based on population count
 * @param {number} population - Population count
 * @returns {string} - Population category
 */
const getPopulationCategory = (population) => {
  if (population < POPULATION_THRESHOLDS.VERY_SMALL) return 'Very Small';
  if (population < POPULATION_THRESHOLDS.SMALL) return 'Small';
  if (population < POPULATION_THRESHOLDS.MEDIUM_SMALL) return 'Medium Small';
  if (population < POPULATION_THRESHOLDS.MEDIUM) return 'Medium';
  if (population < POPULATION_THRESHOLDS.LARGE) return 'Large';
  if (population < POPULATION_THRESHOLDS.VERY_LARGE) return 'Very Large';
  return 'Extremely Large';
};

/**
 * Format number with locale-specific formatting
 * @param {number} num - Number to format
 * @returns {string} - Formatted number string
 */
const formatNumber = (num) => {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString();
};

/**
 * Format population for display (K, M suffixes)
 * @param {number} num - Population number
 * @returns {string} - Formatted population string
 */
const formatPopulation = (num) => {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

/**
 * Validate bounds object
 * @param {Object} bounds - Bounds object with minLat, maxLat, minLng, maxLng
 * @returns {boolean} - Whether bounds are valid
 */
const validateBounds = (bounds) => {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  
  return (
    typeof minLat === 'number' && 
    typeof maxLat === 'number' && 
    typeof minLng === 'number' && 
    typeof maxLng === 'number' &&
    minLat >= -90 && minLat <= 90 &&
    maxLat >= -90 && maxLat <= 90 &&
    minLng >= -180 && minLng <= 180 &&
    maxLng >= -180 && maxLng <= 180 &&
    minLat <= maxLat &&
    minLng <= maxLng
  );
};

/**
 * Calculate area of polygon coordinates (rough estimation)
 * @param {Array} coordinates - Polygon coordinates
 * @returns {number} - Estimated area in square degrees
 */
const calculatePolygonArea = (coordinates) => {
  if (!coordinates || !coordinates[0] || coordinates[0].length < 3) {
    return 0;
  }
  
  const ring = coordinates[0];
  let area = 0;
  
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x2 - x1) * (y2 + y1);
  }
  
  return Math.abs(area / 2);
};

/**
 * Sanitize string input
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
};

/**
 * Clean up temporary files
 * @param {Array} files - Array of file objects with path property
 */
const cleanupFiles = (files) => {
  const fs = require('fs');
  
  files.forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Error deleting file ${file.path}:`, error);
      }
    }
  });
};

/**
 * Create response object
 * @param {boolean} success - Success status
 * @param {*} data - Response data
 * @param {string} message - Response message
 * @param {Object} meta - Additional metadata
 * @returns {Object} - Standardized response object
 */
const createResponse = (success, data = null, message = '', meta = {}) => {
  return {
    success,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
};

module.exports = {
  getPopulationColor,
  getPopulationCategory,
  formatNumber,
  formatPopulation,
  validateBounds,
  calculatePolygonArea,
  sanitizeString,
  generateUniqueFilename,
  cleanupFiles,
  createResponse
};