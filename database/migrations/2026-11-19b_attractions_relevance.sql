-- Attractions quality upgrade: tourist relevance, English/original names,
-- featured flag, and a curated-attractions layer.
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.

-- Provider-cached POIs: relevance score + naming fields.
ALTER TABLE `attractions`
  ADD COLUMN `original_name` VARCHAR(200) DEFAULT NULL COMMENT 'Provider raw name when it differs (e.g. Tamil script)' AFTER `name`,
  ADD COLUMN `tourist_relevance` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Computed 0-100 category-based relevance' AFTER `distance_m`,
  ADD COLUMN `is_featured` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Highlighted/verified tourist spot' AFTER `tourist_relevance`;

-- Manually curated famous attractions. Rows link to a destination loosely:
-- by city name (+country) or by coordinates inside the search radius —
-- no FK, so curation works for any place worldwide without knowing ids.
CREATE TABLE IF NOT EXISTS `curated_attractions` (
  `cur_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL COMMENT 'Display name (English preferred)',
  `original_name` VARCHAR(200) DEFAULT NULL COMMENT 'Local-script name',
  `category` VARCHAR(160) DEFAULT NULL,
  `lat` DECIMAL(9,6) NOT NULL,
  `lng` DECIMAL(9,6) NOT NULL,
  `city` VARCHAR(120) NOT NULL,
  `admin1` VARCHAR(120) DEFAULT NULL,
  `country_code` CHAR(2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cur_id`),
  UNIQUE KEY `uq_curated` (`country_code`, `city`, `name`),
  KEY `idx_curated_geo` (`lat`, `lng`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Initial seed curation (verified coordinates).
-- Madurai
INSERT INTO `curated_attractions`
  (`name`, `category`, `lat`, `lng`, `city`, `admin1`, `country_code`) VALUES
  ('Meenakshi Amman Temple', 'hindu temple', 9.9195, 78.1188, 'Madurai', 'Tamil Nadu', 'IN'),
  ('Thirumalai Nayakkar Palace', 'palace', 9.9147, 78.1239, 'Madurai', 'Tamil Nadu', 'IN'),
  ('Gandhi Memorial Museum', 'museum', 9.9299, 78.1386, 'Madurai', 'Tamil Nadu', 'IN'),
  ('Samanar Hills', 'historic site', 9.9243, 78.0447, 'Madurai', 'Tamil Nadu', 'IN'),
  ('Azhagar Kovil', 'hindu temple', 10.0742, 78.2130, 'Madurai', 'Tamil Nadu', 'IN'),
-- Ooty (Udhagamandalam)
  ('Ooty Lake', 'lake', 11.4034, 76.6917, 'Udhagamandalam', 'Tamil Nadu', 'IN'),
  ('Government Botanical Garden', 'botanical garden', 11.4193, 76.7120, 'Udhagamandalam', 'Tamil Nadu', 'IN'),
  ('Doddabetta Peak', 'mountain peak', 11.4007, 76.7357, 'Udhagamandalam', 'Tamil Nadu', 'IN'),
  ('Government Rose Garden', 'garden', 11.4078, 76.7033, 'Udhagamandalam', 'Tamil Nadu', 'IN'),
  ('Pykara Lake', 'lake', 11.4663, 76.6035, 'Udhagamandalam', 'Tamil Nadu', 'IN'),
  ('Nilgiri Mountain Railway', 'heritage railway', 11.3993, 76.6900, 'Udhagamandalam', 'Tamil Nadu', 'IN'),
-- Paris (worldwide coverage — mega-cities need curation: provider slices
-- miss landmarks that sit outside the dense core)
  ('Eiffel Tower', 'tower', 48.8583, 2.2945, 'Paris', 'Île-de-France', 'FR'),
  ('Louvre Museum', 'museum', 48.8606, 2.3376, 'Paris', 'Île-de-France', 'FR'),
  ('Arc de Triomphe', 'monument', 48.8738, 2.2950, 'Paris', 'Île-de-France', 'FR'),
  ('Cathédrale Notre-Dame de Paris', 'cathedral', 48.8530, 2.3499, 'Paris', 'Île-de-France', 'FR'),
  ('Sacré-Cœur Basilica', 'basilica', 48.8867, 2.3431, 'Paris', 'Île-de-France', 'FR'),
  ('Musée d''Orsay', 'museum', 48.8600, 2.3266, 'Paris', 'Île-de-France', 'FR');
