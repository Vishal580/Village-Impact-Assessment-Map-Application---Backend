const express = require('express');
const uploadRoutes = require('./upload');
const villageRoutes = require('./villages');
const statsRoutes = require('./stats');

const router = express.Router();

// Mount route modules
router.use('/upload', uploadRoutes);
router.use('/villages', villageRoutes);
router.use('/stats', statsRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Village Impact Assessment API',
    version: '1.0.0',
    endpoints: {
      upload: '/api/upload',
      villages: '/api/villages',
      stats: '/api/stats'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;