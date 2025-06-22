// backend/app.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'database',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppassword',
  database: process.env.DB_NAME || 'myapp'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

// Health check endpoint
app.get('/health', (req, res) => {
  // Test database connection
  db.ping((err) => {
    if (err) {
      return res.status(500).json({ 
        status: 'unhealthy', 
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
});

// ====================
// USER ENDPOINTS
// ====================

// Get all users
app.get('/api/users', (req, res) => {
  const query = 'SELECT id, username as name, email, created_at, updated_at FROM users ORDER BY created_at DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(results);
  });
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (!userId || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  const query = 'SELECT id, username as name, email, created_at, updated_at FROM users WHERE id = ?';
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(results[0]);
  });
});

// Create new user
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
  
  db.query(query, [name, email, 'defaultpass'], (err, result) => {
    if (err) {
      console.error('Error creating user:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      email,
      message: 'User created successfully'
    });
  });
});

// Update user
app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const { name, email } = req.body;
  
  if (!userId || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  if (!name && !email) {
    return res.status(400).json({ error: 'At least name or email must be provided' });
  }
  
  let query = 'UPDATE users SET ';
  let params = [];
  let updates = [];
  
  if (name) {
    updates.push('username = ?');
    params.push(name);
  }
  
  if (email) {
    updates.push('email = ?');
    params.push(email);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(userId);
  
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error updating user:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: 'Failed to update user' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User updated successfully' });
  });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (!userId || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  // First delete associated tasks
  const deleteTasksQuery = 'DELETE FROM tasks WHERE user_id = ?';
  
  db.query(deleteTasksQuery, [userId], (err) => {
    if (err) {
      console.error('Error deleting user tasks:', err);
      return res.status(500).json({ error: 'Failed to delete user tasks' });
    }
    
    // Then delete the user
    const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
    
    db.query(deleteUserQuery, [userId], (err, result) => {
      if (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({ message: 'User and associated tasks deleted successfully' });
    });
  });
});

// ====================
// TASK ENDPOINTS
// ====================

// Get all tasks
app.get('/api/tasks', (req, res) => {
  const { user_id, completed, priority } = req.query;
  
  let query = `
    SELECT t.*, u.username 
    FROM tasks t 
    LEFT JOIN users u ON t.user_id = u.id 
    WHERE 1=1
  `;
  let params = [];
  
  if (user_id) {
    query += ' AND t.user_id = ?';
    params.push(parseInt(user_id));
  }
  
  if (completed !== undefined) {
    query += ' AND t.completed = ?';
    params.push(completed === 'true' ? 1 : 0);
  }
  
  if (priority) {
    query += ' AND t.priority = ?';
    params.push(priority);
  }
  
  query += ' ORDER BY t.created_at DESC';
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
    res.json(results);
  });
});

// Get task by ID
app.get('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  
  if (!taskId || taskId < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }
  
  const query = `
    SELECT t.*, u.username 
    FROM tasks t 
    LEFT JOIN users u ON t.user_id = u.id 
    WHERE t.id = ?
  `;
  
  db.query(query, [taskId], (err, results) => {
    if (err) {
      console.error('Error fetching task:', err);
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(results[0]);
  });
});

// Create new task
app.post('/api/tasks', (req, res) => {
  const { title, description, priority = 'medium', user_id } = req.body;
  
  if (!title || !user_id) {
    return res.status(400).json({ error: 'Title and user_id are required' });
  }
  
  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium, or high' });
  }
  
  // Check if user exists
  const checkUserQuery = 'SELECT id FROM users WHERE id = ?';
  
  db.query(checkUserQuery, [user_id], (err, userResults) => {
    if (err) {
      console.error('Error checking user:', err);
      return res.status(500).json({ error: 'Failed to validate user' });
    }
    
    if (userResults.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }
    
    const query = 'INSERT INTO tasks (title, description, priority, user_id) VALUES (?, ?, ?, ?)';
    
    db.query(query, [title, description, priority, user_id], (err, result) => {
      if (err) {
        console.error('Error creating task:', err);
        return res.status(500).json({ error: 'Failed to create task' });
      }
      
      res.status(201).json({ 
        id: result.insertId, 
        title, 
        description,
        priority,
        user_id,
        completed: 0,
        message: 'Task created successfully'
      });
    });
  });
});

// Update task
app.put('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  const { title, description, completed, priority } = req.body;
  
  if (!taskId || taskId < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }
  
  if (!title && description === undefined && completed === undefined && !priority) {
    return res.status(400).json({ error: 'At least one field must be provided for update' });
  }
  
  let query = 'UPDATE tasks SET ';
  let params = [];
  let updates = [];
  
  if (title) {
    updates.push('title = ?');
    params.push(title);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  if (completed !== undefined) {
    updates.push('completed = ?');
    params.push(completed ? 1 : 0);
  }
  
  if (priority) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be low, medium, or high' });
    }
    updates.push('priority = ?');
    params.push(priority);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(taskId);
  
  db.query(query, params, (err, result) => {
    if (err) {
      console.error('Error updating task:', err);
      return res.status(500).json({ error: 'Failed to update task' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task updated successfully' });
  });
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const taskId = parseInt(req.params.id);
  
  if (!taskId || taskId < 1) {
    return res.status(400).json({ error: 'Invalid task ID' });
  }
  
  const query = 'DELETE FROM tasks WHERE id = ?';
  
  db.query(query, [taskId], (err, result) => {
    if (err) {
      console.error('Error deleting task:', err);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  });
});

// ====================
// STATISTICS ENDPOINTS
// ====================

// Get user statistics
app.get('/api/users/:id/stats', (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (!userId || userId < 1) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  const statsQuery = `
    SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending_tasks,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_tasks,
      SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority_tasks,
      SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority_tasks
    FROM tasks 
    WHERE user_id = ?
  `;
  
  db.query(statsQuery, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user stats:', err);
      return res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
    
    const stats = results[0];
    const completionRate = stats.total_tasks > 0 ? 
      ((stats.completed_tasks / stats.total_tasks) * 100).toFixed(2) : 0;
    
    res.json({
      user_id: userId,
      ...stats,
      completion_rate: parseFloat(completionRate)
    });
  });
});

// Get overall statistics
app.get('/api/stats', (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM tasks) as total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE completed = 1) as completed_tasks,
      (SELECT COUNT(*) FROM tasks WHERE completed = 0) as pending_tasks,
      (SELECT COUNT(*) FROM tasks WHERE priority = 'high') as high_priority_tasks
  `;
  
  db.query(statsQuery, (err, results) => {
    if (err) {
      console.error('Error fetching overall stats:', err);
      return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
    
    const stats = results[0];
    const completionRate = stats.total_tasks > 0 ? 
      ((stats.completed_tasks / stats.total_tasks) * 100).toFixed(2) : 0;
    
    res.json({
      ...stats,
      completion_rate: parseFloat(completionRate)
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API Users: http://localhost:${PORT}/api/users`);
  console.log(`API Tasks: http://localhost:${PORT}/api/tasks`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.end();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.end();
  process.exit(0);
});