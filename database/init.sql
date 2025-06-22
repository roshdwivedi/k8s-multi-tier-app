-- Initialize the application database
CREATE DATABASE IF NOT EXISTS myapp;
USE myapp;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Posts/Content table (adjust based on your app needs)
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sample data for testing
INSERT INTO users (username, email, password_hash) VALUES 
('testuser', 'test@example.com', '$2b$10$dummy.hash.for.testing'),
('admin', 'admin@example.com', '$2b$10$dummy.hash.for.admin')
ON DUPLICATE KEY UPDATE username=username;

INSERT INTO posts (title, content, user_id) VALUES 
('Welcome Post', 'This is a sample post to test the database connection.', 1),
('Getting Started', 'Your multi-tier application is working!', 2)
ON DUPLICATE KEY UPDATE title=title;