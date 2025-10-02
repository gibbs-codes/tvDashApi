# API Endpoints Reference

Quick reference for connecting your TV Dashboard UI to the API.

## TL;DR - Simplest Integration

```javascript
// 1. Fetch dashboard data (API maintains the mode internally)
const response = await fetch('http://localhost:3006/api/dashboard/data');
const { data, currentMode } = await response.json();

// 2. Change mode (optional)
await fetch('http://localhost:3006/api/dashboard/mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode: 'guest' })
});

// 3. Poll every 30 seconds
setInterval(fetchDashboard, 30000);
```

**That's it!** The API remembers what mode it's in, so your UI doesn't need to track state.

---

## Base URL

**Local Development:** `http://localhost:3006`
**Production:** `http://your-mac-mini-ip:3006`

## WebSocket Connection

```javascript
const ws = new WebSocket('ws://localhost:3006');

ws.onopen = () => {
  console.log('Connected to TV Dashboard API');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);

  // Handle different event types
  switch (message.event) {
    case 'connection':
      console.log('Client ID:', message.data.clientId);
      break;
    case 'dashboard:update':
      // Update UI with dashboard data
      updateDashboard(message.data);
      break;
    case 'error':
      console.error('Error:', message.data.message);
      break;
  }
};
```

### WebSocket Events

#### Connection Event
Sent immediately upon connection.

```json
{
  "event": "connection",
  "data": {
    "message": "Connected to TV Dashboard API",
    "clientId": "client_1234567890_abc123"
  },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

#### Dashboard Update Event
Sent every 30 seconds (configurable) with latest data.

```json
{
  "event": "dashboard:update",
  "data": {
    "mode": "personal",
    "weather": {
      "temp": 72,
      "condition": "Partly Cloudy",
      "icon": "02d",
      "feelsLike": 70,
      "humidity": 55,
      "windSpeed": 8,
      "high": 78,
      "low": 65
    },
    "nextEvent": {
      "title": "Team Meeting",
      "time": "2:00 PM",
      "minutesUntil": 45,
      "location": "Office",
      "startTime": "2025-10-02T14:00:00.000Z"
    },
    "todos": [
      {
        "text": "Review PRs",
        "urgent": true,
        "done": false,
        "id": "123456",
        "dueDate": "2025-10-02T16:00:00.000Z",
        "priority": 4,
        "labels": ["work"]
      }
    ],
    "agenda": [
      {
        "time": "2:00 PM",
        "title": "Team Meeting",
        "done": false,
        "location": "Office",
        "isAllDay": false
      }
    ],
    "localEvents": [],
    "llmMessage": {
      "active": false,
      "message": "",
      "urgency": "none"
    }
  },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

## REST API Endpoints

### Health Check

**Endpoint:** `GET /health`

**Use case:** Check if API is running

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T12:00:00.000Z",
  "uptime": 123.456
}
```

**Example:**
```javascript
fetch('http://localhost:3006/health')
  .then(res => res.json())
  .then(data => console.log(data));
```

---

### Get Dashboard Data

**Endpoint:** `GET /api/dashboard/data`

**Query Parameters:**
- `mode` (optional): `personal` | `guest` | `briefing` | `weather` | `art`
  Default: **Current scheduler mode** (the API remembers what mode it's in!)

**Use case:** Fetch current dashboard data. **You don't need to track the mode in your UI** - the API maintains it internally!

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "personal",
    "weather": { /* weather object */ },
    "nextEvent": { /* event object */ },
    "todos": [ /* todo array */ ],
    "agenda": [ /* agenda array */ ],
    "localEvents": [ /* events array */ ],
    "llmMessage": { /* LLM message object */ }
  },
  "currentMode": "personal",
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

**Recommended Pattern - Simple Polling:**

```javascript
// Just fetch current dashboard - no mode parameter needed!
// The API automatically uses whatever mode it's currently in
async function fetchDashboard() {
  const response = await fetch('http://localhost:3006/api/dashboard/data');
  const result = await response.json();

  console.log('API is in mode:', result.currentMode);
  return result.data; // This is your dashboard data
}

// Poll every 30 seconds
setInterval(fetchDashboard, 30000);
```

**Advanced - Temporary Mode Override:**

```javascript
// View guest mode data WITHOUT changing the API's current mode
fetch('http://localhost:3006/api/dashboard/data?mode=guest')
  .then(res => res.json())
  .then(result => {
    console.log('Requested mode:', result.data.mode); // 'guest'
    console.log('API still in mode:', result.currentMode); // e.g., 'personal'
  });
