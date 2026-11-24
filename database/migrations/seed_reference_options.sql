-- Seed reference option tables (extracted from legacy worldtaker.sql)

-- education_level
INSERT INTO `education_level` (`edu_id`, `name`, `body`, `priority`, `lang`) VALUES
(1, 'High School/GED', 'High School/GED', 2, 'en'),
(2, 'Some College', 'Some College', 3, 'en'),
(3, 'Some University', 'Some University', 1, 'en'),
(4, 'Associates Degree', 'Associates Degree', 4, 'en'),
(5, 'Graduate Degree', 'Graduate Degree', 5, 'en'),
(6, 'Bachelors Degree', 'Bachelors Degree', 6, 'en'),
(7, 'Masters Degree', 'Masters Degree', 7, 'en'),
(8, 'PhD / Post Doctoral', 'PhD / Post Doctoral', 8, 'en');

-- height
INSERT INTO `height` (`hei_id`, `name`, `body`, `priority`) VALUES
(1, '4\' 8\" (142 cm)', '4\' 8\" (142 cm)', 1),
(2, '4\' 9\" (144 cm)', '4\' 9\" (144 cm)', 2),
(3, '4\' 10\" (147 cm)', '4\' 10\" (147 cm)', 3),
(11, '5\' 6\" (167 cm)', '5\' 6\" (167 cm)', 4),
(12, '5\' 7\" (170 cm)', '5\' 7\" (170 cm)', 5),
(13, '5\' 8\" (172 cm)', '5\' 8\" (172 cm)', 6),
(14, '5\' 9\" (175 cm)', '5\' 9\" (175 cm)', 7),
(15, '5\' 10\" (177 cm)', '5\' 10\" (177 cm)', 8),
(16, '5\' 11\" (180 cm)', '5\' 11\" (180 cm)', 9),
(17, '6\' 0\" (183 cm)', '6\' 0\" (183 cm)', 10),
(18, '6\' 1\" (185 cm)', '6\' 1\" (185 cm)', 11),
(19, '6\' 2\" (188 cm)', '6\' 2\" (188 cm)', 12),
(20, '6\' 3\" (190 cm)', '6\' 3\" (190 cm)', 13);

-- race
INSERT INTO `race` (`rac_id`, `name`, `body`, `priority`, `lang`) VALUES
(1, 'Black', 'Black', 1, 'en'),
(2, 'Asian', 'Asian', 2, 'en'),
(3, 'European', 'European', 3, 'en'),
(4, 'Hispanic / Latino', 'Hispanic / Latino', 4, 'en'),
(5, 'Native American', 'Native American', 5, 'en'),
(6, 'White', 'White', 6, 'en'),
(7, 'Middle Eastern', 'Middle Eastern', 7, 'en'),
(8, 'Other', 'Other', 9, 'en'),
(9, 'Mixed Races', 'Mixed Races', 8, 'en');

