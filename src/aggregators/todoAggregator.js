const { getTasks, parseTodoistTask } = require('../clients/todoistClient');

const URGENT_THRESHOLD_HOURS = 2;

/**
 * Parse due date string to Date object
 * @param {Object|null} due - Todoist due object
 * @returns {Date|null} Parsed date or null
 */
function parseDueDate(due) {
  if (!due) return null;

  // If datetime is available, use it (includes time)
  if (due.datetime) {
    return new Date(due.datetime);
  }

  // Otherwise use date (just the day, no time)
  if (due.date) {
    return new Date(due.date);
  }

  return null;
}

/**
 * Check if a task is due today or overdue
 * @param {Date|null} dueDate - Task due date
 * @returns {boolean} True if task is due today or overdue
 */
function isDueTodayOrOverdue(dueDate) {
  if (!dueDate) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  // Task is due today or earlier
  return taskDay <= today;
}

/**
 * Check if a task is urgent (due within 2 hours)
 * @param {Date|null} dueDate - Task due date
 * @returns {boolean} True if task is urgent
 */
function isTaskUrgent(dueDate) {
  if (!dueDate) return false;

  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Task is urgent if it's due within 2 hours (including overdue tasks)
  return hoursUntilDue <= URGENT_THRESHOLD_HOURS;
}

/**
 * Get todos from Todoist, filtered and sorted
 * @returns {Promise<Array>} Array of todo items
 */
async function getTodos() {
  const apiToken = process.env.TODOIST_API_TOKEN;

  // Return mock data if Todoist not configured
  if (!apiToken) {
    console.warn('⚠️  Todoist not configured');
    return getMockTodos();
  }

  try {
    console.log('✅ Fetching tasks from Todoist...');
    const tasks = await getTasks(apiToken);

    if (!tasks || tasks.length === 0) {
      console.log('📋 No tasks found in Todoist');
      return [];
    }

    // Parse and filter tasks
    const parsedTasks = tasks.map(parseTodoistTask);

    // Filter for incomplete tasks that are due today or overdue
    const relevantTasks = parsedTasks
      .filter(task => !task.isCompleted)
      .map(task => {
        const dueDate = parseDueDate(task.due);
        return {
          ...task,
          dueDate: dueDate
        };
      })
      .filter(task => isDueTodayOrOverdue(task.dueDate));

    // Format for dashboard
    const todos = relevantTasks.map(task => ({
      text: task.content,
      urgent: isTaskUrgent(task.dueDate),
      done: false, // All are incomplete (we filtered out completed ones)
      id: task.id,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      priority: task.priority,
      labels: task.labels
    }));

    // Sort by due date (soonest first), then by priority
    todos.sort((a, b) => {
      // If one has a due date and the other doesn't, prioritize the one with a date
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;

      // If both have due dates, sort by date
      if (a.dueDate && b.dueDate) {
        const dateComparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (dateComparison !== 0) return dateComparison;
      }

      // If dates are equal or both null, sort by priority (4 is highest)
      return b.priority - a.priority;
    });

    console.log(`✅ Found ${todos.length} task(s) due today or overdue`);
    return todos;

  } catch (error) {
    console.error('❌ Failed to fetch Todoist tasks:', error.message);

    // Return mock data on failure
    return getMockTodos();
  }
}

/**
 * Get mock todos for testing/fallback
 * @returns {Array} Mock todo items
 */
function getMockTodos() {
  const now = new Date();
  const urgent = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const later = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

  return [
    {
      text: 'Review PRs',
      urgent: true,
      done: false,
      id: 'mock-1',
      dueDate: urgent.toISOString(),
      priority: 4,
      labels: ['work']
    },
    {
      text: 'Update documentation',
      urgent: false,
      done: false,
      id: 'mock-2',
      dueDate: later.toISOString(),
      priority: 2,
      labels: ['work']
    },
    {
      text: 'Team sync',
      urgent: false,
      done: false,
      id: 'mock-3',
      dueDate: later.toISOString(),
      priority: 3,
      labels: ['meeting']
    }
  ];
}

module.exports = {
  getTodos,
  getMockTodos,
  isTaskUrgent,
  isDueTodayOrOverdue
};
