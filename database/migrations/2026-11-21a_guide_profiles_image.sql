-- Guide Profiles: add profile photo field (mirrors cover_image_url).
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.

ALTER TABLE `guide_profiles`
  ADD COLUMN `profile_image_url` VARCHAR(500) DEFAULT NULL
    COMMENT 'Public URL served by media storage' AFTER `cover_image_url`;
