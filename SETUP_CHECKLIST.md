# Setup Checklist

Follow this checklist to get your TV Dashboard API API up and running.

## Prerequisites

- [ ] Node.js installed (v18 or higher recommended)
- [ ] npm installed
- [ ] Git installed
- [ ] Text editor (VS Code, Sublime, etc.)

## Repository Setup

- [ ] Clone the repository
  ```bash
  git clone <repository-url>
  cd tvDashApi
  ```

- [ ] Install dependencies
  ```bash
  npm install
  ```

## API Keys & Credentials

### OpenWeatherMap

- [ ] Visit https://openweathermap.org/api
- [ ] Create free account (no credit card required)
- [ ] Navigate to API Keys section
- [ ] Copy your API key
- [ ] Save for later: `WEATHER_API_KEY=_______________`

### Google Calendar

- [ ] Go to https://console.cloud.google.com
- [ ] Create new project (or select existing)
- [ ] Enable Google Calendar API:
  - [ ] Navigate to APIs & Services > Library
  - [ ] Search "Google Calendar API"
  - [ ] Click Enable
- [ ] Create Service Account:
  - [ ] Go to APIs & Services > Credentials
  - [ ] Click Create Credentials > Service Account
  - [ ] Fill in name, click Create
  - [ ] Skip role assignments, click Done
- [ ] Create JSON key:
  - [ ] Click on service account
  - [ ] Go to Keys tab
  - [ ] Add Key > Create new key > JSON
  - [ ] Download file
- [ ] Save JSON file as `service-account-key.json` in project root
- [ ] Share calendar with service account:
  - [ ] Open Google Calendar
  - [ ] Click ⚙️ next to your calendar
  - [ ] Settings and sharing
  - [ ] Share with specific people
  - [ ] Add service account email (from JSON file: `client_email`)
  - [ ] Give "See all event details" permission
- [ ] Note calendar ID (usually "primary" for main calendar)

### Todoist

- [ ] Log in to https://todoist.com
- [ ] Click profile picture → Settings
- [ ] Navigate to Integrations tab
- [ ] Scroll to Developer section
- [ ] Copy your API token
- [ ] Save for later: `TODOIST_API_TOKEN=_______________`

## Environment Configuration

- [ ] Copy environment template
  ```bash
  cp .env.example .env
  ```

- [ ] Open `.env` in your text editor

- [ ] Fill in required values:

  **Server Configuration:**
  - [ ] `PORT=3001` (or your preferred port)
  - [ ] `NODE_ENV=development`

  **CORS Configuration:**
  - [ ] `CORS_ORIGIN=http://localhost:3000` (your React app URL)

  **Scheduler Configuration:**
  - [ ] `REFRESH_INTERVAL=30` (seconds between updates)
  - [ ] `TZ=America/New_York` (your timezone)

  **Weather API:**
  - [ ] `WEATHER_API_KEY=` (paste your OpenWeatherMap key)
  - [ ] `WEATHER_LAT=40.7128` (your latitude)
  - [ ] `WEATHER_LON=-74.0060` (your longitude)

  **Google Calendar:**
  - [ ] `GOOGLE_CALENDAR_ID=primary`
  - [ ] `GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json`

  **Todoist:**
  - [ ] `TODOIST_API_TOKEN=` (paste your Todoist token)

## Verification

### Find Your Coordinates

- [ ] Visit https://www.latlong.net
- [ ] Search for your location
- [ ] Copy latitude and longitude to `.env`

### Verify Google Calendar Service Account Email

- [ ] Open `service-account-key.json`
- [ ] Find `client_email` field
- [ ] Verify this email is invited to your calendar with proper permissions

### Test Environment Variables

- [ ] Ensure `.env` file is in project root
- [ ] Ensure `.env` is listed in `.gitignore` (it should be)
- [ ] No trailing spaces in environment variable values
- [ ] No quotes around values (unless they contain spaces)

## Testing Individual Integrations

### Test Weather

- [ ] Start server: `npm run dev`
- [ ] Check logs for: `✅ Weather data updated`
- [ ] Test API:
  ```bash
  curl "http://localhost:3001/api/dashboard/data?mode=weather"
  ```
