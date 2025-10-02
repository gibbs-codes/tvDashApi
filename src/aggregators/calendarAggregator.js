const { getTodaysEvents, parseCalendarEvent } = require('../clients/calendarClient');

/**
 * Format time as HH:MM AM/PM
 * @param {Date} date - Date object
 * @returns {string} Formatted time string
 */
function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Calculate minutes until a given time
 * @param {Date} date - Target date
 * @returns {number} Minutes until the date
 */
function getMinutesUntil(date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.floor(diff / 60000);
}

/**
 * Check if an event has already passed
 * @param {Date} endTime - Event end time
 * @returns {boolean} True if event has passed
 */
function isEventDone(endTime) {
  return new Date() > endTime;
}

/**
 * Get today's calendar events and next upcoming event
 * @returns {Promise<Object>} Calendar data with nextEvent and agenda
 */
async function getCalendarData() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  // Return null/empty if calendar not configured
  if (!calendarId) {
    console.warn('⚠️  Google Calendar not configured');
    return {
      nextEvent: null,
      agenda: []
    };
  }

  try {
    console.log('📅 Fetching calendar events...');
    const events = await getTodaysEvents(calendarId);

    if (!events || events.length === 0) {
      console.log('📅 No events found for today');
      return {
        nextEvent: null,
        agenda: []
      };
    }

    const parsedEvents = events.map(parseCalendarEvent);
    const now = new Date();

    // Find next upcoming event by comparing event start time to current time
    const upcomingEvents = parsedEvents.filter(event => event.startTime > now);
    const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

    // Format next event with calculated minutesUntil
    const formattedNextEvent = nextEvent ? {
      title: nextEvent.title,
      time: formatTime(nextEvent.startTime),
      minutesUntil: getMinutesUntil(nextEvent.startTime),
      location: nextEvent.location || '',
      startTime: nextEvent.startTime.toISOString()
    } : null;

    // Format agenda (all events for today)
    const agenda = parsedEvents.map(event => ({
      time: event.isAllDay ? 'All Day' : formatTime(event.startTime),
      title: event.title,
      done: isEventDone(event.endTime),
      location: event.location || '',
      isAllDay: event.isAllDay
    }));

    console.log(`✅ Found ${events.length} event(s) for today`);

    return {
      nextEvent: formattedNextEvent,
      agenda: agenda
    };

  } catch (error) {
    console.error('❌ Failed to fetch calendar events:', error.message);

    // Return null/empty on failure (no mock data)
    return {
      nextEvent: null,
      agenda: []
    };
  }
}


/**
 * Get just the next upcoming event
 * @returns {Promise<Object|null>} Next event or null
 */
async function getNextEvent() {
  const data = await getCalendarData();
  return data.nextEvent;
}

/**
 * Get just today's agenda
 * @returns {Promise<Array>} Agenda items
 */
async function getAgenda() {
  const data = await getCalendarData();
  return data.agenda;
}

module.exports = {
  getCalendarData,
  getNextEvent,
  getAgenda
};
