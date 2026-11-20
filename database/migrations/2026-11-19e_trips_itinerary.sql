-- Day-wise itinerary stored on the trips row as a JSON array.
-- `JSON` is a LONGTEXT alias with a JSON_VALID check on MariaDB and a native
-- binary JSON type on MySQL — the syntax works on both.
-- Apply once on the dev DB and on production in phpMyAdmin (plain ALTER —
-- re-running it raises a duplicate-column error, which is harmless).

ALTER TABLE `trips`
  ADD COLUMN `itinerary` JSON DEFAULT NULL
  COMMENT 'Day plan: [{day, stops:[{attractionId, order, time, note}]}] — attractionId references attractions.att_id / curated_attractions.cur_id';
