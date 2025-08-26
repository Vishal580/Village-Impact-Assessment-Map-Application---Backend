const shapefile = require('shapefile');
const GeoService = require('./geoService');
const VillageService = require('./villageService');
const { cleanupFiles, sanitizeString } = require('../utils/helpers');
const { DB_LIMITS, ALLOWED_EXTENSIONS } = require('../utils/constants');

class ShapefileService {
  /**
   * Validate uploaded shapefile components
   * @param {Array} files - Array of uploaded file objects
   * @returns {Object} - Validation result
   */
  static validateShapefileComponents(files) {
    const extensions = files.map(file => 
      '.' + file.originalname.split('.').pop().toLowerCase()
    );
    
    const missingRequired = ALLOWED_EXTENSIONS.REQUIRED.filter(
      ext => !extensions.includes(ext)
    );
    
    if (missingRequired.length > 0) {
      return {
        isValid: false,
        error: `Missing required files: ${missingRequired.join(', ')}`
      };
    }
    
    return {
      isValid: true,
      requiredFiles: files.filter(file => {
        const ext = '.' + file.originalname.split('.').pop().toLowerCase();
        return ALLOWED_EXTENSIONS.REQUIRED.includes(ext);
      }),
      optionalFiles: files.filter(file => {
        const ext = '.' + file.originalname.split('.').pop().toLowerCase();
        return ALLOWED_EXTENSIONS.OPTIONAL.includes(ext);
      })
    };
  }

  /**
   * Process shapefile and extract village data
   * @param {Array} files - Array of uploaded file objects
   * @param {Function} progressCallback - Progress callback function
   * @returns {Object} - Processing result
   */
  static async processShapefile(files, progressCallback = null) {
    let processedCount = 0;
    const errors = [];
    
    try {
      // Validate file components
      const validation = this.validateShapefileComponents(files);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Find required files
      const shpFile = files.find(f => f.originalname.toLowerCase().endsWith('.shp'));
      const dbfFile = files.find(f => f.originalname.toLowerCase().endsWith('.dbf'));
      
      if (!shpFile || !dbfFile) {
        throw new Error('Missing required .shp or .dbf file');
      }

      console.log('Opening shapefile for processing...');
      const source = await shapefile.open(shpFile.path, dbfFile.path);
      
      let batch = [];
      const batchSize = DB_LIMITS.BATCH_SIZE;
      
      while (true) {
        const result = await source.read();
        if (result.done) break;

        const feature = result.value;
        if (!feature || !feature.geometry || !feature.properties) {
          continue;
        }

        try {
          // Process individual feature
          const villageData = await this.processFeature(feature);
          if (villageData) {
            batch.push(villageData);
          }
          
          // Process batch when it reaches the batch size
          if (batch.length >= batchSize) {
            const batchResult = await VillageService.createVillagesBatch(batch);
            processedCount += batchResult.successCount;
            
            if (batchResult.errors.length > 0) {
              errors.push(...batchResult.errors);
            }
            
            batch = [];
            
            // Call progress callback if provided
            if (progressCallback) {
              progressCallback(processedCount, errors.length);
            }
            
            console.log(`Processed ${processedCount} villages...`);
          }
        } catch (featureError) {
          console.error('Error processing feature:', featureError);
          errors.push({
            type: 'FEATURE_PROCESSING_ERROR',
            message: featureError.message,
            feature: feature.properties
          });
        }
      }
      
      // Process remaining batch
      if (batch.length > 0) {
        const batchResult = await VillageService.createVillagesBatch(batch);
        processedCount += batchResult.successCount;
        
        if (batchResult.errors.length > 0) {
          errors.push(...batchResult.errors);
        }
      }

      console.log(`Shapefile processing completed. Processed: ${processedCount}, Errors: ${errors.length}`);
      
      return {
        success: true,
        processedCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Return only first 10 errors
        message: `Successfully processed ${processedCount} villages`
      };

    } catch (error) {
      console.error('Error processing shapefile:', error);
      return {
        success: false,
        processedCount,
        errorCount: errors.length + 1,
        errors: [...errors, {
          type: 'GENERAL_ERROR',
          message: error.message
        }],
        message: `Processing failed: ${error.message}`
      };
    } finally {
      // Clean up uploaded files
      cleanupFiles(files);
    }
  }

