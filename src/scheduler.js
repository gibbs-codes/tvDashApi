const cron = require('node-cron');
const wsHandler = require('./wsHandler');
const { getDashboardData } = require('./aggregators');

// Get refresh interval from env or default to 30 seconds
const REFRESH_INTERVAL = parseInt(process.env.REFRESH_INTERVAL) || 30;

// Convert seconds to cron expression
// For intervals < 60, use "*/N * * * * *" (every N seconds)
// For intervals >= 60, use minutes
const getCronExpression = (seconds) => {
  if (seconds < 60) {
    return `*/${seconds} * * * * *`;
  }
  const minutes = Math.floor(seconds / 60);
  return `*/${minutes} * * * *`;
};

let scheduledTask = null;
let currentMode = 'personal'; // Default mode

/**
 * Main data refresh function
 * Aggregates data and broadcasts to all connected clients
 */
async function refreshDashboardData() {
  try {
    console.log(`🔄 Refreshing dashboard data (mode: ${currentMode})...`);

    // Get aggregated data
    const dashboardData = await getDashboardData(currentMode);

    // Broadcast to all connected clients
    wsHandler.sendDashboardUpdate(dashboardData);

    console.log(`✅ Dashboard data refreshed and broadcasted to ${wsHandler.getActiveConnectionCount()} client(s)`);
  } catch (error) {
    console.error('❌ Error refreshing dashboard data:', error.message);

    // Send error notification to clients
    wsHandler.broadcast({
      event: 'error',
      data: {
        message: 'Failed to refresh dashboard data',
        error: error.message
      }
    });
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  const cronExpression = getCronExpression(REFRESH_INTERVAL);

  console.log(`⏰ Starting scheduler with ${REFRESH_INTERVAL}s interval (cron: ${cronExpression})`);

  scheduledTask = cron.schedule(cronExpression, refreshDashboardData, {
    scheduled: true,
    timezone: process.env.TZ || 'America/New_York'
  });

  // Immediately fetch data on startup
  refreshDashboardData().catch(err => {
    console.error('Error during initial data fetch:', err);
  });

  console.log('✅ Scheduler started');
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('🛑 Scheduler stopped');
  }
}

/**
 * Update dashboard mode
 * @param {string} mode - New mode to set
 */
function setMode(mode) {
  console.log(`🔧 Changing dashboard mode: ${currentMode} → ${mode}`);
  currentMode = mode;

  // Immediately refresh with new mode
  refreshDashboardData().catch(err => {
    console.error('Error refreshing data after mode change:', err);
  });
}

/**
 * Get current mode
 * @returns {string} Current dashboard mode
 */
function getMode() {
  return currentMode;
}

/**
 * Manually trigger a data refresh
 */
function triggerRefresh() {
  console.log('🔄 Manual refresh triggered');
  return refreshDashboardData();
}

module.exports = {
  startScheduler,
  stopScheduler,
  setMode,
  getMode,
  triggerRefresh,
  refreshDashboardData
};
