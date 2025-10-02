# Development Guide

This document provides technical details for developers working on the TV Dashboard API API.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│              (React Dashboard, Mobile Apps, etc.)            │
└────────────────┬──────────────────────┬─────────────────────┘
                 │                      │
          HTTP REST API          WebSocket Connection
                 │                      │
┌────────────────┴──────────────────────┴─────────────────────┐
│                      Express Server                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Routes Layer                                          │ │
│  │  - /health                                             │ │
│  │  - /api/dashboard/data                                 │ │
│  │  - /api/dashboard/mode                                 │ │
│  │  - /api/dashboard/refresh                              │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│  ┌────────────────────┴───────────────────────────────────┐ │
│  │  WebSocket Handler (Singleton)                         │ │
│  │  - Connection management                               │ │
│  │  - Broadcast mechanism                                 │ │
│  │  - Ping/pong health checks                             │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│  ┌────────────────────┴───────────────────────────────────┐ │
│  │  Scheduler (Cron)                                      │ │
│  │  - Periodic data refresh (30s default)                 │ │
│  │  - Mode management                                     │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│  ┌────────────────────┴───────────────────────────────────┐ │
│  │  Main Aggregator                                       │ │
│  │  - Coordinates all data sources                        │ │
│  │  - Applies mode filtering                              │ │
│  └────┬───────┬───────┬───────────────────────────────────┘ │
│       │       │       │                                      │
│  ┌────┴────┐ │ ┌─────┴────┐ ┌────────────┐                 │
│  │ Weather │ │ │ Calendar │ │   Todoist  │                 │
│  │Aggreg.  │ │ │ Aggreg.  │ │  Aggreg.   │                 │
│  │         │ │ │          │ │            │                 │
│  │10-min   │ │ │No cache  │ │ No cache   │                 │
│  │cache    │ │ │          │ │            │                 │
│  └────┬────┘ │ └─────┬────┘ └─────┬──────┘                 │
│       │      │       │            │                         │
│  ┌────┴──────┴───────┴────────────┴──────┐                 │
│  │          API Clients                   │                 │
│  │  - weatherClient.js                    │                 │
│  │  - calendarClient.js                   │                 │
│  │  - todoistClient.js                    │                 │
│  └────────────────┬───────────────────────┘                 │
└───────────────────┼─────────────────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────────────────┐
│              External APIs                                   │
│  - OpenWeatherMap API                                       │
│  - Google Calendar API                                      │
│  - Todoist REST API v2                                      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Initial Connection Flow

```
Client                Server              Scheduler           Aggregators
  │                     │                     │                    │
  ├─ WebSocket Connect ─>                    │                    │
  │                     │                     │                    │
  │<── Connection ACK ──┤                     │                    │
  │    (clientId)       │                     │                    │
  │                     │                     │                    │
  │                     ├─ Start Scheduler ──>                     │
  │                     │                     │                    │
  │                     │                     ├─ getDashboardData ─>
  │                     │                     │                    │
  │                     │                     │<── Aggregated Data ┤
  │                     │                     │                    │
  │<── dashboard:update ┼<── broadcast() ─────┤                    │
  │                     │                     │                    │
```

### 2. Scheduled Refresh Flow

```
Scheduler                Aggregators              API Clients
    │                        │                         │
    ├─ Timer Tick (30s) ────>                         │
    │                        │                         │
    ├─ getDashboardData() ──>                         │
    │                        │                         │
    │                        ├─ getWeather() ─────────>
    │                        │    (check cache first)  │
    │                        │                         │
    │                        │<── Weather Data ────────┤
    │                        │                         │
    │                        ├─ getCalendarData() ────>
    │                        │                         │
    │                        │<── Calendar Data ───────┤
    │                        │                         │
    │                        ├─ getTodos() ───────────>
    │                        │                         │
    │                        │<── Todo Data ───────────┤
    │                        │                         │
    │<── Aggregated Data ────┤                         │
    │                        │                         │
    ├─ Apply Mode Filter ───>                         │
    │                        │                         │
    ├─ Broadcast to WS ─────> wsHandler.sendDashboardUpdate()
    │                        │                         │
```

### 3. Manual Mode Change Flow

