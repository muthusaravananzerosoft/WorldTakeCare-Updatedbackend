-- Top Tourist Countries ("Featured Countries") — curated cards for the website.
-- One row per country; country_code is UNIQUE so the import script is
-- idempotent (re-running upserts instead of duplicating).
-- Images are stored as Unsplash URLs + attribution, never binary data.
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.

CREATE TABLE IF NOT EXISTS `featured_countries` (
  `fc_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `country_name` VARCHAR(120) NOT NULL,
  `country_code` CHAR(2) NOT NULL COMMENT 'ISO-3166 alpha-2 (UNIQUE — idempotent import)',
  `description` VARCHAR(300) NOT NULL COMMENT 'One-line travel description',
  `keywords` JSON NOT NULL COMMENT 'Exactly 3 travel keywords, e.g. ["Architecture","Foodie","Museums"]',
  `landmark_name` VARCHAR(160) NOT NULL COMMENT 'Famous attraction shown in the image, e.g. Eiffel Tower',
  `image_url` VARCHAR(500) DEFAULT NULL COMMENT 'Hotlinked Unsplash image URL',
  `image_provider` VARCHAR(30) DEFAULT NULL COMMENT 'e.g. unsplash',
  `image_id` VARCHAR(64) DEFAULT NULL COMMENT 'Provider photo id',
  `photographer_name` VARCHAR(120) DEFAULT NULL,
  `photographer_url` VARCHAR(500) DEFAULT NULL COMMENT 'Unsplash profile URL (required attribution)',
  `image_source_url` VARCHAR(500) DEFAULT NULL COMMENT 'Unsplash photo page URL',
  `display_order` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = hidden / needs manual review',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`fc_id`),
  UNIQUE KEY `uq_fc_country_code` (`country_code`),
  KEY `idx_fc_active_order` (`is_active`, `display_order`),
  KEY `idx_fc_name` (`country_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
