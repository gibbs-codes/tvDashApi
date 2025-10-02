const axios = require('axios');

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetch current weather from OpenWeatherMap API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} apiKey - OpenWeatherMap API key
 * @returns {Promise<Object>} Weather data
 */
async function getCurrentWeather(lat, lon, apiKey) {
  if (!apiKey) {
    throw new Error('Weather API key not configured');
  }

  if (!lat || !lon) {
    throw new Error('Weather location (lat/lon) not configured');
  }

  try {
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        lat,
        lon,
        appid: apiKey,
        units: 'imperial' // Fahrenheit
      },
      timeout: 5000 // 5 second timeout
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      // API responded with error
      throw new Error(`Weather API error: ${error.response.status} - ${error.response.data.message || 'Unknown error'}`);
    } else if (error.request) {
      // No response received
      throw new Error('Weather API timeout or network error');
    } else {
      // Other error
      throw new Error(`Weather API request failed: ${error.message}`);
    }
  }
}

/**
 * Parse OpenWeatherMap response into simplified format
 * @param {Object} data - OpenWeatherMap API response
 * @returns {Object} Parsed weather data
 */
function parseWeatherResponse(data) {
  return {
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    condition: data.weather[0].main,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed),
    high: Math.round(data.main.temp_max),
    low: Math.round(data.main.temp_min),
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    location: data.name
  };
}

module.exports = {
  getCurrentWeather,
  parseWeatherResponse
};
