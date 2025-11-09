-- Damareen Game Database Schema
-- MySQL Database

-- Create database
CREATE DATABASE IF NOT EXISTS damareen_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE damareen_game;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Environments table (each user has their own environments)
CREATE TABLE IF NOT EXISTS environments (
    id VARCHAR(100) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- World Cards table
CREATE TABLE IF NOT EXISTS world_cards (
    id VARCHAR(100) PRIMARY KEY,
    environment_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    damage INT NOT NULL,
    health INT NOT NULL,
    element ENUM('earth', 'water', 'air', 'fire') NOT NULL,
    kind ENUM('standard', 'leader') NOT NULL,
    source_card_id VARCHAR(100) NULL,
    background_image VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    INDEX idx_environment_id (environment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dungeons table
CREATE TABLE IF NOT EXISTS dungeons (
    id VARCHAR(100) PRIMARY KEY,
    environment_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('encounter', 'minor', 'major') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    INDEX idx_environment_id (environment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dungeon Card Order (junction table)
CREATE TABLE IF NOT EXISTS dungeon_card_order (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dungeon_id VARCHAR(100) NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES world_cards(id) ON DELETE CASCADE,
    INDEX idx_dungeon_id (dungeon_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player Profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
    id VARCHAR(100) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    environment_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_environment_id (environment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player Card Collection
CREATE TABLE IF NOT EXISTS player_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    damage_bonus INT NOT NULL,
    health_bonus INT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES world_cards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_card (player_id, card_id),
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player Deck
CREATE TABLE IF NOT EXISTS player_deck (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES world_cards(id) ON DELETE CASCADE,
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Battle History
CREATE TABLE IF NOT EXISTS battle_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    dungeon_id VARCHAR(100) NOT NULL,
    player_wins INT NOT NULL,
    dungeon_wins INT NOT NULL,
    player_victory BOOLEAN NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE,
    INDEX idx_player_id (player_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