```

---

### Change Dashboard Mode

**Endpoint:** `POST /api/dashboard/mode`

**Body:**
```json
{
  "mode": "personal" | "guest" | "briefing" | "weather" | "art"
}
```

**Use case:** Switch dashboard mode and immediately broadcast update to all connected WebSocket clients

**Response:**
```json
{
  "success": true,
  "message": "Mode updated to 'briefing'",
  "mode": "briefing",
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

**Example:**
```javascript
fetch('http://localhost:3006/api/dashboard/mode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode: 'guest' })
})
  .then(res => res.json())
  .then(data => console.log(data));
```

**Note:** This updates the default mode for the scheduler and broadcasts new data to all WebSocket clients immediately.

---

### Trigger Manual Refresh

**Endpoint:** `GET /api/dashboard/refresh`

**Query Parameters:**
- `mode` (optional): Mode for response data. Defaults to current scheduler mode.

**Use case:** Force immediate data refresh (bypasses 30-second timer)

**Response:**
```json
{
  "success": true,
  "message": "Dashboard data refreshed",
  "data": {
    "mode": "personal",
    "weather": { /* latest weather */ },
    "nextEvent": { /* latest event */ },
    "todos": [ /* latest todos */ ],
    "agenda": [ /* latest agenda */ ],
    "localEvents": [ /* latest events */ ],
    "llmMessage": { /* latest LLM message */ }
  },
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

**Example:**
```javascript
fetch('http://localhost:3006/api/dashboard/refresh')
  .then(res => res.json())
  .then(data => console.log('Refreshed:', data.data));
```

**Note:** This also broadcasts the update to all WebSocket clients.

---

## Dashboard Modes

### `personal` (Default)
Full dashboard with all personal data:
- Weather
- Next calendar event
- Todo list
- Full agenda
- Local events
- LLM messages

### `guest`
Public-facing display without personal data:
```json
{
  "mode": "guest",
  "weather": { /* weather data */ },
  "localEvents": [ /* local events */ ],
  "guestQuote": {
    "text": "Creativity is intelligence having fun.",
    "author": "Albert Einstein"
  }
}
```

### `briefing`
Condensed summary view:
```json
{
  "mode": "briefing",
  "weather": { "temp": 72, "condition": "Partly Cloudy" },
  "summary": {
    "weather": { "temp": 72, "condition": "Partly Cloudy" },
    "nextEvent": {
      "title": "Team Meeting",
      "time": "2:00 PM",
      "minutesUntil": 45
    },
    "todoCount": 5,
    "urgentTodoCount": 2,
    "agendaCount": 3,
    "upcomingAgenda": [ /* next 3 items */ ]
  }
}
```

### `weather`
Weather-focused display:
```json
{
  "mode": "weather",
  "weather": { /* detailed weather */ },
  "localEvents": [ /* local events */ ]
}
```

### `art`
Aesthetic display for art installations:
```json
{
  "mode": "art",
  "weather": { /* weather data */ },
  "localEvents": [ /* art/music events only */ ],
  "guestQuote": { /* inspiring quote */ }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Invalid mode",
  "message": "Mode 'xyz' is not supported",
  "validModes": ["personal", "guest", "briefing", "weather", "art"],
  "timestamp": "2025-10-02T12:00:00.000Z"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid mode, missing parameters)
- `404` - Not Found (invalid endpoint)
- `500` - Internal Server Error

---

## React Example Component

```javascript
import { useState, useEffect } from 'react';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Fetch initial data
    fetch('http://localhost:3006/api/dashboard/data?mode=personal')
      .then(res => res.json())
      .then(data => setDashboardData(data.data));

    // Connect to WebSocket for live updates
    const socket = new WebSocket('ws://localhost:3006');

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.event === 'dashboard:update') {
        setDashboardData(message.data);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(socket);

    // Cleanup
    return () => {
      socket.close();
    };
  }, []);

  const changeMode = (mode) => {
    fetch('http://localhost:3006/api/dashboard/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    })
      .then(res => res.json())
      .then(data => console.log('Mode changed:', data));
  };

  if (!dashboardData) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard - {dashboardData.mode}</h1>
      <div>Temperature: {dashboardData.weather?.temp}°F</div>
      <div>Condition: {dashboardData.weather?.condition}</div>

      <button onClick={() => changeMode('guest')}>Guest Mode</button>
      <button onClick={() => changeMode('personal')}>Personal Mode</button>
    </div>
  );
}

export default Dashboard;
```

---

## Rate Limiting & Caching

- **WebSocket updates:** Every 30 seconds (configurable via `REFRESH_INTERVAL`)
- **Weather data:** Cached for 10 minutes
- **Calendar data:** Fetched fresh each cycle
- **Todoist data:** Fetched fresh each cycle

**Tip:** Use WebSocket for live updates instead of polling REST endpoints.

---

## CORS

The API allows requests from `http://localhost:3000` by default (configurable via `CORS_ORIGIN` env var).

If your React app runs on a different port, update `.env`:
```
CORS_ORIGIN=http://localhost:5173
```

---

## Production URLs

Replace `localhost:3006` with your Mac Mini's IP or hostname:

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://your-mac-mini-ip:3006'
  : 'http://localhost:3006';

const WS_URL = process.env.NODE_ENV === 'production'
  ? 'ws://your-mac-mini-ip:3006'
  : 'ws://localhost:3006';
```
