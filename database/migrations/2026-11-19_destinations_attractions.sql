-- Destination search + attraction cache (destination search module).
-- Canonical destination rows are materialised on demand from the legacy
-- reference tables (countries / country_states / country_state_cities) or
-- from the external places provider — one id space for every result.
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.

CREATE TABLE IF NOT EXISTS `destinations` (
  `dst_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kind` ENUM('country','state','city','place') NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `admin1` VARCHAR(120) DEFAULT NULL COMMENT 'State / region name',
  `country_code` CHAR(2) DEFAULT NULL COMMENT 'ISO-3166 alpha-2',
  `country_name` VARCHAR(100) DEFAULT NULL,
  `lat` DECIMAL(9,6) DEFAULT NULL,
  `lng` DECIMAL(9,6) DEFAULT NULL,
  `source` VARCHAR(20) NOT NULL COMMENT 'legacy | opentripmap',
  `source_id` VARCHAR(128) NOT NULL COMMENT 'cit_id/sta_id/con_id or provider place id',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dst_id`),
  UNIQUE KEY `uq_destination_source` (`kind`, `source`, `source_id`),
  KEY `idx_destination_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `attractions` (
  `att_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `destination_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(160) DEFAULT NULL,
  `lat` DECIMAL(9,6) NOT NULL,
  `lng` DECIMAL(9,6) NOT NULL,
  `rate` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Provider fame score 0-7',
  `distance_m` INT UNSIGNED DEFAULT NULL COMMENT 'Distance from destination centre',
  `source` VARCHAR(20) NOT NULL,
  `source_id` VARCHAR(128) NOT NULL COMMENT 'Provider POI id (Geoapify place_id)',
  `fetched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`att_id`),
  UNIQUE KEY `uq_attraction_source` (`source`, `source_id`),
  KEY `idx_attraction_destination` (`destination_id`),
  CONSTRAINT `fk_attraction_destination`
    FOREIGN KEY (`destination_id`) REFERENCES `destinations` (`dst_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
