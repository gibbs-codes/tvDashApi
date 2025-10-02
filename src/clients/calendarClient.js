const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

let calendarClient = null;

/**
 * Initialize Google Calendar client with service account
 * @returns {Object|null} Google Calendar client or null if not configured
 */
function initializeCalendarClient() {
  if (calendarClient) {
    return calendarClient;
  }

  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  if (!keyPath) {
    console.warn('⚠️  Google Calendar not configured: GOOGLE_SERVICE_ACCOUNT_KEY_PATH not set');
    return null;
  }

  // Resolve to absolute path (handles both relative and absolute paths)
  const absoluteKeyPath = path.isAbsolute(keyPath)
    ? keyPath
    : path.resolve(process.cwd(), keyPath);

  console.log(`🔍 Looking for service account key at: ${absoluteKeyPath}`);

  if (!fs.existsSync(absoluteKeyPath)) {
    console.warn(`⚠️  Google Calendar service account key not found at: ${absoluteKeyPath}`);
    return null;
  }

  try {
    // Read and parse JSON file instead of using require()
    const keyFileContent = fs.readFileSync(absoluteKeyPath, 'utf8');
    const keyFile = JSON.parse(keyFileContent);

    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    });

    calendarClient = google.calendar({ version: 'v3', auth });
    console.log('✅ Google Calendar client initialized');
    return calendarClient;
  } catch (error) {
    console.error('❌ Failed to initialize Google Calendar client:', error.message);
    console.error('   Error details:', error);
    return null;
  }
}

/**
 * Fetch events from Google Calendar for today
 * @param {string} calendarId - Google Calendar ID
 * @returns {Promise<Array>} Array of calendar events
 */
async function getTodaysEvents(calendarId) {
  const calendar = initializeCalendarClient();

  if (!calendar) {
    throw new Error('Calendar client not initialized');
  }

  if (!calendarId) {
    throw new Error('Calendar ID not configured');
  }

  try {
    // Get start and end of today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    });

    return response.data.items || [];
  } catch (error) {
    if (error.code === 404) {
      throw new Error(`Calendar not found: ${calendarId}`);
    } else if (error.code === 403) {
      throw new Error('Calendar access denied - check service account permissions');
    } else {
      throw new Error(`Calendar API error: ${error.message}`);
    }
  }
}

/**
 * Fetch upcoming events from Google Calendar
 * @param {string} calendarId - Google Calendar ID
 * @param {number} maxResults - Maximum number of events to return
 * @returns {Promise<Array>} Array of upcoming calendar events
 */
async function getUpcomingEvents(calendarId, maxResults = 10) {
  const calendar = initializeCalendarClient();

  if (!calendar) {
    throw new Error('Calendar client not initialized');
  }

  if (!calendarId) {
    throw new Error('Calendar ID not configured');
  }

  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: maxResults
    });

    return response.data.items || [];
  } catch (error) {
    if (error.code === 404) {
      throw new Error(`Calendar not found: ${calendarId}`);
    } else if (error.code === 403) {
      throw new Error('Calendar access denied - check service account permissions');
    } else {
      throw new Error(`Calendar API error: ${error.message}`);
    }
  }
}

/**
 * Parse Google Calendar event into simplified format
 * @param {Object} event - Google Calendar event object
 * @returns {Object} Parsed event data
 */
function parseCalendarEvent(event) {
  const start = event.start.dateTime || event.start.date;
  const end = event.end.dateTime || event.end.date;
  const startTime = new Date(start);

  return {
    id: event.id,
    title: event.summary || '(No title)',
    description: event.description || '',
    location: event.location || '',
    startTime: startTime,
    endTime: new Date(end),
    isAllDay: !event.start.dateTime,
    attendees: event.attendees || [],
    htmlLink: event.htmlLink
  };
}

module.exports = {
  initializeCalendarClient,
  getTodaysEvents,
  getUpcomingEvents,
  parseCalendarEvent
};
