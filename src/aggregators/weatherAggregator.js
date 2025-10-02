const { getCurrentWeather, parseWeatherResponse } = require('../clients/weatherClient');

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// Cache storage
let cachedWeather = null;
let cacheTimestamp = null;

/**
 * Get weather data with caching
 * @returns {Promise<Object|null>} Weather data or null on failure
 */
async function getWeather() {
  // Check if cache is still valid
  if (cachedWeather && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    console.log('📦 Returning cached weather data');
    return cachedWeather;
  }

  // Try to fetch fresh data
  try {
    const apiKey = process.env.WEATHER_API_KEY;
    const lat = parseFloat(process.env.WEATHER_LAT);
    const lon = parseFloat(process.env.WEATHER_LON);

    if (!apiKey || !lat || !lon) {
      console.warn('⚠️  Weather API not configured (missing API key or coordinates)');
      return cachedWeather || null;
    }

    console.log('🌤️  Fetching fresh weather data...');
    const rawData = await getCurrentWeather(lat, lon, apiKey);
    const parsedData = parseWeatherResponse(rawData);

    // Format for dashboard
    const weatherData = {
      temp: parsedData.temp,
      condition: parsedData.condition,
      icon: parsedData.icon,
      feelsLike: parsedData.feelsLike,
      description: parsedData.description,
      humidity: parsedData.humidity,
      windSpeed: parsedData.windSpeed,
      high: parsedData.high,
      low: parsedData.low
    };

    // Update cache
    cachedWeather = weatherData;
    cacheTimestamp = Date.now();

    console.log(`✅ Weather data updated: ${weatherData.temp}°F, ${weatherData.condition}`);
    return weatherData;

  } catch (error) {
    console.error('❌ Failed to fetch weather:', error.message);

    // Return cached data if available
    if (cachedWeather) {
      console.log('📦 Returning stale cached weather data due to API failure');
      return cachedWeather;
    }

    // No cached data available
    console.warn('⚠️  No cached weather data available');
    return null;
  }
}

/**
 * Clear the weather cache (useful for testing or forced refresh)
 */
function clearCache() {
  cachedWeather = null;
  cacheTimestamp = null;
  console.log('🗑️  Weather cache cleared');
}

/**
 * Get cache status
 * @returns {Object} Cache status information
 */
function getCacheStatus() {
  return {
    hasCachedData: !!cachedWeather,
    cacheAge: cacheTimestamp ? Date.now() - cacheTimestamp : null,
    isValid: cachedWeather && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)
  };
}

module.exports = {
  getWeather,
  clearCache,
  getCacheStatus
};
