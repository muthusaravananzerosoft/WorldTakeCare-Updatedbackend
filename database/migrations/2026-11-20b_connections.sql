-- Member–Guide Connections: direct connection requests between members and guides.
-- Apply on the `worldtaker` dev DB and the production DB in phpMyAdmin.
--
-- One row per (member, guide) pair — a re-request after `declined`
-- re-opens the same row instead of inserting a duplicate.
-- `status = 'accepted'` is the gate future Chat APIs must check.

CREATE TABLE IF NOT EXISTS `connections` (
  `conn_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id` BIGINT NOT NULL COMMENT 'FK user.use_id — member user',
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
  UNIQUE KEY `uq_connections_pair` (`member_id`, `guide_id`),
  KEY `idx_connections_member` (`member_id`, `status`),
  KEY `idx_connections_guide` (`guide_id`, `status`),
  KEY `idx_connections_recipient` (`recipient_user_id`, `status`),
  KEY `idx_connections_requester` (`requester_user_id`),
  CONSTRAINT `fk_connections_member` FOREIGN KEY (`member_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_connections_guide` FOREIGN KEY (`guide_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_connections_requester` FOREIGN KEY (`requester_user_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_connections_recipient` FOREIGN KEY (`recipient_user_id`) REFERENCES `user` (`use_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
