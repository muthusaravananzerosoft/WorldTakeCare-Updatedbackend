-- Connections: make trip_id optional (direct member↔guide requests without a trip).
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.
--
-- `trip_pair` keeps the (trip, member, guide) uniqueness working for NULL
-- trips — MySQL treats NULLs as distinct in UNIQUE keys, so the pair key
-- normalizes NULL to 0.

ALTER TABLE `connections`
  MODIFY COLUMN `trip_id` INT UNSIGNED NULL DEFAULT NULL
    COMMENT 'FK trips.trip_id — optional; NULL = direct request without a trip';

ALTER TABLE `connections`
  ADD COLUMN `trip_pair` INT UNSIGNED GENERATED ALWAYS AS (COALESCE(`trip_id`, 0)) PERSISTENT AFTER `trip_id`,
  DROP INDEX `uq_connections_pair`,
  ADD KEY `idx_connections_trip` (`trip_id`),
  ADD UNIQUE KEY `uq_connections_pair` (`trip_pair`, `member_id`, `guide_id`);
