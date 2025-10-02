# Living Art BFF API

Backend-for-Frontend (BFF) API for the React TV dashboard. This API aggregates data from multiple sources (weather, calendar, todos, local events) and pushes real-time updates to connected clients via WebSocket.

## Features

- **Real-time WebSocket updates** with automatic data refresh every 30 seconds
- **Multi-source data aggregation** from OpenWeatherMap, Google Calendar, and Todoist
- **Multiple dashboard modes** (personal, guest, briefing, weather, art)
- **RESTful API endpoints** for manual data fetching and mode switching
- **Intelligent caching** to minimize API calls
- **Health monitoring** with ping/pong WebSocket heartbeats
- **Graceful error handling** with fallbacks

## Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd living-art-bff
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys (see Setup Guide below)

# 3. Start server
npm run dev
```

Server will start on http://localhost:3001 with WebSocket on ws://localhost:3001

## Project Structure

```
living-art-bff/
├── src/
│   ├── server.js              # Main Express + WebSocket server
│   ├── wsHandler.js           # WebSocket connection manager (singleton)
│   ├── scheduler.js           # Cron-based data refresh scheduler
│   ├── aggregators/
│   │   ├── index.js           # Main aggregator coordinator
│   │   ├── weatherAggregator.js    # Weather data with 10-min cache
│   │   ├── calendarAggregator.js   # Google Calendar integration
│   │   └── todoAggregator.js       # Todoist task filtering
│   ├── clients/
│   │   ├── weatherClient.js        # OpenWeatherMap API client
│   │   ├── calendarClient.js       # Google Calendar API client
│   │   └── todoistClient.js        # Todoist REST API v2 client
│   └── utils/
│       └── modeManager.js          # Mode-based data filtering
├── .env.example               # Environment template with defaults
├── .gitignore
├── package.json
└── README.md
```

## Setup Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Acquire API Keys

#### OpenWeatherMap API Key

1. Visit https://openweathermap.org/api
2. Click **"Get API Key"** or **"Sign Up"**
3. Create a free account (no credit card required)
4. Navigate to **API Keys** section in your account
5. Copy your API key
6. Add to `.env` as `WEATHER_API_KEY=your_key_here`

**Free tier limits:** 1,000 calls/day, 60 calls/minute

#### Google Calendar Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**:
   - Navigate to **APIs & Services > Library**
   - Search for "Google Calendar API"
   - Click **Enable**
4. Create a Service Account:
   - Go to **APIs & Services > Credentials**
   - Click **Create Credentials > Service Account**
   - Fill in service account details, click **Create**
   - Skip optional role assignments, click **Done**
5. Create and download JSON key:
   - Click on the newly created service account
   - Go to **Keys** tab
   - Click **Add Key > Create new key**
   - Select **JSON** format
   - Download the file and save as `service-account-key.json` in project root
6. Share your calendar with the service account:
   - Open Google Calendar
   - Click the ⚙️ icon next to your calendar
   - Select **Settings and sharing**
   - Under **Share with specific people**, add the service account email (found in the JSON file as `client_email`)
   - Give it **"See all event details"** permission
7. Add to `.env`:
   ```
   GOOGLE_CALENDAR_ID=primary
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json
   ```

**Note:** Use `primary` for your main calendar, or find specific calendar IDs in Calendar Settings.

#### Todoist API Token

1. Log in to [Todoist](https://todoist.com)
2. Click your profile picture → **Settings**
3. Navigate to **Integrations** tab
4. Scroll to **Developer** section
5. Copy your **API token**
6. Add to `.env` as `TODOIST_API_TOKEN=your_token_here`

**Note:** Keep your token secret - it provides full access to your Todoist account.

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Scheduler Configuration
REFRESH_INTERVAL=30        # Data refresh interval in seconds
TZ=America/New_York        # Your timezone

# Weather API Configuration
WEATHER_API_KEY=your_openweather_key
WEATHER_LAT=40.7128        # Your latitude
WEATHER_LON=-74.0060       # Your longitude

# Google Calendar Configuration
GOOGLE_CALENDAR_ID=primary
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json

# Todoist Configuration
TODOIST_API_TOKEN=your_todoist_token
```

