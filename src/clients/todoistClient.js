const axios = require('axios');

const TODOIST_BASE_URL = 'https://api.todoist.com/rest/v2';

/**
 * Fetch all active tasks from Todoist
 * @param {string} apiToken - Todoist API token
 * @returns {Promise<Array>} Array of tasks
 */
async function getTasks(apiToken) {
  if (!apiToken) {
    throw new Error('Todoist API token not configured');
  }

  try {
    const response = await axios.get(`${TODOIST_BASE_URL}/tasks`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Todoist authentication failed - check API token');
      } else if (error.response.status === 403) {
        throw new Error('Todoist access denied');
      }
      throw new Error(`Todoist API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Todoist API timeout or network error');
    } else {
      throw new Error(`Todoist API request failed: ${error.message}`);
    }
  }
}

/**
 * Fetch tasks with a specific filter
 * @param {string} apiToken - Todoist API token
 * @param {string} filter - Todoist filter query
 * @returns {Promise<Array>} Array of filtered tasks
 */
async function getTasksWithFilter(apiToken, filter) {
  if (!apiToken) {
    throw new Error('Todoist API token not configured');
  }

  try {
    const response = await axios.get(`${TODOIST_BASE_URL}/tasks`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      params: {
        filter: filter
      },
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Todoist authentication failed - check API token');
      } else if (error.response.status === 403) {
        throw new Error('Todoist access denied');
      }
      throw new Error(`Todoist API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Todoist API timeout or network error');
    } else {
      throw new Error(`Todoist API request failed: ${error.message}`);
    }
  }
}

/**
 * Complete a task in Todoist
 * @param {string} apiToken - Todoist API token
 * @param {string} taskId - Task ID to complete
 * @returns {Promise<boolean>} Success status
 */
async function completeTask(apiToken, taskId) {
  if (!apiToken) {
    throw new Error('Todoist API token not configured');
  }

  try {
    await axios.post(`${TODOIST_BASE_URL}/tasks/${taskId}/close`, {}, {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      timeout: 5000
    });

    return true;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        throw new Error('Todoist authentication failed - check API token');
      } else if (error.response.status === 404) {
        throw new Error(`Task not found: ${taskId}`);
      }
      throw new Error(`Todoist API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Todoist API timeout or network error');
    } else {
      throw new Error(`Todoist API request failed: ${error.message}`);
    }
  }
}

/**
 * Parse Todoist task into simplified format
 * @param {Object} task - Todoist task object
 * @returns {Object} Parsed task data
 */
function parseTodoistTask(task) {
  return {
    id: task.id,
    content: task.content,
    description: task.description || '',
    projectId: task.project_id,
    priority: task.priority, // 1-4, where 4 is highest
    due: task.due ? {
      date: task.due.date,
      datetime: task.due.datetime || null,
      string: task.due.string,
      timezone: task.due.timezone || null
    } : null,
    labels: task.labels || [],
    url: task.url,
    createdAt: task.created_at,
    isCompleted: task.is_completed || false
  };
}

module.exports = {
  getTasks,
  getTasksWithFilter,
  completeTask,
  parseTodoistTask
};
