-- Stock Movement Database Initialization
-- This file will be executed when the MySQL container starts for the first time

-- Create default admin user (password: admin123)
-- Note: The password is hashed with bcrypt
INSERT INTO tbl_users (username, password, role) VALUES 
('admin', '$2a$10$rQnM1f3L8.1U5y0o8fHcYOJx3.YQKz1V3u8H5H9Z4wN2bMlX6mDTe', 'admin')
ON DUPLICATE KEY UPDATE username = username;

-- You can add more initial data here if needed
