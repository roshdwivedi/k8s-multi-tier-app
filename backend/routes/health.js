const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

// Database connection config
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'apppassword123',
  database: process.env.DB_NAME || 'myapp'
};

// Basic health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'backend',
    version: '1.0.0'
  });
});

// Database connectivity check
router.get('/health/db', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT 1 as test');
    await connection.end();
    
    res.status(200).json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ready check (includes database)
router.get('/ready', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    await connection.end();
    
    res.status(200).json({
      status: 'READY',
      database: 'connected',
      users_count: rows[0].count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;