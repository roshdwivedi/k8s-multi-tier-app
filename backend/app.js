// backend/app.js
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'mysql-service',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'myapp'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
  
  // Create users table if it doesn't exist
  const createTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.query(createTable, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Users table ready');
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: db.state === 'authenticated' ? 'connected' : 'disconnected'
  });
});

// Get all users
app.get('/api/users', (req, res) => {
  const query = 'SELECT * FROM users ORDER BY created_at DESC';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(results);
  });
});

// Create new user
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  const query = 'INSERT INTO users (name, email) VALUES (?, ?)';
  
  db.query(query, [name, email], (err, result) => {
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

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'SELECT * FROM users WHERE id = ?';
  
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

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'DELETE FROM users WHERE id = ?';
  
  db.query(query, [userId], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
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
  console.log(`API endpoint: http://localhost:${PORT}/api/users`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.end();
  process.exit(0);
});