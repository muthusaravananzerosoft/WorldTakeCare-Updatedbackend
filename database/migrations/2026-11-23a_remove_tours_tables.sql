-- Remove Tours & Travels tables — destination/attraction/trip/featured-country
-- modules were dropped from the codebase; these tables are exclusive to them.
-- Apply on the `worldtakecare`/`worldtaker` dev DB and the production DB in phpMyAdmin.
--
-- `connections` is PRESERVED — only its trip linkage is removed so it becomes
-- a pure member↔guide table (trip data is discarded with the trips table).

-- 1) Detach connections from trips first (FK would block the trips drop).
ALTER TABLE `connections`
  DROP FOREIGN KEY `fk_connections_trip`,
  DROP INDEX `uq_connections_pair`,
  DROP INDEX `idx_connections_trip`,
  DROP COLUMN `trip_pair`,
  DROP COLUMN `trip_id`,
  ADD UNIQUE KEY `uq_connections_pair` (`member_id`, `guide_id`);

-- 2) Trip children, then trips, then attraction/destination/featured tables.
DROP TABLE IF EXISTS `trip_dietary_preferences`;
DROP TABLE IF EXISTS `trip_interests`;
DROP TABLE IF EXISTS `trips`;
DROP TABLE IF EXISTS `curated_attractions`;
DROP TABLE IF EXISTS `attractions`;
DROP TABLE IF EXISTS `destinations`;
DROP TABLE IF EXISTS `featured_countries`;
