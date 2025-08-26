const turf = require('@turf/turf');
const { calculatePolygonArea } = require('../utils/helpers');

class GeoService {
  /**
   * Calculate centroid of a geometry
   * @param {Object} geometry - GeoJSON geometry
   * @returns {Object} - Centroid coordinates {lat, lng}
   */
  static calculateCentroid(geometry) {
    try {
      const centroid = turf.centroid(geometry);
      return {
        lat: centroid.geometry.coordinates[1],
        lng: centroid.geometry.coordinates[0]
      };
    } catch (error) {
      console.error('Error calculating centroid:', error);
      // Fallback: use first coordinate if centroid calculation fails
      if (geometry.coordinates && geometry.coordinates[0] && geometry.coordinates[0][0]) {
        const [lng, lat] = geometry.coordinates[0][0];
        return { lat, lng };
      }
      return { lat: 0, lng: 0 };
    }
  }

  /**
   * Calculate bounding box of a geometry
   * @param {Object} geometry - GeoJSON geometry
   * @returns {Object} - Bounding box {minLat, maxLat, minLng, maxLng}
   */
  static calculateBounds(geometry) {
    try {
      const bbox = turf.bbox(geometry);
      return {
        minLng: bbox[0],
        minLat: bbox[1],
        maxLng: bbox[2],
        maxLat: bbox[3]
      };
    } catch (error) {
      console.error('Error calculating bounds:', error);
      return {
        minLat: 0,
        maxLat: 0,
        minLng: 0,
        maxLng: 0
      };
    }
  }

  /**
   * Simplify geometry based on zoom level
   * @param {Object} geometry - GeoJSON geometry
   * @param {number} zoom - Zoom level
   * @returns {Object} - Simplified geometry
   */
  static simplifyGeometry(geometry, zoom = 10) {
    try {
      // More tolerance for lower zoom levels (more simplification)
      let tolerance = 0.01; // Default for zoom 10
      
      if (zoom < 8) {
        tolerance = 0.05;
      } else if (zoom < 10) {
        tolerance = 0.02;
      } else if (zoom < 12) {
        tolerance = 0.01;
      } else {
        tolerance = 0.005;
      }
      
      const simplified = turf.simplify(geometry, {
        tolerance: tolerance,
        highQuality: zoom > 12
      });
      
      return simplified.geometry;
    } catch (error) {
      console.error('Error simplifying geometry:', error);
      return geometry;
    }
  }

  /**
   * Calculate area of geometry
   * @param {Object} geometry - GeoJSON geometry
   * @returns {number} - Area in square meters
   */
  static calculateArea(geometry) {
    try {
      return turf.area(geometry);
    } catch (error) {
      console.error('Error calculating area:', error);
      // Fallback calculation
      if (geometry.coordinates && geometry.coordinates[0]) {
        return calculatePolygonArea(geometry.coordinates);
      }
      return 0;
    }
  }

  /**
   * Check if point is within bounds
   * @param {Object} point - Point {lat, lng}
   * @param {Object} bounds - Bounds {minLat, maxLat, minLng, maxLng}
   * @returns {boolean} - Whether point is within bounds
   */
  static isPointWithinBounds(point, bounds) {
    return (
      point.lat >= bounds.minLat &&
      point.lat <= bounds.maxLat &&
      point.lng >= bounds.minLng &&
      point.lng <= bounds.maxLng
    );
  }

  /**
   * Check if geometry intersects with bounds
   * @param {Object} geometry - GeoJSON geometry
   * @param {Object} bounds - Bounds {minLat, maxLat, minLng, maxLng}
   * @returns {boolean} - Whether geometry intersects bounds
   */
  static intersectsBounds(geometry, bounds) {
    try {
      const boundingBox = turf.bboxPolygon([
        bounds.minLng,
        bounds.minLat,
        bounds.maxLng,
        bounds.maxLat
      ]);
      
      return turf.booleanIntersects(geometry, boundingBox);
    } catch (error) {
      console.error('Error checking intersection:', error);
      return false;
    }
  }

  /**
   * Create buffer around geometry
   * @param {Object} geometry - GeoJSON geometry
   * @param {number} radius - Buffer radius in kilometers
   * @returns {Object} - Buffered geometry
   */
  static createBuffer(geometry, radius = 1) {
    try {
      const buffered = turf.buffer(geometry, radius, { units: 'kilometers' });
      return buffered.geometry;
    } catch (error) {
      console.error('Error creating buffer:', error);
      return geometry;
    }
  }

  /**
   * Transform coordinates from one projection to another
   * @param {Array} coordinates - Input coordinates
   * @param {string} fromProj - Source projection (default: WGS84)
   * @param {string} toProj - Target projection (default: WGS84)
   * @returns {Array} - Transformed coordinates
   */
  static transformCoordinates(coordinates, fromProj = 'WGS84', toProj = 'WGS84') {
    // For now, assuming WGS84 to WGS84 (no transformation needed)
    // In a real application, you might want to use proj4js for coordinate transformations
    return coordinates;
  }

  /**
   * Validate geometry structure
   * @param {Object} geometry - GeoJSON geometry
   * @returns {boolean} - Whether geometry is valid
   */
  static validateGeometry(geometry) {
    try {
      // Check basic structure
      if (!geometry || !geometry.type || !geometry.coordinates) {
        return false;
      }

      // Check for supported types
      const supportedTypes = ['Polygon', 'MultiPolygon', 'Point', 'LineString'];
      if (!supportedTypes.includes(geometry.type)) {
        return false;
      }

      // Check coordinates structure
      if (!Array.isArray(geometry.coordinates)) {
        return false;
      }

      // For Polygon, check minimum 3 coordinates in outer ring
      if (geometry.type === 'Polygon') {
        if (!geometry.coordinates[0] || geometry.coordinates[0].length < 3) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating geometry:', error);
      return false;
    }
  }

  /**
   * Get geometry type
   * @param {Object} geometry - GeoJSON geometry
   * @returns {string} - Geometry type
   */
  static getGeometryType(geometry) {
    return geometry && geometry.type ? geometry.type : 'Unknown';
  }

  /**
   * Convert geometry to GeoJSON feature
   * @param {Object} geometry - GeoJSON geometry
   * @param {Object} properties - Feature properties
   * @returns {Object} - GeoJSON feature
   */
  static toGeoJSONFeature(geometry, properties = {}) {
    return {
      type: 'Feature',
      geometry: geometry,
      properties: properties
    };
  }
}

module.exports = GeoService;