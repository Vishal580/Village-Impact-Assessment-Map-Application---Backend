const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
  state_name: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  district_n: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  subdistric: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  village_na: {
    type: String,
    required: true,
    trim: true
  },
  pc11_tv_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  tot_p: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]],
      required: true
    }
  },
  centroid: {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180
    }
  },
  bounds: {
    minLat: {
      type: Number,
      required: true
    },
    maxLat: {
      type: Number,
      required: true
    },
    minLng: {
      type: Number,
      required: true
    },
    maxLng: {
      type: Number,
      required: true
    }
  },
  area: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'villages',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better performance
villageSchema.index({ geometry: '2dsphere' });
villageSchema.index({ state_name: 1, district_n: 1, subdistric: 1 });
villageSchema.index({ tot_p: 1 });
villageSchema.index({ 'bounds.minLat': 1, 'bounds.maxLat': 1, 'bounds.minLng': 1, 'bounds.maxLng': 1 });

// Virtual for population category
villageSchema.virtual('populationCategory').get(function() {
  if (this.tot_p < 500) return 'Very Small';
  if (this.tot_p < 1000) return 'Small';
  if (this.tot_p < 2000) return 'Medium';
  if (this.tot_p < 5000) return 'Large';
  if (this.tot_p < 10000) return 'Very Large';
  return 'Extremely Large';
});

// Method to get population color
villageSchema.methods.getPopulationColor = function() {
  if (this.tot_p < 500) return '#ffffcc';
  if (this.tot_p < 1000) return '#c7e9b4';
  if (this.tot_p < 2000) return '#7fcdbb';
  if (this.tot_p < 5000) return '#41b6c4';
  if (this.tot_p < 10000) return '#2c7fb8';
  if (this.tot_p < 20000) return '#253494';
  return '#081d58';
};

// Static method to get villages within bounds
villageSchema.statics.findWithinBounds = function(bounds, options = {}) {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  
  return this.find({
    'bounds.minLat': { $lte: maxLat },
    'bounds.maxLat': { $gte: minLat },
    'bounds.minLng': { $lte: maxLng },
    'bounds.maxLng': { $gte: minLng }
  }, options.projection)
  .limit(options.limit || 1000)
  .lean();
};

// Pre-save middleware to update timestamps
villageSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Village', villageSchema);