```
Client              API Route          Scheduler         WebSocket
  │                    │                   │                │
  ├─ POST /api/        │                   │                │
  │  dashboard/mode    │                   │                │
  │                    │                   │                │
  │                    ├─ setMode() ──────>                 │
  │                    │                   │                │
  │                    ├─ getDashboard ───>                 │
  │                    │   Data()          │                │
  │                    │                   │                │
  │                    │<── Fresh Data ────┤                │
  │                    │                   │                │
  │                    ├─ Broadcast ───────┼───────────────>
  │                    │                   │  All Clients   │
  │                    │                   │                │
  │<── Success ────────┤                   │                │
  │                    │                   │                │
```

## How to Add a New Data Aggregator

Follow these steps to integrate a new data source:

### Step 1: Create the API Client

Create `src/clients/yourServiceClient.js`:

```javascript
const axios = require('axios');

/**
 * Fetch data from Your Service API
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<Object>} Raw API response
 */
async function getData(apiKey) {
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  try {
    const response = await axios.get('https://api.yourservice.com/endpoint', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API error: ${error.response.status}`);
    } else if (error.request) {
      throw new Error('API timeout or network error');
    } else {
      throw new Error(`Request failed: ${error.message}`);
    }
  }
}

/**
 * Parse API response into simplified format
 * @param {Object} rawData - Raw API response
 * @returns {Object} Parsed data
 */
function parseData(rawData) {
  return {
    field1: rawData.some_field,
    field2: rawData.another_field
  };
}

module.exports = {
  getData,
  parseData
};
```

### Step 2: Create the Aggregator

Create `src/aggregators/yourServiceAggregator.js`:

```javascript
const { getData, parseData } = require('../clients/yourServiceClient');

// Optional: Add caching
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
let cachedData = null;
let cacheTimestamp = null;

/**
 * Get data from Your Service with caching
 * @returns {Promise<Object|null>} Processed data or null on failure
 */
async function getYourServiceData() {
  const apiKey = process.env.YOUR_SERVICE_API_KEY;

  // Return null if not configured
  if (!apiKey) {
    console.warn('⚠️  Your Service not configured');
    return null;
  }

  // Check cache
  if (cachedData && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('📦 Returning cached data');
    return cachedData;
  }

  try {
    console.log('🔄 Fetching fresh data from Your Service...');
    const rawData = await getData(apiKey);
    const parsedData = parseData(rawData);

    // Update cache
    cachedData = parsedData;
    cacheTimestamp = Date.now();

    console.log('✅ Data fetched successfully');
    return parsedData;

  } catch (error) {
    console.error('❌ Failed to fetch data:', error.message);

    // Return cached data if available
    if (cachedData) {
      console.log('📦 Returning stale cached data');
      return cachedData;
    }

    return null;
  }
}

module.exports = {
  getYourServiceData
};
```

### Step 3: Integrate into Main Aggregator

Update `src/aggregators/index.js`:

```javascript
const { getYourServiceData } = require('./yourServiceAggregator');

async function getDashboardData(mode = 'personal') {
  try {
    const fullData = {
      mode: mode,
      weather: await getWeatherData(),
      nextEvent: await getNextEvent(),
      todos: await getTodos(),
      agenda: await getAgenda(),
      localEvents: await getLocalEvents(),
      llmMessage: await getLLMMessage(),
      yourServiceData: await getYourServiceData() // Add your new data
    };

    const filteredData = filterByMode(mode, fullData);
    return filteredData;
  } catch (error) {
    console.error('Error aggregating dashboard data:', error);
    throw error;
  }
}
```

### Step 4: Update Mode Manager (Optional)

If your data should be filtered by mode, update `src/utils/modeManager.js`:

```javascript
function filterByMode(mode, data) {
  switch (mode) {
    case 'personal':
      return data; // Include everything

    case 'guest':
      return {
        mode: 'guest',
        weather: data.weather,
        localEvents: data.localEvents,
        yourServiceData: data.yourServiceData, // Include if public
        guestQuote: getRandomQuote()
      };

    // ... other modes
  }
}
```

### Step 5: Add Environment Variables

Update `.env.example`:

```bash
# Your Service Configuration
YOUR_SERVICE_API_KEY=
```

### Step 6: Test Your Integration

```bash
# 1. Add your API key to .env
echo "YOUR_SERVICE_API_KEY=your_actual_key" >> .env

# 2. Restart the server
npm run dev

# 3. Check logs for integration status
# Look for ✅ or ⚠️ messages

