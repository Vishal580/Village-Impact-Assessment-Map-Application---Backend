const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, 'Validation failed', { errors })
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, `Invalid ${err.path}: ${err.value}`)
    );
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, `Duplicate value for ${field}: ${value}`)
    );
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts';
        break;
      default:
        message = err.message;
    }
    
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, message)
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      createResponse(false, null, 'Invalid token')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      createResponse(false, null, 'Token expired')
    );
  }

  // Shapefile parsing errors
  if (err.message && err.message.includes('shapefile')) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(
      createResponse(false, null, `Shapefile processing error: ${err.message}`)
    );
  }

  // Database connection errors
  if (err.message && (err.message.includes('ECONNREFUSED') || err.message.includes('MongoNetworkError'))) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      createResponse(false, null, 'Database connection failed')
    );
  }

  // Rate limiting errors
  if (err.status === 429) {
    return res.status(429).json(
      createResponse(false, null, 'Too many requests, please try again later')
    );
  }

  // Default server error
  const statusCode = err.statusCode || err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return res.status(statusCode).json(
    createResponse(false, null, message, {
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    })
  );
};

/**
 * Handle 404 errors for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  next(error);
};

/**
 * Async error wrapper to catch async errors in route handlers
 * @param {Function} fn - Async function
 * @returns {Function} - Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};