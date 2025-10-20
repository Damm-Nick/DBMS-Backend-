-- Sports Event Registration & Scheduling Database Schema
-- MySQL Database

-- Drop existing database if exists (careful in production!)
DROP DATABASE IF EXISTS sports_event_db;
CREATE DATABASE sports_event_db;
USE sports_event_db;

-- =====================================================
-- TABLE: ADMINS
-- =====================================================
CREATE TABLE admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'event_manager') DEFAULT 'event_manager',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- =====================================================
-- TABLE: PLAYERS
-- =====================================================
CREATE TABLE players (
    player_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    skill_level ENUM('Beginner', 'Intermediate', 'Advanced') DEFAULT 'Beginner',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_image_url VARCHAR(255),
    INDEX idx_email (email),
    INDEX idx_skill_level (skill_level)
);

-- =====================================================
-- TABLE: VENUES
-- =====================================================
CREATE TABLE venues (
    venue_id INT AUTO_INCREMENT PRIMARY KEY,
    venue_name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INT,
    facilities TEXT,
    INDEX idx_location (location)
);

-- =====================================================
-- TABLE: EVENTS
-- =====================================================
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    sport_type VARCHAR(50) NOT NULL,
    event_type ENUM('Tournament', 'League', 'Knockout') DEFAULT 'Tournament',
    format ENUM('Single Elimination', 'Double Elimination', 'Round Robin') DEFAULT 'Single Elimination',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_deadline DATE NOT NULL,
    max_participants INT NOT NULL,
    current_participants INT DEFAULT 0,
    event_status ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Upcoming',
    is_team_based BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admins(admin_id) ON DELETE CASCADE,
    CONSTRAINT chk_dates CHECK (end_date >= start_date AND registration_deadline <= start_date),
    CONSTRAINT chk_participants CHECK (current_participants <= max_participants),
    INDEX idx_sport_type (sport_type),
    INDEX idx_event_status (event_status),
    INDEX idx_start_date (start_date)
);

-- =====================================================
-- TABLE: TEAMS
-- =====================================================
CREATE TABLE teams (
    team_id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    captain_id INT NOT NULL,
    event_id INT NOT NULL,
    team_logo_url VARCHAR(255),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (captain_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_event (team_name, event_id),
    INDEX idx_captain (captain_id),
    INDEX idx_event (event_id)
);

-- =====================================================
-- TABLE: TEAM_MEMBERS
-- =====================================================
CREATE TABLE team_members (
    team_member_id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    player_id INT NOT NULL,
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    position VARCHAR(50),
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_team (team_id, player_id),
    INDEX idx_team (team_id),
    INDEX idx_player (player_id)
);

-- =====================================================
-- TABLE: REGISTRATIONS
-- =====================================================
CREATE TABLE registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    player_id INT,
    team_id INT,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status ENUM('Paid', 'Pending', 'Free') DEFAULT 'Free',
    status ENUM('Confirmed', 'Waitlisted', 'Cancelled') DEFAULT 'Confirmed',
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT chk_registration CHECK (
        (player_id IS NOT NULL AND team_id IS NULL) OR 
        (player_id IS NULL AND team_id IS NOT NULL)
    ),
    INDEX idx_event (event_id),
    INDEX idx_player (player_id),
    INDEX idx_team (team_id),
    INDEX idx_status (status)
);

-- =====================================================
-- TABLE: BRACKETS
-- =====================================================
CREATE TABLE brackets (
    bracket_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    round_number INT NOT NULL,
    match_sequence INT NOT NULL,
    generated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    INDEX idx_event (event_id),
    INDEX idx_round (round_number)
);

-- =====================================================
-- TABLE: MATCHES
-- =====================================================
CREATE TABLE matches (
    match_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    bracket_id INT,
    round_name VARCHAR(50),
    match_date DATE NOT NULL,
    match_time TIME NOT NULL,
    venue_id INT,
    match_status ENUM('Scheduled', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    winner_id INT,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (bracket_id) REFERENCES brackets(bracket_id) ON DELETE SET NULL,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id) ON DELETE SET NULL,
    INDEX idx_event (event_id),
    INDEX idx_match_date (match_date),
    INDEX idx_status (match_status),
    INDEX idx_venue (venue_id)
);

-- =====================================================
-- TABLE: MATCH_PARTICIPANTS
-- =====================================================
CREATE TABLE match_participants (
    participant_id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    player_id INT,
    team_id INT,
    score INT DEFAULT 0,
    result ENUM('Win', 'Loss', 'Draw') DEFAULT NULL,
    performance_notes TEXT,
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
    CONSTRAINT chk_participant CHECK (
        (player_id IS NOT NULL AND team_id IS NULL) OR 
        (player_id IS NULL AND team_id IS NOT NULL)
    ),
    INDEX idx_match (match_id),
    INDEX idx_player (player_id),
    INDEX idx_team (team_id)
);

-- =====================================================
-- TABLE: GAME_LOGS
-- =====================================================
CREATE TABLE game_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL,
    player_id INT,
    description TEXT,
    FOREIGN KEY (match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    INDEX idx_match (match_id),
    INDEX idx_log_time (log_time)
);

