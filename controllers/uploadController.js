const ShapefileService = require('../services/shapefileService');
const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class UploadController {
  /**
   * Upload and process shapefile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async uploadShapefile(req, res) {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'No files uploaded')
        );
      }

      console.log(`Received ${files.length} files for processing`);
      
      // Validate shapefile components
      const validation = ShapefileService.validateShapefileComponents(files);
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, validation.error)
        );
      }

      // Get metadata before processing
      const metadata = await ShapefileService.getShapefileMetadata(files);
      if (!metadata.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, `Invalid shapefile: ${metadata.error}`)
        );
      }

      // Validate structure
      const structureValidation = await ShapefileService.validateShapefileStructure(files);
      if (!structureValidation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, structureValidation.error, {
            availableFields: structureValidation.availableFields
          })
        );
      }

      console.log(`Processing shapefile with ${metadata.metadata.featureCount} features`);

      // Process shapefile with progress tracking
      let lastProgress = 0;
      const progressCallback = (processed, errors) => {
        const currentProgress = Math.floor((processed / metadata.metadata.featureCount) * 100);
        if (currentProgress > lastProgress + 10) { // Log every 10% progress
          console.log(`Processing progress: ${currentProgress}% (${processed}/${metadata.metadata.featureCount})`);
          lastProgress = currentProgress;
        }
      };

      const result = await ShapefileService.processShapefile(files, progressCallback);
      
      if (result.success) {
        const timeEstimation = ShapefileService.estimateProcessingTime(metadata.metadata.featureCount);
        
        return res.json(
          createResponse(
            true, 
            {
              processedCount: result.processedCount,
              errorCount: result.errorCount,
              errors: result.errors
            },
            result.message,
            {
              originalFeatureCount: metadata.metadata.featureCount,
              processingTime: timeEstimation,
              hasErrors: result.errorCount > 0
            }
          )
        );
      } else {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
          createResponse(false, null, result.message, {
            processedCount: result.processedCount,
            errors: result.errors
          })
        );
      }

    } catch (error) {
      console.error('Upload controller error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, `Upload processing failed: ${error.message}`)
      );
    }
  }

  /**
   * Get shapefile metadata without processing
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getShapefileMetadata(req, res) {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'No files uploaded')
        );
      }

      const validation = ShapefileService.validateShapefileComponents(files);
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, validation.error)
        );
      }

      const metadata = await ShapefileService.getShapefileMetadata(files);
      
      if (metadata.success) {
        const timeEstimation = ShapefileService.estimateProcessingTime(metadata.metadata.featureCount);
        
        return res.json(
          createResponse(true, metadata.metadata, 'Metadata extracted successfully', {
            timeEstimation
          })
        );
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, metadata.error)
        );
      }

    } catch (error) {
      console.error('Metadata extraction error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, `Metadata extraction failed: ${error.message}`)
      );
    }
  }

  /**
   * Validate shapefile structure
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async validateShapefile(req, res) {
    try {
      const files = req.files;
      
      if (!files || files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'No files uploaded')
        );
      }

      const validation = ShapefileService.validateShapefileComponents(files);
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, validation.error)
        );
      }

      const structureValidation = await ShapefileService.validateShapefileStructure(files);
      
      if (structureValidation.isValid) {
        return res.json(
          createResponse(true, structureValidation.metadata, 'Shapefile structure is valid')
        );
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, structureValidation.error, {
            availableFields: structureValidation.availableFields
          })
        );
      }

    } catch (error) {
      console.error('Validation error:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, `Validation failed: ${error.message}`)
      );
    }
  }
}

module.exports = UploadController;