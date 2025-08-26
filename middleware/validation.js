const { createResponse, validateBounds } = require('../utils/helpers');
const { HTTP_STATUS, ALLOWED_EXTENSIONS } = require('../utils/constants');

/**
 * Validate bounds query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateBoundsParams = (req, res, next) => {
  const { minLat, maxLat, minLng, maxLng } = req.query;
  
  if (!minLat || !maxLat || !minLng || !maxLng) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Missing required bounds parameters: minLat, maxLat, minLng, maxLng')
    );
  }

  const bounds = {
    minLat: parseFloat(minLat),
    maxLat: parseFloat(maxLat),
    minLng: parseFloat(minLng),
    maxLng: parseFloat(maxLng)
  };

  // Check if parsing was successful
  if (isNaN(bounds.minLat) || isNaN(bounds.maxLat) || isNaN(bounds.minLng) || isNaN(bounds.maxLng)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Invalid bounds parameters: must be valid numbers')
    );
  }

  if (!validateBounds(bounds)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Invalid bounds: check coordinate ranges and order')
    );
  }

  // Add validated bounds to request for use in controller
  req.validatedBounds = bounds;
  next();
};

/**
 * Validate pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;
  
  if (limit !== undefined) {
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 5000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'Limit must be a number between 1 and 5000')
      );
    }
    req.query.limit = parsedLimit;
  }
  
  if (offset !== undefined) {
    const parsedOffset = parseInt(offset);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'Offset must be a non-negative number')
      );
    }
    req.query.offset = parsedOffset;
  }
  
  next();
};

/**
 * Validate zoom parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateZoom = (req, res, next) => {
  const { zoom } = req.query;
  
  if (zoom !== undefined) {
    const parsedZoom = parseInt(zoom);
    if (isNaN(parsedZoom) || parsedZoom < 1 || parsedZoom > 20) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'Zoom must be a number between 1 and 20')
      );
    }
    req.query.zoom = parsedZoom;
  }
  
  next();
};

/**
 * Validate population range parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validatePopulationRange = (req, res, next) => {
  const { minPopulation, maxPopulation } = req.query;
  
  if (minPopulation !== undefined) {
    const parsedMin = parseInt(minPopulation);
    if (isNaN(parsedMin) || parsedMin < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'minPopulation must be a non-negative number')
      );
    }
    req.query.minPopulation = parsedMin;
  }
  
  if (maxPopulation !== undefined) {
    const parsedMax = parseInt(maxPopulation);
    if (isNaN(parsedMax) || parsedMax < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'maxPopulation must be a non-negative number')
      );
    }
    req.query.maxPopulation = parsedMax;
  }
  
  if (minPopulation !== undefined && maxPopulation !== undefined) {
    if (req.query.minPopulation > req.query.maxPopulation) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'minPopulation cannot be greater than maxPopulation')
      );
    }
  }
  
  next();
};

/**
 * Validate search query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateSearchQuery = (req, res, next) => {
  const { q: searchTerm } = req.query;
  
  if (!searchTerm) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Search term (q) is required')
    );
  }
  
  if (typeof searchTerm !== 'string' || searchTerm.trim().length < 2) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Search term must be at least 2 characters long')
    );
  }
  
  if (searchTerm.length > 100) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Search term cannot exceed 100 characters')
    );
  }
  
  // Sanitize search term
  req.query.q = searchTerm.trim().replace(/[<>]/g, '');
  
  next();
};

/**
 * Validate file upload for shapefile components
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateShapefileUpload = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'No files uploaded')
    );
  }
  
  // Check file extensions
  const allowedExtensions = [...ALLOWED_EXTENSIONS.REQUIRED, ...ALLOWED_EXTENSIONS.OPTIONAL];
  const invalidFiles = req.files.filter(file => {
    const extension = '.' + file.originalname.split('.').pop().toLowerCase();
    return !allowedExtensions.includes(extension);
  });
  
  if (invalidFiles.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, `Invalid file types detected. Allowed: ${allowedExtensions.join(', ')}`, {
        invalidFiles: invalidFiles.map(f => f.originalname)
      })
    );
  }
  
  // Check for required files
  const uploadedExtensions = req.files.map(file => 
    '.' + file.originalname.split('.').pop().toLowerCase()
  );
  
  const missingRequired = ALLOWED_EXTENSIONS.REQUIRED.filter(ext => 
    !uploadedExtensions.includes(ext)
  );
  
  if (missingRequired.length > 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, `Missing required files: ${missingRequired.join(', ')}`)
    );
  }
  
  next();
};

/**
 * Validate MongoDB ObjectId format
 * @param {string} paramName - Parameter name to validate
 * @returns {Function} - Middleware function
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];
    
    if (!value) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, `${paramName} parameter is required`)
      );
    }
    
    // MongoDB ObjectId validation (24 hex characters)
    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(value)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, `Invalid ${paramName} format`)
      );
    }
    
    next();
  };
};

/**
 * Validate location parameters (state, district, subdistrict)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateLocationParams = (req, res, next) => {
  const { state, district, subdistrict } = req.params;
  
  // Validate and sanitize state
  if (state !== undefined) {
    if (typeof state !== 'string' || state.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'Invalid state parameter')
      );
    }
    req.params.state = decodeURIComponent(state).trim();
  }
  
  // Validate and sanitize district
  if (district !== undefined) {
    if (typeof district !== 'string' || district.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'Invalid district parameter')
      );
    }
    req.params.district = decodeURIComponent(district).trim();
  }
  
  // Validate and sanitize subdistrict
  if (subdistrict !== undefined) {
    if (typeof subdistrict !== 'string' || subdistrict.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, 'Invalid subdistrict parameter')
      );
    }
    req.params.subdistrict = decodeURIComponent(subdistrict).trim();
  }
  
  next();
};

/**
 * Validate comparative stats request body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const validateComparativeStats = (req, res, next) => {
  const { regions } = req.body;
  
  if (!regions || !Array.isArray(regions)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'regions must be an array')
    );
  }
  
  if (regions.length === 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'At least one region is required')
    );
  }
  
  if (regions.length > 10) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Maximum 10 regions allowed for comparison')
    );
  }
  
  // Validate each region object
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    
    if (!region || typeof region !== 'object') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, `Region at index ${i} must be an object`)
      );
    }
    
    if (!region.state) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createResponse(false, null, `Region at index ${i} must have a state property`)
      );
    }
  }
  
  next();
};

/**
 * Rate limiting validation
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} - Middleware function
 */
const validateRateLimit = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old requests
    if (requests.has(clientIp)) {
      const clientRequests = requests.get(clientIp).filter(timestamp => timestamp > windowStart);
      requests.set(clientIp, clientRequests);
    } else {
      requests.set(clientIp, []);
    }
    
    const clientRequests = requests.get(clientIp);
    
    if (clientRequests.length >= maxRequests) {
      return res.status(429).json(
        createResponse(false, null, 'Rate limit exceeded. Please try again later.')
      );
    }
    
    clientRequests.push(now);
    requests.set(clientIp, clientRequests);
    
    next();
  };
};

module.exports = {
  validateBoundsParams,
  validatePagination,
  validateZoom,
  validatePopulationRange,
  validateSearchQuery,
  validateShapefileUpload,
  validateObjectId,
  validateLocationParams,
  validateComparativeStats,
  validateRateLimit
};