-- =====================================================
-- TABLE: PLAYER_STATISTICS
-- =====================================================
CREATE TABLE player_statistics (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    event_id INT NOT NULL,
    matches_played INT DEFAULT 0,
    matches_won INT DEFAULT 0,
    matches_lost INT DEFAULT 0,
    total_score INT DEFAULT 0,
    average_score DECIMAL(10, 2) DEFAULT 0.00,
    FOREIGN KEY (player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_event (player_id, event_id),
    INDEX idx_player (player_id),
    INDEX idx_event (event_id)
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update current_participants when registration is added
DELIMITER //
CREATE TRIGGER after_registration_insert
AFTER INSERT ON registrations
FOR EACH ROW
BEGIN
    IF NEW.status = 'Confirmed' THEN
        UPDATE events 
        SET current_participants = current_participants + 1
        WHERE event_id = NEW.event_id;
    END IF;
END//
DELIMITER ;

-- Trigger: Update current_participants when registration status changes
DELIMITER //
CREATE TRIGGER after_registration_update
AFTER UPDATE ON registrations
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        IF NEW.status = 'Confirmed' AND OLD.status != 'Confirmed' THEN
            UPDATE events 
            SET current_participants = current_participants + 1
            WHERE event_id = NEW.event_id;
        ELSEIF OLD.status = 'Confirmed' AND NEW.status != 'Confirmed' THEN
            UPDATE events 
            SET current_participants = current_participants - 1
            WHERE event_id = NEW.event_id;
        END IF;
    END IF;
END//
DELIMITER ;

-- Trigger: Update player statistics after match completion
DELIMITER //
CREATE TRIGGER after_match_participant_update
AFTER UPDATE ON match_participants
FOR EACH ROW
BEGIN
    DECLARE v_event_id INT;
    
    IF NEW.result IS NOT NULL AND OLD.result IS NULL AND NEW.player_id IS NOT NULL THEN
        SELECT event_id INTO v_event_id FROM matches WHERE match_id = NEW.match_id;
        
        INSERT INTO player_statistics (player_id, event_id, matches_played, matches_won, matches_lost, total_score)
        VALUES (NEW.player_id, v_event_id, 1, 
                IF(NEW.result = 'Win', 1, 0),
                IF(NEW.result = 'Loss', 1, 0),
                NEW.score)
        ON DUPLICATE KEY UPDATE
            matches_played = matches_played + 1,
            matches_won = matches_won + IF(NEW.result = 'Win', 1, 0),
            matches_lost = matches_lost + IF(NEW.result = 'Loss', 1, 0),
            total_score = total_score + NEW.score,
            average_score = (total_score + NEW.score) / (matches_played + 1);
    END IF;
END//
DELIMITER ;

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert sample admin
INSERT INTO admins (username, email, password_hash, role) VALUES
('admin', 'admin@sportsevent.com', '$2a$10$dummyhash', 'super_admin'),
('manager1', 'manager1@sportsevent.com', '$2a$10$dummyhash', 'event_manager');

-- Insert sample players
INSERT INTO players (first_name, last_name, email, phone, date_of_birth, gender, skill_level) VALUES
('Virat', 'Kohli', 'virat@cricket.com', '9876543210', '1988-11-05', 'Male', 'Advanced'),
('MS', 'Dhoni', 'dhoni@cricket.com', '9876543211', '1981-07-07', 'Male', 'Advanced'),
('Rohit', 'Sharma', 'rohit@cricket.com', '9876543212', '1987-04-30', 'Male', 'Advanced'),
('Hardik', 'Pandya', 'hardik@cricket.com', '9876543213', '1993-10-11', 'Male', 'Intermediate'),
('Rishabh', 'Pant', 'pant@cricket.com', '9876543214', '1997-10-04', 'Male', 'Intermediate'),
('Lionel', 'Messi', 'messi@football.com', '9876543215', '1987-06-24', 'Male', 'Advanced'),
('Cristiano', 'Ronaldo', 'ronaldo@football.com', '9876543216', '1985-02-05', 'Male', 'Advanced'),
('Neymar', 'Jr', 'neymar@football.com', '9876543217', '1992-02-05', 'Male', 'Advanced'),
('Lebron', 'James', 'lebron@basketball.com', '9876543218', '1984-12-30', 'Male', 'Advanced'),
('Stephen', 'Curry', 'curry@basketball.com', '9876543219', '1988-03-14', 'Male', 'Advanced');

-- Insert sample venues
INSERT INTO venues (venue_name, location, capacity, facilities) VALUES
('Wankhede Stadium', 'Mumbai, Maharashtra', 33000, 'Floodlights, Dressing Rooms, Press Box'),
('Eden Gardens', 'Kolkata, West Bengal', 66000, 'Floodlights, VIP Lounge, Commentary Box'),
('Nehru Stadium', 'New Delhi', 25000, 'Indoor Courts, Swimming Pool, Gym'),
('Bangalore Sports Complex', 'Bangalore, Karnataka', 15000, 'Basketball Courts, Tennis Courts'),
('Pune Arena', 'Pune, Maharashtra', 20000, 'Multi-purpose Ground, Parking');

-- Insert sample events
INSERT INTO events (event_name, sport_type, event_type, format, start_date, end_date, registration_deadline, max_participants, is_team_based, created_by) VALUES
('Summer Cricket Championship 2025', 'Cricket', 'Tournament', 'Single Elimination', '2025-11-01', '2025-11-15', '2025-10-25', 16, TRUE, 1),
('City Football League', 'Football', 'League', 'Round Robin', '2025-11-10', '2025-12-20', '2025-11-05', 12, TRUE, 1),
('Basketball Singles Showdown', 'Basketball', 'Knockout', 'Single Elimination', '2025-10-28', '2025-11-02', '2025-10-26', 32, FALSE, 2),
('Winter Tennis Open', 'Tennis', 'Tournament', 'Single Elimination', '2025-12-01', '2025-12-10', '2025-11-25', 64, FALSE, 2);

-- Display confirmation
SELECT 'Database schema created successfully!' AS Status;