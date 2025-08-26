// Population color mapping
const POPULATION_COLORS = {
  VERY_SMALL: '#ffffcc',    // < 500
  SMALL: '#c7e9b4',         // 500-999
  MEDIUM_SMALL: '#7fcdbb',  // 1000-1999
  MEDIUM: '#41b6c4',        // 2000-4999
  LARGE: '#2c7fb8',         // 5000-9999
  VERY_LARGE: '#253494',    // 10000-19999
  EXTREMELY_LARGE: '#081d58' // >= 20000
};

// Population thresholds
const POPULATION_THRESHOLDS = {
  VERY_SMALL: 500,
  SMALL: 1000,
  MEDIUM_SMALL: 2000,
  MEDIUM: 5000,
  LARGE: 10000,
  VERY_LARGE: 20000
};

// File upload constants
const UPLOAD_LIMITS = {
  FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILES: 10
};

const ALLOWED_EXTENSIONS = {
  REQUIRED: ['.shp', '.dbf', '.shx', '.prj'],
  OPTIONAL: ['.cpg', '.sbn', '.sbx']
};

// Database constants
const DB_LIMITS = {
  BATCH_SIZE: 100,
  MAX_VILLAGES_PER_REQUEST: 2000,
  DEFAULT_VILLAGES_LIMIT: 1000
};

// API response constants
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};

// Zoom level constants
const ZOOM_LEVELS = {
  LOW_DETAIL: 10,
  HIGH_DETAIL: 12,
  MAX_DETAIL: 18
};

// Geographic constants
const GEO_BOUNDS = {
  INDIA: {
    MIN_LAT: 6.0,
    MAX_LAT: 38.0,
    MIN_LNG: 68.0,
    MAX_LNG: 98.0
  }
};

module.exports = {
  POPULATION_COLORS,
  POPULATION_THRESHOLDS,
  UPLOAD_LIMITS,
  ALLOWED_EXTENSIONS,
  DB_LIMITS,
  HTTP_STATUS,
  ZOOM_LEVELS,
  GEO_BOUNDS
};