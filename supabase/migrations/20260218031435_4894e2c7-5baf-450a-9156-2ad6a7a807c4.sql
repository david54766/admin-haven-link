
-- Insert mock training hours for demo users (bypasses RLS as superuser)
INSERT INTO staff_hours_log (user_id, date, hours, category, description) VALUES
-- Sarah Johnson (139d7fb5)
('139d7fb5-af55-45b3-b3c4-d9e9ec679726', '2026-01-10', 3.0, 'workshop', 'Positive Discipline Workshop'),
('139d7fb5-af55-45b3-b3c4-d9e9ec679726', '2026-01-18', 2.0, 'conference', 'State Early Learning Conference'),
('139d7fb5-af55-45b3-b3c4-d9e9ec679726', '2026-01-25', 1.5, 'online', 'Trauma-Informed Care Webinar'),
('139d7fb5-af55-45b3-b3c4-d9e9ec679726', '2026-02-05', 2.5, 'workshop', 'Curriculum Planning Session'),
-- Michael Chen (4d3cb402)
('4d3cb402-111c-421d-a050-260df0175050', '2026-01-12', 2.0, 'online', 'Classroom Management Strategies'),
('4d3cb402-111c-421d-a050-260df0175050', '2026-01-28', 1.5, 'workshop', 'Art Integration in ECE'),
('4d3cb402-111c-421d-a050-260df0175050', '2026-02-10', 3.0, 'conference', 'Regional Educator Summit'),
-- Emily Rodriguez (d17568da)
('d17568da-81c2-444b-b1cb-5de12147b88f', '2026-01-08', 2.0, 'workshop', 'Pre-K Literacy Foundations'),
('d17568da-81c2-444b-b1cb-5de12147b88f', '2026-01-20', 1.5, 'online', 'Math Through Play'),
('d17568da-81c2-444b-b1cb-5de12147b88f', '2026-02-01', 2.5, 'workshop', 'STEM Activities for Young Learners'),
('d17568da-81c2-444b-b1cb-5de12147b88f', '2026-02-12', 1.0, 'online', 'Social-Emotional Learning Basics'),
-- David Thompson (72974cba)
('72974cba-f183-471e-a616-131d49daea55', '2026-01-15', 2.0, 'workshop', 'Infant Safe Sleep Practices'),
('72974cba-f183-471e-a616-131d49daea55', '2026-01-30', 1.5, 'online', 'Developmental Milestones 0-12 Months'),
('72974cba-f183-471e-a616-131d49daea55', '2026-02-08', 2.0, 'workshop', 'Responsive Caregiving Techniques'),
-- Jessica Williams (b7c4b193)
('b7c4b193-41a1-4f69-a78d-8d7c73889f50', '2026-01-06', 1.5, 'online', 'Toddler Nutrition and Feeding'),
('b7c4b193-41a1-4f69-a78d-8d7c73889f50', '2026-01-22', 2.0, 'workshop', 'Sensory Play Activities'),
('b7c4b193-41a1-4f69-a78d-8d7c73889f50', '2026-02-03', 3.0, 'conference', 'Toddler Development Conference'),
('b7c4b193-41a1-4f69-a78d-8d7c73889f50', '2026-02-14', 1.0, 'online', 'Biting Prevention Strategies'),
-- Robert Davis (6574e81f)
('6574e81f-2e83-47f9-b609-8ba9c82e63a5', '2026-01-09', 1.5, 'online', 'Flexible Classroom Support'),
('6574e81f-2e83-47f9-b609-8ba9c82e63a5', '2026-02-06', 2.0, 'workshop', 'Behavior Guidance Refresher'),
-- Amanda Martinez (e8721e35)
('e8721e35-e1dc-4724-a6ff-20d252311a2c', '2026-01-14', 2.0, 'workshop', 'Inclusive Practices in ECE'),
('e8721e35-e1dc-4724-a6ff-20d252311a2c', '2026-01-29', 1.0, 'online', 'Cultural Responsiveness Training'),
('e8721e35-e1dc-4724-a6ff-20d252311a2c', '2026-02-11', 1.5, 'online', 'Supporting Dual Language Learners'),
-- James Wilson (44c57b3f)
('44c57b3f-a5cd-41f7-a833-11b6b7d58d4e', '2026-01-11', 2.0, 'workshop', 'Child Nutrition Standards Update'),
('44c57b3f-a5cd-41f7-a833-11b6b7d58d4e', '2026-01-26', 1.5, 'online', 'Food Allergy Safety Protocols'),
('44c57b3f-a5cd-41f7-a833-11b6b7d58d4e', '2026-02-09', 2.0, 'workshop', 'Kitchen Sanitation Best Practices'),
-- Lisa Brown (73498bc7)
('73498bc7-f5be-49d6-a816-09c082bafcfd', '2026-01-07', 2.0, 'workshop', 'School Bus Safety Training'),
('73498bc7-f5be-49d6-a816-09c082bafcfd', '2026-01-19', 1.5, 'online', 'Emergency Evacuation Procedures'),
('73498bc7-f5be-49d6-a816-09c082bafcfd', '2026-02-04', 1.0, 'online', 'First Aid Refresher'),
-- Christopher Lee (1e0a5526)
('1e0a5526-d580-4d0d-ada0-b9e24b7855c3', '2026-01-13', 2.0, 'workshop', 'Administrative Record Keeping'),
('1e0a5526-d580-4d0d-ada0-b9e24b7855c3', '2026-01-27', 1.5, 'online', 'HIPAA & FERPA Compliance'),
('1e0a5526-d580-4d0d-ada0-b9e24b7855c3', '2026-02-07', 2.5, 'conference', 'ECE Administration Conference');
