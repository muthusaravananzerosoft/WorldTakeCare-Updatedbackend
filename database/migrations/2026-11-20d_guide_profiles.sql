-- Guide Profiles: one public-facing profile row per guide-role user.
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.
--
-- Names are NOT duplicated here — first/last name live on the `user` row and
-- are updated in the same transaction as the profile.
-- `verification_status` and `profile_status` are backend-controlled.

CREATE TABLE IF NOT EXISTS `guide_profiles` (
  `gp_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL COMMENT 'FK user.use_id — one profile per guide',
  `headline` VARCHAR(160) DEFAULT NULL,
  `bio` VARCHAR(2000) DEFAULT NULL,
  `base_city` VARCHAR(120) DEFAULT NULL,
  `country_code` CHAR(2) DEFAULT NULL COMMENT 'ISO-3166 alpha-2',
  `guiding_areas` JSON DEFAULT NULL COMMENT 'Array of area/city names',
  `languages` JSON DEFAULT NULL COMMENT 'Array of language names, max 20',
  `years_of_experience` TINYINT UNSIGNED DEFAULT NULL,
  `specialties` JSON DEFAULT NULL,
  `certification_title` VARCHAR(160) DEFAULT NULL,
  `tour_preferences` JSON DEFAULT NULL COMMENT '{privateTours,groupTours,typicalDuration,maxGroupSize}',
  `hourly_rate` JSON DEFAULT NULL COMMENT '{amount,currency}',
  `contact_phone` VARCHAR(40) DEFAULT NULL,
  `website` VARCHAR(500) DEFAULT NULL,
  `cover_image_url` VARCHAR(500) DEFAULT NULL COMMENT 'Public URL served by media storage',
  `verification_status` ENUM('unverified', 'pending', 'verified', 'rejected') NOT NULL DEFAULT 'unverified',
  `profile_status` ENUM('draft', 'published', 'suspended') NOT NULL DEFAULT 'draft',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`gp_id`),
  UNIQUE KEY `uq_guide_profiles_user` (`user_id`),
  CONSTRAINT `fk_guide_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
