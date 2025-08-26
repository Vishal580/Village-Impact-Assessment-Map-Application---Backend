const VillageService = require('../services/villageService');
const { createResponse, validateBounds } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class VillageController {
  /**
   * Get all states
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getStates(req, res) {
    try {
      const states = await VillageService.getStates();
      return res.json(
        createResponse(true, states, 'States retrieved successfully', {
          count: states.length
        })
      );
    } catch (error) {
      console.error('Error in getStates:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get districts by state
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getDistricts(req, res) {
    try {
      const { state } = req.params;
      
      if (!state) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'State parameter is required')
        );
      }

      const districts = await VillageService.getDistrictsByState(decodeURIComponent(state));
      return res.json(
        createResponse(true, districts, 'Districts retrieved successfully', {
          state,
          count: districts.length
        })
      );
    } catch (error) {
      console.error('Error in getDistricts:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get subdistricts by state and district
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getSubdistricts(req, res) {
    try {
      const { state, district } = req.params;
      
      if (!state || !district) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'State and district parameters are required')
        );
      }

      const subdistricts = await VillageService.getSubdistrictsByStateAndDistrict(
        decodeURIComponent(state),
        decodeURIComponent(district)
      );
      
      return res.json(
        createResponse(true, subdistricts, 'Subdistricts retrieved successfully', {
          state,
          district,
          count: subdistricts.length
        })
      );
    } catch (error) {
      console.error('Error in getSubdistricts:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get villages with filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getVillages(req, res) {
    try {
      const { state, district, subdistrict, zoom, minPopulation, maxPopulation, limit } = req.query;
      
      const filters = {};
      if (state) filters.state = state;
      if (district) filters.district = district;
      if (subdistrict) filters.subdistrict = subdistrict;
      if (minPopulation) filters.minPopulation = parseInt(minPopulation);
      if (maxPopulation) filters.maxPopulation = parseInt(maxPopulation);

      const options = {
        zoom: parseInt(zoom) || 6,
        limit: parseInt(limit) || undefined
      };

      const villages = await VillageService.getVillages(filters, options);
      
      return res.json(
        createResponse(true, villages, 'Villages retrieved successfully', {
          filters,
          count: villages.length,
          zoom: options.zoom
        })
      );
    } catch (error) {
      console.error('Error in getVillages:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get villages within geographic bounds
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getVillagesInBounds(req, res) {
    try {
      const { minLat, maxLat, minLng, maxLng, zoom } = req.query;
      
      if (!minLat || !maxLat || !minLng || !maxLng) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'Bounds parameters (minLat, maxLat, minLng, maxLng) are required')
        );
      }

      const bounds = {
        minLat: parseFloat(minLat),
        maxLat: parseFloat(maxLat),
        minLng: parseFloat(minLng),
        maxLng: parseFloat(maxLng)
      };

      if (!validateBounds(bounds)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'Invalid bounds provided')
        );
      }

      const options = {
        zoom: parseInt(zoom) || 6
      };

      const villages = await VillageService.getVillagesInBounds(bounds, options);
      
      return res.json(
        createResponse(true, villages, 'Villages in bounds retrieved successfully', {
          bounds,
          count: villages.length,
          zoom: options.zoom
        })
      );
    } catch (error) {
      console.error('Error in getVillagesInBounds:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Search villages by name
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async searchVillages(req, res) {
    try {
      const { q: searchTerm, state, district, subdistrict, limit } = req.query;
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'Search term must be at least 2 characters long')
        );
      }

      const filters = {};
      if (state) filters.state = state;
      if (district) filters.district = district;
      if (subdistrict) filters.subdistrict = subdistrict;

      const searchLimit = parseInt(limit) || 50;

      const villages = await VillageService.searchVillages(
        searchTerm.trim(), 
        filters, 
        searchLimit
      );
      
      return res.json(
        createResponse(true, villages, 'Village search completed', {
          searchTerm,
          filters,
          count: villages.length,
          limit: searchLimit
        })
      );
    } catch (error) {
      console.error('Error in searchVillages:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get village by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getVillageById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'Village ID is required')
        );
      }

      const village = await VillageService.getVillageById(id);
      
      return res.json(
        createResponse(true, village, 'Village retrieved successfully')
      );
    } catch (error) {
      console.error('Error in getVillageById:', error);
      
      if (error.message === 'Village not found') {
        return res.status(HTTP_STATUS.NOT_FOUND).json(
          createResponse(false, null, error.message)
        );
      }
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get population distribution
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getPopulationDistribution(req, res) {
    try {
      const { state, district, subdistrict } = req.query;
      
      const filters = {};
      if (state) filters.state = state;
      if (district) filters.district = district;
      if (subdistrict) filters.subdistrict = subdistrict;

      const distribution = await VillageService.getPopulationDistribution(filters);
      
      return res.json(
        createResponse(true, distribution, 'Population distribution retrieved successfully', {
          filters
        })
      );
    } catch (error) {
      console.error('Error in getPopulationDistribution:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Delete all villages (admin only - for testing/reset)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async deleteAllVillages(req, res) {
    try {
      // Add authentication/authorization check here in production
      const { confirm } = req.body;
      
      if (confirm !== 'DELETE_ALL_VILLAGES') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'Confirmation string required')
        );
      }

      const result = await VillageService.deleteAllVillages();
      
      return res.json(
        createResponse(true, result, 'All villages deleted successfully')
      );
    } catch (error) {
      console.error('Error in deleteAllVillages:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }
}

module.exports = VillageController;