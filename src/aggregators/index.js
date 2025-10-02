const { getWeather } = require('./weatherAggregator');
const { getNextEvent: getNextCalendarEvent, getAgenda: getCalendarAgenda } = require('./calendarAggregator');
const { getTodos: getTodoistTodos } = require('./todoAggregator');
const { filterByMode } = require('../utils/modeManager');

/**
 * Main aggregator that collects and combines data from all sources
 * @param {string} mode - Dashboard mode (personal, art, weather, etc.)
 * @returns {Promise<Object>} Aggregated dashboard data
 */
async function getDashboardData(mode = 'personal') {
  try {
    // Fetch all data from sources
    const fullData = {
      mode: mode,
      weather: await getWeatherData(),
      nextEvent: await getNextEvent(),
      todos: await getTodos(),
      agenda: await getAgenda(),
      localEvents: await getLocalEvents(),
      llmMessage: await getLLMMessage()
    };

    // Filter data based on mode
    const filteredData = filterByMode(mode, fullData);

    return filteredData;
  } catch (error) {
    console.error('Error aggregating dashboard data:', error);
    throw error;
  }
}

/**
 * Fetch weather data
 * @returns {Promise<Object|null>} Weather information
 */
async function getWeatherData() {
  const weather = await getWeather();

  // Return weather data if available, otherwise return fallback
  if (weather) {
    return weather;
  }

  // Fallback mock data if weather API is not configured
  return {
    temp: 72,
    condition: 'Partly Cloudy',
    icon: '02d',
    high: 78,
    low: 65,
    humidity: 55,
    windSpeed: 8
  };
}

/**
 * Fetch next calendar event
 * @returns {Promise<Object|null>} Next event details
 */
async function getNextEvent() {
  return await getNextCalendarEvent();
}

/**
 * Fetch todos
 * @returns {Promise<Array>} List of todos
 */
async function getTodos() {
  return await getTodoistTodos();
}

/**
 * Fetch agenda items
 * @returns {Promise<Array>} List of agenda items
 */
async function getAgenda() {
  return await getCalendarAgenda();
}

/**
 * Fetch local events
 * @returns {Promise<Array>} List of local events
 */
async function getLocalEvents() {
  // TODO: Integrate with events API
  return [
    { title: 'Jazz Night', type: 'music', time: '7:00 PM', venue: 'Blue Note' },
    { title: 'Art Gallery Opening', type: 'art', time: '6:00 PM', venue: 'Modern Art Museum' }
  ];
}

/**
 * Fetch LLM-generated message
 * @returns {Promise<Object>} LLM message data
 */
async function getLLMMessage() {
  // TODO: Integrate with LLM API
  return {
    active: false,
    message: '',
    urgency: 'none'
  };
}

module.exports = {
  getDashboardData,
  getWeatherData,
  getNextEvent,
  getTodos,
  getAgenda,
  getLocalEvents,
  getLLMMessage
};
