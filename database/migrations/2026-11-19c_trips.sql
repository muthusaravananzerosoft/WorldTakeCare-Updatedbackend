-- My Trips: trips + child tables for multi-value fields.
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.

CREATE TABLE IF NOT EXISTS `trips` (
  `trip_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT 'FK user.use_id — trip owner',
  `destination_id` INT UNSIGNED DEFAULT NULL COMMENT 'FK destinations.dst_id; nullable so a deleted destination keeps the trip',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `trip_type` VARCHAR(40) DEFAULT NULL COMMENT 'family, solo, friends, couple, business, ...',
  `notes` TEXT DEFAULT NULL,
  `accommodation` VARCHAR(60) DEFAULT NULL,
  `ec_name` VARCHAR(120) DEFAULT NULL COMMENT 'Emergency contact name',
  `ec_phone` VARCHAR(40) DEFAULT NULL COMMENT 'Emergency contact phone',
  `ins_provider` VARCHAR(160) DEFAULT NULL COMMENT 'Insurance provider',
  `ins_number` VARCHAR(80) DEFAULT NULL COMMENT 'Insurance policy number',
  `budget_amount` DECIMAL(12,2) DEFAULT NULL,
  `budget_currency` CHAR(3) DEFAULT NULL COMMENT 'ISO-4217 code',
  `visibility` ENUM('public', 'private', 'friends') NOT NULL DEFAULT 'private',
  `status` ENUM('planned', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'planned',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`trip_id`),
  KEY `idx_trips_user` (`user_id`, `created_at`),
  KEY `idx_trips_destination` (`destination_id`),
  CONSTRAINT `fk_trips_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_trips_destination` FOREIGN KEY (`destination_id`) REFERENCES `destinations` (`dst_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Multi-value fields live in child tables (queryable, no CSV).
CREATE TABLE IF NOT EXISTS `trip_interests` (
  `trip_id` INT UNSIGNED NOT NULL,
  `interest` VARCHAR(60) NOT NULL,
  PRIMARY KEY (`trip_id`, `interest`),
  CONSTRAINT `fk_interests_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`trip_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `trip_dietary_preferences` (
  `trip_id` INT UNSIGNED NOT NULL,
  `preference` VARCHAR(60) NOT NULL,
  PRIMARY KEY (`trip_id`, `preference`),
  CONSTRAINT `fk_dietary_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`trip_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
