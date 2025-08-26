const VillageService = require('../services/villageService');
const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

class StatsController {
  /**
   * Get village statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getVillageStats(req, res) {
    try {
      const { state, district, subdistrict } = req.query;
      
      const filters = {};
      if (state) filters.state = state;
      if (district) filters.district = district;
      if (subdistrict) filters.subdistrict = subdistrict;

      const stats = await VillageService.getVillageStats(filters);
      
      return res.json(
        createResponse(true, stats, 'Statistics retrieved successfully', {
          filters,
          level: subdistrict ? 'subdistrict' : district ? 'district' : state ? 'state' : 'national'
        })
      );
    } catch (error) {
      console.error('Error in getVillageStats:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get comprehensive dashboard statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getDashboardStats(req, res) {
    try {
      const { state, district, subdistrict } = req.query;
      
      const filters = {};
      if (state) filters.state = state;
      if (district) filters.district = district;
      if (subdistrict) filters.subdistrict = subdistrict;

      // Get basic stats and population distribution in parallel
      const [basicStats, populationDistribution] = await Promise.all([
        VillageService.getVillageStats(filters),
        VillageService.getPopulationDistribution(filters)
      ]);

      // Calculate additional insights
      const insights = this.calculateInsights(basicStats, populationDistribution);
      
      const dashboardData = {
        basicStats,
        populationDistribution,
        insights
      };
      
      return res.json(
        createResponse(true, dashboardData, 'Dashboard statistics retrieved successfully', {
          filters,
          level: subdistrict ? 'subdistrict' : district ? 'district' : state ? 'state' : 'national'
        })
      );
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get summary statistics for multiple levels
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getSummaryStats(req, res) {
    try {
      const { state } = req.query;
      
      if (!state) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'State parameter is required for summary stats')
        );
      }

      // Get stats for state level and all its districts
      const [stateStats, districts] = await Promise.all([
        VillageService.getVillageStats({ state }),
        VillageService.getDistrictsByState(state)
      ]);

      // Get stats for each district
      const districtStats = await Promise.all(
        districts.map(async (district) => {
          const stats = await VillageService.getVillageStats({ state, district });
          return {
            district,
            ...stats
          };
        })
      );

      const summaryData = {
        state,
        stateStats,
        districtStats: districtStats.sort((a, b) => b.totalPopulation - a.totalPopulation)
      };
      
      return res.json(
        createResponse(true, summaryData, 'Summary statistics retrieved successfully')
      );
    } catch (error) {
      console.error('Error in getSummaryStats:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Get comparative statistics between regions
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async getComparativeStats(req, res) {
    try {
      const { regions } = req.body;
      
      if (!regions || !Array.isArray(regions) || regions.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'Regions array is required')
        );
      }

      if (regions.length > 10) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createResponse(false, null, 'Maximum 10 regions allowed for comparison')
        );
      }

      // Get stats for each region
      const comparativeStats = await Promise.all(
        regions.map(async (region) => {
          const filters = {};
          if (region.state) filters.state = region.state;
          if (region.district) filters.district = region.district;
          if (region.subdistrict) filters.subdistrict = region.subdistrict;

          const stats = await VillageService.getVillageStats(filters);
          return {
            region,
            ...stats
          };
        })
      );

      const comparisonData = {
        regions: comparativeStats,
        comparison: this.generateComparison(comparativeStats)
      };
      
      return res.json(
        createResponse(true, comparisonData, 'Comparative statistics retrieved successfully')
      );
    } catch (error) {
      console.error('Error in getComparativeStats:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createResponse(false, null, error.message)
      );
    }
  }

  /**
   * Calculate insights from basic stats and distribution
   * @param {Object} basicStats - Basic statistics
   * @param {Array} distribution - Population distribution
   * @returns {Object} - Calculated insights
   * @private
   */
  static calculateInsights(basicStats, distribution) {
    const insights = {};
    
    // Population density category
    if (basicStats.avgPopulation) {
      if (basicStats.avgPopulation > 2000) {
        insights.populationDensity = 'High';
      } else if (basicStats.avgPopulation > 1000) {
        insights.populationDensity = 'Medium';
      } else {
        insights.populationDensity = 'Low';
      }
    }

    // Village size category
    if (basicStats.totalVillages) {
      if (basicStats.totalVillages > 100) {
        insights.areaSize = 'Large';
      } else if (basicStats.totalVillages > 50) {
        insights.areaSize = 'Medium';
      } else {
        insights.areaSize = 'Small';
      }
    }

    // Population variation
    if (basicStats.maxPopulation && basicStats.avgPopulation) {
      const variation = basicStats.maxPopulation / basicStats.avgPopulation;
      insights.populationVariation = variation > 3 ? 'High' : variation > 2 ? 'Medium' : 'Low';
    }

    // Dominant village size from distribution
    if (distribution && distribution.length > 0) {
      const dominantBucket = distribution.reduce((prev, current) => 
        prev.count > current.count ? prev : current
      );
      insights.dominantVillageSize = this.getBucketLabel(dominantBucket._id);
    }

    return insights;
  }

  /**
   * Generate comparison analysis
   * @param {Array} regions - Array of region statistics
   * @returns {Object} - Comparison analysis
   * @private
   */
  static generateComparison(regions) {
    if (regions.length === 0) return {};

    // Find regions with highest/lowest values
    const maxPopulation = regions.reduce((prev, current) => 
      prev.totalPopulation > current.totalPopulation ? prev : current
    );
    
    const minPopulation = regions.reduce((prev, current) => 
      prev.totalPopulation < current.totalPopulation ? prev : current
    );

    const maxVillages = regions.reduce((prev, current) => 
      prev.totalVillages > current.totalVillages ? prev : current
    );

    const maxAvgPopulation = regions.reduce((prev, current) => 
      prev.avgPopulation > current.avgPopulation ? prev : current
    );

    return {
      highestPopulation: {
        region: maxPopulation.region,
        value: maxPopulation.totalPopulation
      },
      lowestPopulation: {
        region: minPopulation.region,
        value: minPopulation.totalPopulation
      },
      mostVillages: {
        region: maxVillages.region,
        value: maxVillages.totalVillages
      },
      highestDensity: {
        region: maxAvgPopulation.region,
        value: maxAvgPopulation.avgPopulation
      }
    };
  }

  /**
   * Get label for population bucket
   * @param {*} bucketId - Bucket ID from aggregation
   * @returns {string} - Human readable label
   * @private
   */
  static getBucketLabel(bucketId) {
    if (bucketId === 0) return 'Very Small (0-499)';
    if (bucketId === 500) return 'Small (500-999)';
    if (bucketId === 1000) return 'Medium Small (1000-1999)';
    if (bucketId === 2000) return 'Medium (2000-4999)';
    if (bucketId === 5000) return 'Large (5000-9999)';
    if (bucketId === 10000) return 'Very Large (10000-19999)';
    if (bucketId === 20000) return 'Extremely Large (20000+)';
    return 'Other';
  }
}

module.exports = StatsController;