CREATE DATABASE IF NOT EXISTS acrep CHARACTER SET utf8mb4;
USE acrep;
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20), password_hash VARCHAR(100) NOT NULL,
  address VARCHAR(255), city VARCHAR(80), pincode VARCHAR(10),
  account_type ENUM('Owner','Borrower','Both') NOT NULL DEFAULT 'Borrower',
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(60) NOT NULL UNIQUE);
INSERT IGNORE INTO categories (name) VALUES ('EV Chargers'),('Parking'),('Power Tools'),('Washing Machines'),('Printers'),('Solar Energy'),('Other');
CREATE TABLE IF NOT EXISTS resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL, category_id INT NOT NULL,
  name VARCHAR(120) NOT NULL, description TEXT NOT NULL,
  price_per_hour DECIMAL(10,2) NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL, longitude DECIMAL(9,6) NOT NULL,
  availability_status ENUM('Available','Booked','Unavailable') NOT NULL DEFAULT 'Available',
  image_url VARCHAR(500) NULL,
  is_suspended TINYINT(1) NOT NULL DEFAULT 0,
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_res_cat (category_id), INDEX idx_res_geo (latitude, longitude), INDEX idx_res_owner (owner_id)
);
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL, borrower_id INT NOT NULL,
  start_at DATETIME NOT NULL, end_at DATETIME NOT NULL,  -- stored in UTC
  duration_hours DECIMAL(6,2) NOT NULL, total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('Pending','Approved','Rejected','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  reminder_sent TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_book_slot (resource_id, status, start_at, end_at), INDEX idx_book_borrower (borrower_id)
);
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL, payer_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('UPI','Card','Cash','NetBanking') NOT NULL,
  status ENUM('Pending','Paid','Failed') NOT NULL,
  reference VARCHAR(40) NOT NULL,
  is_simulated TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (payer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pay_booking (booking_id)
);
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE, resource_id INT NOT NULL, reviewer_id INT NOT NULL,
  rating TINYINT NOT NULL, comment VARCHAR(1000) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (rating BETWEEN 1 AND 5),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rev_res (resource_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  type ENUM('Booking','Payment','Reminder','General') NOT NULL DEFAULT 'General',
  message VARCHAR(255) NOT NULL, link VARCHAR(120) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read)
);
CREATE TABLE IF NOT EXISTS favourites (
  user_id INT NOT NULL, resource_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, resource_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY, resource_id INT NOT NULL, reporter_id INT NOT NULL,
  reason VARCHAR(60) NOT NULL, details VARCHAR(1000) NOT NULL DEFAULT '',
  status ENUM('Open','Resolved','Dismissed') NOT NULL DEFAULT 'Open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);
