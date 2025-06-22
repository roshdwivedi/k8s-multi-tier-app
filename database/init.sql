-- Database initialization for local testing
CREATE DATABASE IF NOT EXISTS myapp;
USE myapp;

-- Drop tables if they exist (for clean testing)
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tasks table (example app - adjust based on your needs)
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sample data for testing
INSERT INTO users (username, email, password_hash) VALUES 
('demo', 'demo@example.com', 'demo123'),
('admin', 'admin@example.com', 'admin123'),
('testuser', 'test@example.com', 'test123');

INSERT INTO tasks (title, description, completed, priority, user_id) VALUES 
('Setup Database', 'Initialize MySQL database with tables', TRUE, 'high', 1),
('Create Backend API', 'Build REST API with Node.js', TRUE, 'high', 1),
('Build Frontend', 'Create React frontend application', TRUE, 'high', 1),
('Write Dockerfiles', 'Containerize all services', TRUE, 'medium', 1),
('Setup Kubernetes', 'Deploy to Kubernetes cluster', FALSE, 'high', 1),
('Test Application', 'End-to-end testing', FALSE, 'medium', 2),
('Documentation', 'Write comprehensive README', FALSE, 'low', 2);

-- Create indexes for better performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_task_user ON tasks(user_id);
CREATE INDEX idx_task_completed ON tasks(completed);

-- Show tables and data
SHOW TABLES;
SELECT 'Users table:' as Info;
SELECT * FROM users;
SELECT 'Tasks table:' as Info;
SELECT * FROM tasks;