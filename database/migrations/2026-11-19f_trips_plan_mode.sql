-- Trip plan mode: whether the itinerary was auto-generated or hand-built.
-- Restored by the frontend when the user reopens the trip roadmap.
-- Apply once (plain ALTER — re-running raises a duplicate-column error).

ALTER TABLE `trips`
  ADD COLUMN `plan_mode` ENUM('auto', 'manual') NOT NULL DEFAULT 'auto'
  COMMENT 'How the itinerary was built; itinerary column is meaningful for manual plans';
