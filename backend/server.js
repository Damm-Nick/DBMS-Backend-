// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { testConnection } = require('./config/db');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sports Event API is running',
    timestamp: new Date().toISOString()
  });
});

// Simple test route
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Test route works!' });
});

// Database stats route
app.get('/api/db-stats', async (req, res) => {
  try {
    const { query } = require('./config/db');
    
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM players) as players,
        (SELECT COUNT(*) FROM events) as events,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM matches) as matches,
        (SELECT COUNT(*) FROM registrations) as registrations,
        (SELECT COUNT(*) FROM venues) as venues,
        (SELECT COUNT(*) FROM admins) as admins
    `);
    
    res.status(200).json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/events', require('./routes/events'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/statistics', require('./routes/statistics'));

// 404 handler - MUST BE AFTER ALL ROUTES
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler - MUST BE LAST
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server - PORT DEFINITION
const PORT = process.env.PORT || 5000;

// START SERVER FUNCTION - DEFINED BEFORE CALLING
const startServer = async () => {
  try {
    // Test database connection first
    await testConnection();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API URL: http://localhost:${PORT}/api`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// CALL THE FUNCTION - MUST BE AFTER DEFINITION
startServer();