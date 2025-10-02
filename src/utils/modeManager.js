/**
 * Collection of inspiring quotes for guest mode
 */
const GUEST_QUOTES = [
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb"
  },
  {
    text: "Creativity is intelligence having fun.",
    author: "Albert Einstein"
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    text: "Art is not what you see, but what you make others see.",
    author: "Edgar Degas"
  },
  {
    text: "Every artist was first an amateur.",
    author: "Ralph Waldo Emerson"
  },
  {
    text: "Simplicity is the ultimate sophistication.",
    author: "Leonardo da Vinci"
  },
  {
    text: "Design is thinking made visual.",
    author: "Saul Bass"
  },
  {
    text: "The purpose of art is washing the dust of daily life off our souls.",
    author: "Pablo Picasso"
  },
  {
    text: "Color is my day-long obsession, joy and torment.",
    author: "Claude Monet"
  },
  {
    text: "Art enables us to find ourselves and lose ourselves at the same time.",
    author: "Thomas Merton"
  },
  {
    text: "To practice any art, no matter how well or badly, is a way to make your soul grow.",
    author: "Kurt Vonnegut"
  },
  {
    text: "Everything you can imagine is real.",
    author: "Pablo Picasso"
  }
];

/**
 * Get a random inspiring quote for guest mode
 * @returns {Object} Quote object with text and author
 */
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * GUEST_QUOTES.length);
  return GUEST_QUOTES[randomIndex];
}

/**
 * Create a condensed summary for briefing mode
 * @param {Object} data - Full dashboard data
 * @returns {Object} Condensed summary
 */
function createBriefingSummary(data) {
  const summary = {
    weather: data.weather ? {
      temp: data.weather.temp,
      condition: data.weather.condition
    } : null,
    nextEvent: data.nextEvent ? {
      title: data.nextEvent.title,
      time: data.nextEvent.time,
      minutesUntil: data.nextEvent.minutesUntil
    } : null,
    todoCount: data.todos ? data.todos.length : 0,
    urgentTodoCount: data.todos ? data.todos.filter(t => t.urgent).length : 0,
    agendaCount: data.agenda ? data.agenda.length : 0,
    upcomingAgenda: data.agenda ? data.agenda.filter(item => !item.done).slice(0, 3) : []
  };

  return summary;
}

/**
 * Filter dashboard data based on display mode
 * @param {string} mode - Dashboard mode (personal, guest, briefing, weather, art)
 * @param {Object} data - Full dashboard data
 * @returns {Object} Filtered data appropriate for the mode
 */
function filterByMode(mode, data) {
  switch (mode) {
    case 'personal':
      // Return all data for personal mode
      return data;

    case 'guest':
      // Return only public/non-personal data for guest mode
      return {
        mode: 'guest',
        weather: data.weather,
        localEvents: data.localEvents,
        guestQuote: getRandomQuote()
      };

    case 'briefing':
      // Return condensed summary for briefing mode
      return {
        mode: 'briefing',
        weather: data.weather,
        summary: createBriefingSummary(data)
      };

    case 'weather':
      // Weather-focused mode
      return {
        mode: 'weather',
        weather: data.weather,
        localEvents: data.localEvents
      };

    case 'art':
      // Art/aesthetic mode
      return {
        mode: 'art',
        weather: data.weather,
        localEvents: data.localEvents ? data.localEvents.filter(e => e.type === 'art' || e.type === 'music') : [],
        guestQuote: getRandomQuote()
      };

    default:
      // Default to personal mode
      console.warn(`⚠️  Unknown mode '${mode}', defaulting to personal`);
      return data;
  }
}

/**
 * Get list of available modes
 * @returns {Array<string>} List of mode names
 */
function getAvailableModes() {
  return ['personal', 'guest', 'briefing', 'weather', 'art'];
}

/**
 * Validate if a mode is supported
 * @param {string} mode - Mode to validate
 * @returns {boolean} True if mode is valid
 */
function isValidMode(mode) {
  return getAvailableModes().includes(mode);
}

module.exports = {
  filterByMode,
  getRandomQuote,
  createBriefingSummary,
  getAvailableModes,
  isValidMode
};