### 4. Start the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

## API Endpoints

### Health Check

**`GET /health`**

Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T12:00:00.000Z",
  "uptime": 123.456
}
```

### Dashboard Data

**`GET /api/dashboard/data?mode=personal`**

Fetch current dashboard data for specified mode.

**Query Parameters:**
- `mode` (optional): Dashboard mode - `personal`, `guest`, `briefing`, `weather`, or `art`. Defaults to `personal`.

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "personal",
    "weather": { "temp": 72, "condition": "Partly Cloudy", "icon": "02d" },
    "nextEvent": { "title": "Team Meeting", "time": "2:00 PM", "minutesUntil": 45 },
    "todos": [{ "text": "Review PRs", "urgent": true, "done": false }],
    "agenda": [{ "time": "2:00 PM", "title": "Team Meeting", "done": false }],
    "localEvents": [],
    "llmMessage": { "active": false, "message": "", "urgency": "none" }
  },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

### Change Dashboard Mode

**`POST /api/dashboard/mode`**

Update the default dashboard mode and broadcast to all WebSocket clients.

**Request Body:**
```json
{
  "mode": "briefing"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mode updated to 'briefing'",
  "mode": "briefing",
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

### Trigger Manual Refresh

**`GET /api/dashboard/refresh?mode=personal`**

Immediately refresh dashboard data and return updated values.

**Query Parameters:**
- `mode` (optional): Mode for response data. Defaults to current scheduler mode.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard data refreshed",
  "data": { /* dashboard data */ },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

## WebSocket Events

### Connection

Connect to `ws://localhost:3001`

Upon connection, server sends:
```json
{
  "event": "connection",
  "data": {
    "message": "Connected to Living Art BFF",
    "clientId": "client_1234567890_abc123"
  },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

### Dashboard Updates

Server broadcasts dashboard updates every 30 seconds (configurable):

```json
{
  "event": "dashboard:update",
  "data": {
    "mode": "personal",
    "weather": { /* weather data */ },
    "nextEvent": { /* next calendar event */ },
    "todos": [ /* todo items */ ],
    "agenda": [ /* agenda items */ ],
    "localEvents": [ /* local events */ ],
    "llmMessage": { /* LLM message */ }
  },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

### Ping/Pong Health Check

Server automatically sends ping frames every 30 seconds. Clients that don't respond with pong are disconnected.

### Error Events

```json
{
  "event": "error",
  "data": {
    "message": "Failed to refresh dashboard data",
    "error": "API timeout"
  },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

## Dashboard Modes

### Personal Mode (`personal`)
Full dashboard with all personal data:
- Weather
- Next calendar event
- Todo list
- Full agenda
- Local events
- LLM messages

### Guest Mode (`guest`)
Public-facing display without personal data:
- Weather
- Local events
- Inspiring quote

### Briefing Mode (`briefing`)
Condensed summary view:
- Weather
- Summary with event/todo counts
- Next 3 upcoming agenda items

### Weather Mode (`weather`)
Weather-focused display:
- Detailed weather
- Local events

### Art Mode (`art`)
Aesthetic display for art installations:
- Weather
- Art/music events only
- Inspiring quote

## Development

### Adding a New Data Source

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed instructions.

### Testing Individual Integrations

```bash
# Test weather API
curl "http://localhost:3001/api/dashboard/data?mode=weather"

# Test calendar (check logs for connection status)
curl "http://localhost:3001/api/dashboard/data?mode=briefing"

# Test todos
curl "http://localhost:3001/api/dashboard/data?mode=personal"
```

### Debugging

Enable detailed logging by setting `NODE_ENV=development` in `.env`.

Check server logs for integration status:
- ✅ Successful API connections
- ⚠️ Missing API keys or credentials
- ❌ API failures with error details

## Dependencies

- **express** - Web framework
- **ws** - WebSocket server
- **cors** - CORS middleware
- **dotenv** - Environment variable management
- **axios** - HTTP client for external APIs
- **googleapis** - Google Calendar API client
- **node-cron** - Scheduled task execution

## License

ISC

## Support

For issues or questions, please refer to [DEVELOPMENT.md](./DEVELOPMENT.md) for troubleshooting guidance.
