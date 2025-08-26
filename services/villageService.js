const Village = require('../models/Village');
const GeoService = require('./geoService');
const { getPopulationColor, validateBounds } = require('../utils/helpers');
const { DB_LIMITS, ZOOM_LEVELS } = require('../utils/constants');

class VillageService {
  /**
   * Create multiple villages in batch
   * @param {Array} villagesData - Array of village data objects
   * @returns {Object} - Batch creation result
   */
  static async createVillagesBatch(villagesData) {
    const errors = [];
    let successCount = 0;

    try {
      // Use insertMany with ordered: false to continue on errors
      const result = await Village.insertMany(villagesData, { 
        ordered: false,
        rawResult: true 
      });
      
      successCount = result.insertedCount || villagesData.length;
      
      return {
        successCount,
        errors,
        insertedIds: result.insertedIds
      };
      
    } catch (error) {
      // Handle bulk write errors
      if (error.writeErrors) {
        error.writeErrors.forEach(writeError => {
          errors.push({
            type: 'DUPLICATE_ENTRY',
            message: writeError.errmsg,
            index: writeError.index
          });
        });
        
        // Calculate successful inserts
        successCount = villagesData.length - error.writeErrors.length;
      } else {
        errors.push({
          type: 'BATCH_INSERT_ERROR',
          message: error.message
        });
      }
      
      return {
        successCount,
        errors
      };
    }
  }

  /**
   * Get all unique states
   * @returns {Array} - Array of state names
   */
  static async getStates() {
    try {
      const states = await Village.distinct('state_name');
      return states.filter(state => state && state.trim() !== '').sort();
    } catch (error) {
      console.error('Error fetching states:', error);
      throw new Error('Failed to fetch states');
    }
  }

  /**
   * Get districts by state
   * @param {string} stateName - State name
   * @returns {Array} - Array of district names
   */
  static async getDistrictsByState(stateName) {
    try {
      const districts = await Village.distinct('district_n', { 
        state_name: stateName 
      });
      return districts.filter(district => district && district.trim() !== '').sort();
    } catch (error) {
      console.error('Error fetching districts:', error);
      throw new Error('Failed to fetch districts');
    }
  }

  /**
   * Get subdistricts by state and district
   * @param {string} stateName - State name
   * @param {string} districtName - District name
   * @returns {Array} - Array of subdistrict names
   */
  static async getSubdistrictsByStateAndDistrict(stateName, districtName) {
    try {
      const subdistricts = await Village.distinct('subdistric', { 
        state_name: stateName,
        district_n: districtName
      });
      return subdistricts.filter(subdist => subdist && subdist.trim() !== '').sort();
    } catch (error) {
      console.error('Error fetching subdistricts:', error);
      throw new Error('Failed to fetch subdistricts');
    }
  }

  /**
   * Get villages with filtering and optimization
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Array} - Array of village data
   */
  static async getVillages(filters = {}, options = {}) {
    try {
      const query = this.buildVillageQuery(filters);
      const projection = this.buildProjection(options.zoom, options.includeGeometry);
      
      const villages = await Village.find(query, projection)
        .limit(options.limit || DB_LIMITS.DEFAULT_VILLAGES_LIMIT)
        .lean();

      // Add color information
      return villages.map(village => ({
        ...village,
        color: getPopulationColor(village.tot_p)
      }));
      
    } catch (error) {
      console.error('Error fetching villages:', error);
      throw new Error('Failed to fetch villages');
    }
  }

  /**
   * Get villages within geographic bounds
   * @param {Object} bounds - Geographic bounds
   * @param {Object} options - Query options
   * @returns {Array} - Array of village data
   */
  static async getVillagesInBounds(bounds, options = {}) {
    try {
      if (!validateBounds(bounds)) {
        throw new Error('Invalid bounds provided');
      }

      const projection = this.buildProjection(options.zoom, options.includeGeometry);
      const limit = this.calculateLimitByZoom(options.zoom);
      
      const villages = await Village.findWithinBounds(bounds, {
        projection,
        limit
      });

      // Add color information
      return villages.map(village => ({
        ...village,
        color: getPopulationColor(village.tot_p)
      }));
      
    } catch (error) {
      console.error('Error fetching villages in bounds:', error);
      throw new Error('Failed to fetch villages in bounds');
    }
  }