# 4. Test via API
curl "http://localhost:3001/api/dashboard/data?mode=personal"
```

## API Key Testing

### Test OpenWeatherMap

```bash
# Via the API
curl "http://localhost:3001/api/dashboard/data?mode=weather"

# Direct test (replace YOUR_KEY and coordinates)
curl "https://api.openweathermap.org/data/2.5/weather?lat=40.7128&lon=-74.0060&appid=YOUR_KEY&units=imperial"
```

**Expected success:** JSON with `main.temp`, `weather[0].main`, etc.
**Common errors:**
- `401 Unauthorized` - Invalid API key
- `429 Too Many Requests` - Rate limit exceeded

### Test Google Calendar

```bash
# Via the API
curl "http://localhost:3001/api/dashboard/data?mode=briefing"

# Check server logs for:
# ✅ Google Calendar client initialized
# ✅ Found X event(s) for today
```

**Common errors:**
- `Calendar client not initialized` - Check `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
- `Calendar not found` - Verify `GOOGLE_CALENDAR_ID`
- `Calendar access denied` - Service account not invited to calendar

### Test Todoist

```bash
# Via the API
curl "http://localhost:3001/api/dashboard/data?mode=personal"

# Direct test
curl -X GET "https://api.todoist.com/rest/v2/tasks" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected success:** JSON array of tasks
**Common errors:**
- `401 Unauthorized` - Invalid API token
- `403 Forbidden` - Token doesn't have required permissions

## Troubleshooting Common Issues

### WebSocket Connection Drops

**Symptom:** Clients disconnect after 30-60 seconds

**Solution:**
- Ensure client responds to ping frames with pong
- Check for reverse proxy timeout settings
- Verify no firewall is blocking WebSocket traffic

### High Memory Usage

**Symptom:** Memory grows over time

**Possible causes:**
- Cache not being cleared (check aggregator cache logic)
- WebSocket clients not being removed on disconnect
- Large API responses being stored

**Solution:**
- Monitor `wsHandler.getActiveConnectionCount()`
- Add cache size limits
- Implement response pagination for large datasets

### Stale Data

**Symptom:** Dashboard shows old data despite refresh

**Check:**
1. Scheduler is running: Look for `⏰ Starting scheduler` in logs
2. Cache duration: Weather uses 10-min cache
3. API rate limits: You may be hitting rate limits

**Solution:**
- Trigger manual refresh: `GET /api/dashboard/refresh`
- Clear cache (restart server)
- Check API quotas in provider dashboards

### Missing Calendar Events

**Symptom:** Calendar shows no events or wrong calendar

**Check:**
1. Service account email invited to correct calendar
2. `GOOGLE_CALENDAR_ID` matches target calendar
3. Calendar events have proper start times (not all-day with no time)

**Solution:**
- Use `primary` for main calendar
- Find calendar ID in Google Calendar Settings > Integrate calendar
- Check service account has "See all event details" permission

### Todos Not Appearing

**Symptom:** Empty todo list despite having tasks

**Check:**
1. Tasks have due dates (filter shows only dated tasks)
2. Tasks are not completed
3. Due date is today or earlier

**Solution:**
- Add due dates to Todoist tasks
- Verify `isDueTodayOrOverdue()` logic in `todoAggregator.js`
- Check logs for API errors

### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=3002
```

## Code Style Guidelines

- Use **async/await** over promises
- Always handle errors with try/catch
- Log important events with emoji prefixes (✅ ❌ ⚠️ 📦 🔄)
- Return `null` for missing data, not mock data
- Use descriptive variable names
- Add JSDoc comments to all exported functions
- Keep functions focused and single-purpose

## Performance Considerations

- **Weather API**: 10-minute cache, ~6 calls/hour
- **Calendar API**: No cache, called every refresh (30s)
- **Todoist API**: No cache, called every refresh (30s)

To reduce API calls:
- Increase `REFRESH_INTERVAL` in production
- Add caching to calendar/todo aggregators
- Use webhooks for event-driven updates (future enhancement)

## Future Enhancements

- [ ] Add database for persistent caching
- [ ] Implement webhook receivers for instant updates
- [ ] Add authentication for API endpoints
- [ ] Create admin dashboard for configuration
- [ ] Add metrics/monitoring (Prometheus)
- [ ] Support multiple simultaneous modes per client
- [ ] Add LLM integration for dynamic messaging
- [ ] Implement local events aggregator
