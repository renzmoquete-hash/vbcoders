-- ============================================================
-- ISATU Campus Maintenance & Issue Reporting
-- Track 3 | Backend by: Laptop B Developer
-- Database: isatu_maintenance
-- ============================================================

-- Create the database if it doesn't exist yet
CREATE DATABASE IF NOT EXISTS isatu_maintenance;

-- Tell MySQL to use this database going forward
USE isatu_maintenance;

-- ============================================================
-- TABLE: issues
-- This is the main table that stores all reported maintenance tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS issues (

    -- Auto-incrementing primary key (unique number for each row)
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Human-readable ticket code like "GSO-001", must be unique
    ticket_code VARCHAR(20) NOT NULL UNIQUE,

    -- Type of issue being reported (only these exact values are allowed)
    issue_type ENUM(
        'IT / PC & Network',
        'Electrical',
        'Plumbing',
        'Aircon / HVAC',
        'Furniture / Civil'
    ) NOT NULL,

    -- Plain-text description of where the issue is (e.g. "Room 201, Engineering Building")
    location_text VARCHAR(150) NOT NULL,

    -- GPS coordinates of the issue (latitude and longitude)
    latitude  DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,

    -- Detailed description of the problem
    description TEXT NOT NULL,

    -- Optional: path to an uploaded photo (NULL means no photo)
    photo_path VARCHAR(255) NULL,

    -- The department/role responsible for fixing this (e.g. "MIS Technician")
    assigned_role VARCHAR(50) NOT NULL,

    -- Name of the technician who claimed/accepted the ticket (NULL = unclaimed)
    claimed_by VARCHAR(100) NULL,

    -- How many people reported this same issue (starts at 1, increases on merge)
    report_count INT DEFAULT 1,

    -- Urgency score used for sorting (higher = more urgent)
    priority_score INT DEFAULT 1,

    -- Current status of the ticket
    status ENUM('Reported', 'In Progress', 'Resolved') DEFAULT 'Reported',

    -- Timestamp of when the ticket was first created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

-- ============================================================
-- SAMPLE DATA: 5 initial tickets across ISATU Main Campus
-- ============================================================

INSERT INTO issues
    (ticket_code, issue_type, location_text, latitude, longitude, description, assigned_role, priority_score, status)
VALUES

    -- Ticket 1: MIS problem in the Admin building
    (
        'GSO-001',
        'IT / PC & Network',
        'Admin Building, Room 105 - Registrar Office',
        10.7158000,
        122.5654000,
        'The desktop computer at the registrar window freezes every few minutes. Students cannot be served properly.',
        'MIS Technician',
        1,
        'Reported'
    ),

    -- Ticket 2: Electrical issue in the Engineering building (high priority — "no power")
    (
        'GSO-002',
        'Electrical',
        'Engineering Building, 2nd Floor Corridor',
        10.7156000,
        122.5662000,
        'There is no power on the entire 2nd floor corridor. Some outlets are sparking near the staircase.',
        'Electrician',
        6,
        'In Progress'
    ),

    -- Ticket 3: Plumbing issue in the CIT building
    (
        'GSO-003',
        'Plumbing',
        'CIT Building, Ground Floor Male Comfort Room',
        10.7151000,
        122.5664000,
        'The sink faucet has been leaking non-stop for two days. The floor is wet and becoming a hazard.',
        'Plumber',
        3,
        'Reported'
    ),

    -- Ticket 4: Aircon broken in the Library
    (
        'GSO-004',
        'Aircon / HVAC',
        'Library, 2nd Floor Reading Area',
        10.7161000,
        122.5657000,
        'All three air conditioning units on the 2nd floor reading area are not cooling. The room is very hot.',
        'HVAC Tech',
        1,
        'Reported'
    ),

    -- Ticket 5: Furniture damage in the Education building (already resolved)
    (
        'GSO-005',
        'Furniture / Civil',
        'Education Building, Room 302 - Classroom',
        10.7154000,
        122.5649000,
        'Three student chairs are broken and one of the classroom doors cannot be fully closed.',
        'General Maintenance',
        1,
        'Resolved'
    );
