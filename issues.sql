-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 21, 2026 at 06:15 AM
-- Server version: 10.11.16-MariaDB
-- PHP Version: 8.5.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `isatu_maintenance`
--

-- --------------------------------------------------------

--
-- Table structure for table `issues`
--

CREATE TABLE `issues` (
  `id` int(11) NOT NULL,
  `ticket_code` varchar(20) NOT NULL,
  `issue_type` enum('IT / PC & Network','Electrical','Plumbing','Aircon / HVAC','Furniture / Civil') NOT NULL,
  `location_text` varchar(150) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `description` text NOT NULL,
  `photo_path` varchar(255) DEFAULT NULL,
  `assigned_role` varchar(50) NOT NULL,
  `claimed_by` varchar(100) DEFAULT NULL,
  `report_count` int(11) DEFAULT 1,
  `priority_score` int(11) DEFAULT 1,
  `status` enum('Reported','In Progress','Resolved') DEFAULT 'Reported',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `issues`
--

INSERT INTO `issues` (`id`, `ticket_code`, `issue_type`, `location_text`, `latitude`, `longitude`, `description`, `photo_path`, `assigned_role`, `claimed_by`, `report_count`, `priority_score`, `status`, `created_at`) VALUES
(10, 'GSO-001', 'IT / PC & Network', 'ICT 202', 10.7165124, 122.5666438, 'my pc wont work properly', 'uploads/1795232262_1975.jpg', 'MIS Technician', NULL, 2, 2, 'Resolved', '2026-11-21 03:37:42'),
(11, 'GSO-002', 'Electrical', 'N-Bldg (3-Storey Science Classroom)', 10.7149400, 122.5657732, 'urgent', 'uploads/1795233282_4602.jpg', 'Electrician', NULL, 1, 1, 'Reported', '2026-11-21 03:54:42'),
(12, 'GSO-003', 'Plumbing', 'PE Building (1-Storey)', 10.7145400, 122.5667300, 'flooding', 'uploads/1795233365_7942.jpg', 'Plumber', NULL, 1, 6, 'Resolved', '2026-11-21 03:56:05'),
(13, 'GSO-004', 'IT / PC & Network', 'ICT 202', 10.7165548, 122.5666898, 'Pc not working', 'uploads/1795234541_8690.jpg', 'MIS Technician', 'RENZ MOQUETE', 3, 3, 'In Progress', '2026-11-21 04:15:41'),
(14, 'GSO-005', 'IT / PC & Network', 'cea 102', 10.7163986, 122.5669167, 'ha', 'uploads/1795236353_3433.jpg', 'Electrician', NULL, 1, 1, 'Reported', '2026-11-21 04:45:53'),
(15, 'GSO-006', 'IT / PC & Network', 'ICT 202', 10.7164552, 122.5666159, 'ambot', 'uploads/1795237153_9363.jpg', 'MIS Technician', NULL, 1, 1, 'Reported', '2026-11-21 04:59:13'),
(16, 'GSO-007', 'IT / PC & Network', 'ICT 202', 10.7155000, 122.5673280, 'sadasdasd', 'uploads/1795237313_6831.jpg', 'MIS Technician', NULL, 1, 1, 'Reported', '2026-11-21 05:01:53');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `issues`
--
ALTER TABLE `issues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ticket_code` (`ticket_code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `issues`
--
ALTER TABLE `issues`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