  /**
   * Process individual shapefile feature
   * @param {Object} feature - Shapefile feature
   * @returns {Object|null} - Processed village data or null
   */
  static async processFeature(feature) {
    try {
      // Validate geometry
      if (!GeoService.validateGeometry(feature.geometry)) {
        throw new Error('Invalid geometry structure');
      }

      // Calculate geometric properties
      const centroid = GeoService.calculateCentroid(feature.geometry);
      const bounds = GeoService.calculateBounds(feature.geometry);
      const area = GeoService.calculateArea(feature.geometry);
      
      // Extract and sanitize properties
      const properties = feature.properties;
      
      const villageData = {
        state_name: sanitizeString(properties.state_name || ''),
        district_n: sanitizeString(properties.district_n || ''),
        subdistric: sanitizeString(properties.subdistric || ''),
        village_na: sanitizeString(properties.village_na || ''),
        pc11_tv_id: sanitizeString(properties.pc11_tv_id || ''),
        tot_p: parseInt(properties.tot_p) || 0,
        geometry: feature.geometry,
        centroid,
        bounds,
        area
      };

      // Validate required fields
      if (!villageData.state_name || !villageData.district_n || !villageData.subdistric) {
        throw new Error('Missing required location data');
      }

      return villageData;
      
    } catch (error) {
      console.error('Error processing feature:', error);
      return null;
    }
  }

  /**
   * Get shapefile metadata
   * @param {Array} files - Array of uploaded file objects
   * @returns {Object} - Shapefile metadata
   */
  static async getShapefileMetadata(files) {
    try {
      const validation = this.validateShapefileComponents(files);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const shpFile = files.find(f => f.originalname.toLowerCase().endsWith('.shp'));
      const dbfFile = files.find(f => f.originalname.toLowerCase().endsWith('.dbf'));
      
      const source = await shapefile.open(shpFile.path, dbfFile.path);
      
      // Read first feature to get field names
      const firstResult = await source.read();
      const fieldNames = firstResult.value ? Object.keys(firstResult.value.properties) : [];
      
      // Count total features
      let featureCount = 0;
      while (true) {
        const result = await source.read();
        if (result.done) break;
        featureCount++;
      }
      
      return {
        success: true,
        metadata: {
          featureCount,
          fieldNames,
          hasRequiredFields: [
            'state_name', 'district_n', 'subdistric', 'village_na', 'tot_p'
          ].every(field => fieldNames.includes(field))
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate shapefile structure before processing
   * @param {Array} files - Array of uploaded file objects
   * @returns {Object} - Validation result
   */
  static async validateShapefileStructure(files) {
    try {
      const metadata = await this.getShapefileMetadata(files);
      
      if (!metadata.success) {
        return {
          isValid: false,
          error: metadata.error
        };
      }

      const requiredFields = ['state_name', 'district_n', 'subdistric', 'village_na', 'tot_p'];
      const missingFields = requiredFields.filter(
        field => !metadata.metadata.fieldNames.includes(field)
      );

      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          availableFields: metadata.metadata.fieldNames
        };
      }

      return {
        isValid: true,
        metadata: metadata.metadata
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Estimate processing time based on feature count
   * @param {number} featureCount - Number of features in shapefile
   * @returns {Object} - Time estimation
   */
  static estimateProcessingTime(featureCount) {
    // Rough estimation: ~100-200 features per second
    const featuresPerSecond = 150;
    const estimatedSeconds = Math.ceil(featureCount / featuresPerSecond);
    
    return {
      estimatedSeconds,
      estimatedMinutes: Math.ceil(estimatedSeconds / 60),
      featureCount
    };
  }
}

module.exports = ShapefileService;