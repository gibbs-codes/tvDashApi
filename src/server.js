require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const wsHandler = require('./wsHandler');
const scheduler = require('./scheduler');
const { getDashboardData } = require('./aggregators');
const { isValidMode } = require('./utils/modeManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Dashboard API Routes

/**
 * GET /api/dashboard/data
 * Returns current dashboard data for specified mode
 */
app.get('/api/dashboard/data', async (req, res, next) => {
  try {
    const mode = req.query.mode || 'personal';

    if (!isValidMode(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        message: `Mode '${mode}' is not supported`,
        validModes: ['personal', 'guest', 'briefing', 'weather', 'art']
      });
    }

    const data = await getDashboardData(mode);

    res.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dashboard/mode
 * Updates default mode and broadcasts update to all WebSocket clients
 */
app.post('/api/dashboard/mode', async (req, res, next) => {
  try {
    const { mode } = req.body;

    if (!mode) {
      return res.status(400).json({
        error: 'Missing mode',
        message: 'Request body must include "mode" field'
      });
    }

    if (!isValidMode(mode)) {
      return res.status(400).json({
        error: 'Invalid mode',
        message: `Mode '${mode}' is not supported`,
        validModes: ['personal', 'guest', 'briefing', 'weather', 'art']
      });
    }

    // Update scheduler mode
    scheduler.setMode(mode);

    // Get fresh data with new mode
    const data = await getDashboardData(mode);

    // Broadcast to all WebSocket clients
    wsHandler.sendDashboardUpdate(data);

    res.json({
      success: true,
      message: `Mode updated to '${mode}'`,
      mode: mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/refresh
 * Triggers immediate data refresh and returns refreshed data
 */
app.get('/api/dashboard/refresh', async (req, res, next) => {
  try {
    const mode = req.query.mode || scheduler.getMode();

    // Trigger scheduler refresh (this will broadcast to WS clients)
    await scheduler.triggerRefresh();

    // Get fresh data for this request
    const data = await getDashboardData(mode);

    res.json({
      success: true,
      message: 'Dashboard data refreshed',
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handling middleware - must be last
app.use((err, req, res, next) => {
  // Log error details
  console.error('❌ API Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send clean JSON error response
  res.status(statusCode).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Initialize WebSocket handler
wsHandler.initialize(wss);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 HTTP Server running on port ${PORT}`);
  console.log(`🔌 WebSocket Server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);

  // Start scheduler after server is ready
  scheduler.startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  scheduler.stopScheduler();
  wsHandler.shutdown();
  server.close(() => {
    console.log('HTTP server closed');
  });
});