  /**
   * Get village statistics
   * @param {Object} filters - Filter options
   * @returns {Object} - Statistics object
   */
  static async getVillageStats(filters = {}) {
    try {
      const matchQuery = this.buildVillageQuery(filters);
      
      const stats = await Village.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalVillages: { $sum: 1 },
            totalPopulation: { $sum: '$tot_p' },
            avgPopulation: { $avg: '$tot_p' },
            minPopulation: { $min: '$tot_p' },
            maxPopulation: { $max: '$tot_p' },
            totalArea: { $sum: '$area' }
          }
        }
      ]);

      if (stats.length === 0) {
        return {
          totalVillages: 0,
          totalPopulation: 0,
          avgPopulation: 0,
          minPopulation: 0,
          maxPopulation: 0,
          totalArea: 0
        };
      }

      return stats[0];
      
    } catch (error) {
      console.error('Error fetching village stats:', error);
      throw new Error('Failed to fetch village statistics');
    }
  }

  /**
   * Get population distribution statistics
   * @param {Object} filters - Filter options
   * @returns {Array} - Population distribution data
   */
  static async getPopulationDistribution(filters = {}) {
    try {
      const matchQuery = this.buildVillageQuery(filters);
      
      const distribution = await Village.aggregate([
        { $match: matchQuery },
        {
          $bucket: {
            groupBy: '$tot_p',
            boundaries: [0, 500, 1000, 2000, 5000, 10000, 20000, Infinity],
            default: 'Other',
            output: {
              count: { $sum: 1 },
              totalPopulation: { $sum: '$tot_p' },
              avgPopulation: { $avg: '$tot_p' }
            }
          }
        }
      ]);

      return distribution;
      
    } catch (error) {
      console.error('Error fetching population distribution:', error);
      throw new Error('Failed to fetch population distribution');
    }
  }

  /**
   * Search villages by name
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @param {number} limit - Result limit
   * @returns {Array} - Array of matching villages
   */
  static async searchVillages(searchTerm, filters = {}, limit = 50) {
    try {
      const query = {
        ...this.buildVillageQuery(filters),
        village_na: new RegExp(searchTerm, 'i')
      };

      const villages = await Village.find(query, {
        village_na: 1,
        state_name: 1,
        district_n: 1,
        subdistric: 1,
        tot_p: 1,
        centroid: 1
      })
      .limit(limit)
      .sort({ tot_p: -1 })
      .lean();

      return villages.map(village => ({
        ...village,
        color: getPopulationColor(village.tot_p)
      }));
      
    } catch (error) {
      console.error('Error searching villages:', error);
      throw new Error('Failed to search villages');
    }
  }

  /**
   * Get village by ID
   * @param {string} villageId - Village ID
   * @returns {Object} - Village data
   */
  static async getVillageById(villageId) {
    try {
      const village = await Village.findById(villageId).lean();
      
      if (!village) {
        throw new Error('Village not found');
      }

      return {
        ...village,
        color: getPopulationColor(village.tot_p)
      };
      
    } catch (error) {
      console.error('Error fetching village by ID:', error);
      throw new Error('Failed to fetch village');
    }
  }

  /**
   * Build MongoDB query object from filters
   * @param {Object} filters - Filter options
   * @returns {Object} - MongoDB query
   * @private
   */
  static buildVillageQuery(filters) {
    const query = {};
    
    if (filters.state) {
      query.state_name = filters.state;
    }
    
    if (filters.district) {
      query.district_n = filters.district;
    }
    
    if (filters.subdistrict) {
      query.subdistric = filters.subdistrict;
    }
    
    if (filters.minPopulation !== undefined) {
      query.tot_p = { ...query.tot_p, $gte: filters.minPopulation };
    }
    
    if (filters.maxPopulation !== undefined) {
      query.tot_p = { ...query.tot_p, $lte: filters.maxPopulation };
    }
    
    return query;
  }

  /**
   * Build projection object based on zoom level
   * @param {number} zoom - Zoom level
   * @param {boolean} includeGeometry - Whether to include geometry
   * @returns {Object} - MongoDB projection
   * @private
   */
  static buildProjection(zoom = 6, includeGeometry = false) {
    const baseProjection = {
      village_na: 1,
      state_name: 1,
      district_n: 1,
      subdistric: 1,
      tot_p: 1,
      centroid: 1,
      bounds: 1,
      area: 1
    };

    // Include geometry for higher zoom levels or when explicitly requested
    if (zoom > ZOOM_LEVELS.HIGH_DETAIL || includeGeometry) {
      baseProjection.geometry = 1;
    }

    return baseProjection;
  }

  /**
   * Calculate appropriate limit based on zoom level
   * @param {number} zoom - Zoom level
   * @returns {number} - Appropriate limit
   * @private
   */
  static calculateLimitByZoom(zoom = 6) {
    if (zoom > ZOOM_LEVELS.HIGH_DETAIL) {
      return DB_LIMITS.MAX_VILLAGES_PER_REQUEST;
    } else if (zoom > ZOOM_LEVELS.LOW_DETAIL) {
      return Math.floor(DB_LIMITS.MAX_VILLAGES_PER_REQUEST * 0.7);
    } else {
      return DB_LIMITS.DEFAULT_VILLAGES_LIMIT;
    }
  }

  /**
   * Delete all villages (for testing/reset purposes)
   * @returns {Object} - Deletion result
   */
  static async deleteAllVillages() {
    try {
      const result = await Village.deleteMany({});
      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      console.error('Error deleting villages:', error);
      throw new Error('Failed to delete villages');
    }
  }
}

module.exports = VillageService;