- [ ] Verify response contains `weather` object with `temp` and `condition`

**If it fails:**
- [ ] Check API key is correct
- [ ] Verify coordinates are valid numbers
- [ ] Check OpenWeatherMap dashboard for API quota

### Test Google Calendar

- [ ] Check logs for: `✅ Google Calendar client initialized`
- [ ] Check logs for: `✅ Found X event(s) for today`
- [ ] Test API:
  ```bash
  curl "http://localhost:3001/api/dashboard/data?mode=briefing"
  ```
- [ ] Verify response contains `nextEvent` and `agenda`

**If it fails:**
- [ ] Verify service account JSON file exists at specified path
- [ ] Check service account email is invited to calendar
- [ ] Verify calendar ID is correct (try "primary" first)
- [ ] Ensure Google Calendar API is enabled in Cloud Console

### Test Todoist

- [ ] Check logs for: `✅ Found X task(s) due today or overdue`
- [ ] Test API:
  ```bash
  curl "http://localhost:3001/api/dashboard/data?mode=personal"
  ```
- [ ] Verify response contains `todos` array

**If it fails:**
- [ ] Verify API token is correct
- [ ] Check tasks have due dates set
- [ ] Ensure tasks are not completed
- [ ] Visit Todoist Settings > Integrations to regenerate token if needed

### Test WebSocket

- [ ] Use WebSocket client (wscat, browser console, or Postman)
- [ ] Connect to `ws://localhost:3001`
- [ ] Verify connection message received
- [ ] Wait 30 seconds for dashboard update
- [ ] Verify `dashboard:update` event received

**Install wscat for testing:**
```bash
npm install -g wscat
wscat -c ws://localhost:3001
```

## Start Server

- [ ] Development mode (with auto-reload):
  ```bash
  npm run dev
  ```

- [ ] Verify server starts successfully:
  - [ ] See: `🚀 HTTP Server running on port 3001`
  - [ ] See: `🔌 WebSocket Server running on port 3001`
  - [ ] See: `⏰ Starting scheduler with 30s interval`

- [ ] Test health endpoint:
  ```bash
  curl http://localhost:3001/health
  ```

- [ ] Verify response: `{"status":"healthy", ...}`

## Final Verification

- [ ] No error messages in console
- [ ] All integrations show ✅ success messages
- [ ] Dashboard data endpoint returns complete data
- [ ] WebSocket connections successful
- [ ] Data refreshes every 30 seconds (or your configured interval)

## Common Issues

### "Calendar client not initialized"
- ⚠️ Check `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` is correct
- ⚠️ Verify JSON file exists and is valid JSON

### "Weather API key not configured"
- ⚠️ Check `WEATHER_API_KEY` is set in `.env`
- ⚠️ No extra spaces before/after the key

### "Todoist authentication failed"
- ⚠️ Regenerate token in Todoist Settings
- ⚠️ Ensure no extra characters in token

### "Port already in use"
- ⚠️ Change `PORT` in `.env` to different number
- ⚠️ Or kill process using the port:
  ```bash
  lsof -i :3001
  kill -9 <PID>
  ```

### Empty calendar events
- ⚠️ Check you have events in calendar for today
- ⚠️ Verify service account has proper permissions
- ⚠️ Try using calendar ID instead of "primary"

### Empty todos
- ⚠️ Add tasks with due dates to Todoist
- ⚠️ Ensure tasks are not marked complete
- ⚠️ Check tasks are due today or earlier

## Next Steps

- [ ] Review [README.md](./README.md) for API documentation
- [ ] Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development guide
- [ ] Connect your React dashboard to `ws://localhost:3001`
- [ ] Test mode switching with POST `/api/dashboard/mode`
- [ ] Customize refresh interval if needed
- [ ] Add your own data aggregators (see DEVELOPMENT.md)

## Optional Enhancements

- [ ] Set up production deployment
- [ ] Add SSL/TLS certificates for HTTPS
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring/logging
- [ ] Add database for caching
- [ ] Implement authentication

---

**Congratulations!** 🎉 Your TV Dashboard API API is now set up and running!
