<<<<<<< HEAD
-- Member–Guide Connections: direct connection requests between members and guides.
-- Apply on the `worldtaker` dev DB and the production DB in phpMyAdmin.
--
-- One row per (member, guide) pair — a re-request after `declined`
=======
-- Member–Guide Connections: connection requests between trip members and guides.
-- Apply on the `worldtakecare` dev DB and the production DB in phpMyAdmin.
--
-- One row per (trip, member, guide) pair — a re-request after `declined`
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
-- re-opens the same row instead of inserting a duplicate.
-- `status = 'accepted'` is the gate future Chat APIs must check.

CREATE TABLE IF NOT EXISTS `connections` (
  `conn_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
<<<<<<< HEAD
  `member_id` BIGINT NOT NULL COMMENT 'FK user.use_id — member user',
=======
  `trip_id` INT UNSIGNED NOT NULL COMMENT 'FK trips.trip_id — the member trip the request relates to',
  `member_id` BIGINT NOT NULL COMMENT 'FK user.use_id — trip owner',
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  `guide_id` BIGINT NOT NULL COMMENT 'FK user.use_id — guide-role user',
  `requester_user_id` BIGINT NOT NULL COMMENT 'FK user.use_id — who sent the request',
  `recipient_user_id` BIGINT NOT NULL COMMENT 'FK user.use_id — who must respond',
  `requester_role` ENUM('member', 'guide') NOT NULL,
  `status` ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
  `requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`conn_id`),
<<<<<<< HEAD
  UNIQUE KEY `uq_connections_pair` (`member_id`, `guide_id`),
=======
  UNIQUE KEY `uq_connections_pair` (`trip_id`, `member_id`, `guide_id`),
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  KEY `idx_connections_member` (`member_id`, `status`),
  KEY `idx_connections_guide` (`guide_id`, `status`),
  KEY `idx_connections_recipient` (`recipient_user_id`, `status`),
  KEY `idx_connections_requester` (`requester_user_id`),
<<<<<<< HEAD
=======
  CONSTRAINT `fk_connections_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`trip_id`) ON DELETE CASCADE,
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  CONSTRAINT `fk_connections_member` FOREIGN KEY (`member_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_connections_guide` FOREIGN KEY (`guide_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_connections_requester` FOREIGN KEY (`requester_user_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_connections_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
