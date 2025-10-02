const PING_INTERVAL = 30000; // 30 seconds
const PONG_TIMEOUT = 5000; // 5 seconds

class WebSocketHandler {
  constructor() {
    this.clients = new Set();
    this.pingInterval = null;
  }

  /**
   * Initialize WebSocket server and handle connections
   * @param {WebSocketServer} wss - WebSocket server instance
   */
  initialize(wss) {
    wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      console.log(`✅ Client connected: ${clientId}`);

      // Initialize client properties
      ws.clientId = clientId;
      ws.isAlive = true;
      this.clients.add(ws);

      // Send welcome message
      this.sendToSocket(ws, {
        event: 'connection',
        data: {
          message: 'Connected to Living Art BFF',
          clientId: clientId
        }
      });

      // Handle pong responses
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle incoming messages
      ws.on('message', (message) => {
        this.handleMessage(ws, message, clientId);
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`❌ Client disconnected: ${clientId}`);
        console.log(`📊 Active connections: ${this.clients.size}`);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`⚠️  WebSocket error for client ${clientId}:`, error);
        this.clients.delete(ws);
      });

      console.log(`📊 Active connections: ${this.clients.size}`);
    });

    // Start ping/pong health check
    this.startHealthCheck();
  }

  /**
   * Handle incoming messages from clients
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} message - Raw message
   * @param {string} clientId - Client ID
   */
  handleMessage(ws, message, clientId) {
    try {
      const data = JSON.parse(message);
      console.log(`📨 Message from ${clientId}:`, data);

      // Handle ping from client
      if (data.type === 'ping') {
        this.sendToSocket(ws, {
          event: 'pong',
          data: { timestamp: new Date().toISOString() }
        });
        return;
      }

      // Echo back for now (can be extended with specific handlers)
      this.sendToSocket(ws, {
        event: 'echo',
        data: data
      });
    } catch (error) {
      console.error('Error parsing message:', error);
      this.sendToSocket(ws, {
        event: 'error',
        data: { message: 'Invalid message format' }
      });
    }
  }

  /**
   * Start ping/pong health check interval
   */
  startHealthCheck() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log(`💀 Terminating dead connection: ${ws.clientId}`);
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, PING_INTERVAL);
  }

  /**
   * Stop health check interval
   */
  stopHealthCheck() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send dashboard update to all connected clients
   * @param {Object} dashboardData - Dashboard data object
   * @param {string} dashboardData.mode - Current dashboard mode
   * @param {Object} dashboardData.weather - Weather information
   * @param {Object} dashboardData.nextEvent - Next calendar event
   * @param {Array} dashboardData.todos - Todo list
   * @param {Array} dashboardData.agenda - Agenda items
   * @param {Array} dashboardData.localEvents - Local events
   * @param {string} dashboardData.llmMessage - LLM generated message
   */
  sendDashboardUpdate(dashboardData) {
    this.broadcast({
      event: 'dashboard:update',
      data: {
        mode: dashboardData.mode,
        weather: dashboardData.weather,
        nextEvent: dashboardData.nextEvent,
        todos: dashboardData.todos,
        agenda: dashboardData.agenda,
        localEvents: dashboardData.localEvents,
        llmMessage: dashboardData.llmMessage
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} payload - Message payload with event and data
   */
  broadcast(payload) {
    const message = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString()
    });

    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(message);
        sentCount++;
      }
    });

    console.log(`📡 Broadcast '${payload.event}' to ${sentCount} client(s)`);
  }

  /**
   * Send message to specific socket
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} payload - Message payload with event and data
   */
  sendToSocket(ws, payload) {
    if (ws.readyState === 1) {
      const message = JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
      });
      ws.send(message);
    }
  }

  /**
   * Send message to specific client by ID
   * @param {string} clientId - Target client ID
   * @param {Object} payload - Message payload with event and data
   * @returns {boolean} Success status
   */
  sendToClient(clientId, payload) {
    for (const client of this.clients) {
      if (client.clientId === clientId && client.readyState === 1) {
        this.sendToSocket(client, payload);
        return true;
      }
    }
    return false;
  }

  /**
   * Generate unique client ID
   * @returns {string} Unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get count of active connections
   * @returns {number} Number of active clients
   */
  getActiveConnectionCount() {
    return this.clients.size;
  }

  /**
   * Get all connected client IDs
   * @returns {Array<string>} Array of client IDs
   */
  getClientIds() {
    return Array.from(this.clients).map(client => client.clientId);
  }

  /**
   * Clean up all connections and intervals
   */
  shutdown() {
    console.log('🛑 Shutting down WebSocket handler...');
    this.stopHealthCheck();

    this.clients.forEach((client) => {
      client.close(1000, 'Server shutting down');
    });

    this.clients.clear();
    console.log('✅ WebSocket handler shut down');
  }
}

// Export singleton instance
const wsHandler = new WebSocketHandler();

module.exports = wsHandler;
