-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db-mysql:3306
-- Generation Time: Jul 14, 2026 at 02:42 AM
-- Server version: 8.0.46
-- PHP Version: 8.3.32

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mydatabase`
--

-- --------------------------------------------------------

-- users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    f_name VARCHAR(100) NOT NULL,
    l_name VARCHAR(100) NOT NULL,
    role ENUM('admin','customer') DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Organizer
CREATE TABLE organizers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    owner_id INT NOT NULL,
    CONSTRAINT fk_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
);

-- Event Type
CREATE TABLE event_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- Event
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    cover_image VARCHAR(500) NOT NULL,
    description TEXT,
    theme VARCHAR(100),
    status ENUM("pending", "approved", "rejected") NOT NULL DEFAULT "pending",
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    organizer_id INT NOT NULL,
    type_id INT NOT NULL,

    CONSTRAINT fk_event_organizer
        FOREIGN KEY (organizer_id)
        REFERENCES organizers(id),

    CONSTRAINT fk_event_type
        FOREIGN KEY (type_id)
        REFERENCES event_types(id)
);

-- Zone
CREATE TABLE zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(100) NOT NULL, --บอกประเภทว่ายืน/นั่ง/ ....
    type VARCHAR(100) NOT NULL, --บอกประเภทว่าฟรี/ ปกติ/ vip
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    event_id INT NOT NULL,
    CONSTRAINT fk_zone_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_event_zone
        UNIQUE(event_id,name)
);

-- Seat
CREATE TABLE seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    zone_id INT NOT NULL,
    CONSTRAINT fk_seat_zone
        FOREIGN KEY (zone_id)
        REFERENCES zones(id)
        ON DELETE CASCADE,
    
    CONSTRAINT uq_seat
        UNIQUE(zone_id,position)
);

-- Staff
CREATE TABLE staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM("checkin_staff", "general_staff", "manager") NOT NULL,
    join_date DATETIME NOT NULL,
    users_id INT NOT NULL,
    organizer_id INT NOT NULL,

    CONSTRAINT fk_staff_users
        FOREIGN KEY (users_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_staff_organizer
        FOREIGN KEY (organizer_id)
        REFERENCES organizers(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_staff
        UNIQUE (users_id, organizer_id)
);

-- payment
CREATE TABLE payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM(
        'credit card',
        'prompt pay',
        'mobile banking',
        'cash'
    ) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    gateway VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Ticket
CREATE TABLE tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    qrcode VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM(
        'reserved',
        'paid',
        'checked_in',
        'cancelled'
    ) DEFAULT 'reserved' NOT NULL,
    users_id INT NOT NULL,
    seat_id INT NOT NULL,

    CONSTRAINT fk_ticket_users
        FOREIGN KEY (users_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_ticket_seat
        FOREIGN KEY (seat_id)
        REFERENCES seats(id)
        ON DELETE CASCADE
);

-- Transaction
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bank_ref_no VARCHAR(100),
    gateway_fee DECIMAL(10,2) DEFAULT 0.00,
    gross_amount DECIMAL(10,2) NOT NULL,
    status ENUM(
        'pending',
        'paid',
        'failed',
        'cancelled',
        'refunded'
        ) NOT NULL DEFAULT 'pending',
    time_stamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    ticket_id INT NOT NULL,
    payment_method_id INT,

    CONSTRAINT fk_transaction_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_transaction_payment
        FOREIGN KEY (payment_method_id)
        REFERENCES payment_methods(id)
        ON DELETE SET NULL,

    CONSTRAINT uq_bank_transaction
        UNIQUE(bank_ref_no)
);

-- Check In
CREATE TABLE check_in_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    time_stamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ticket_id INT NOT NULL,
    staff_id INT NOT NULL,

    CONSTRAINT fk_history_ticket
        FOREIGN KEY (ticket_id)
        REFERENCES tickets(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_history_staff
        FOREIGN KEY (staff_id)
        REFERENCES staff(id)
        ON DELETE CASCADE
);

-- White List
CREATE TABLE white_list (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note TEXT,
    users_id INT NOT NULL,
    event_id INT NOT NULL,
    add_by INT NOT NULL,

    CONSTRAINT fk_wl_users
        FOREIGN KEY (users_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_wl_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_wl_staff
        FOREIGN KEY (add_by)
        REFERENCES staff(id),

    CONSTRAINT uq_white_list
        UNIQUE(users_id,event_id)
);

-- Saved Card
CREATE TABLE saved_cards (
    id INT AUTO_INCREMENT  PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    last4 VARCHAR(4),
    exp_month TINYINT,
    exp_year SMALLINT,
    cardholder_name VARCHAR(100),
    card_brand VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    users_id INT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_credit_card_users
        FOREIGN KEY (users_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT uq_card_token
        UNIQUE(token)
);

-- Event Image
CREATE TABLE event_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    display_order INT NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    event_id INT NOT NULL,
    CONSTRAINT fk_event_image
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_event_image_order
        UNIQUE(event_id, display_order)
);

-- Zone image
CREATE TABLE zone_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    display_order INT DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    zone_id INT NOT NULL,
    CONSTRAINT fk_zone_id
        FOREIGN KEY (zone_id)
        REFERENCES zones(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_zone_image_order
        UNIQUE(zone_id, display_order)
);
