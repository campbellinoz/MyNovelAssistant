-- MyNovelCraft Database Export Commands
-- Run these on your Neon database to export all data

-- Export all tables structure and data
-- Replace 'your_connection_string' with your actual DATABASE_URL

-- Full database dump (recommended)
pg_dump your_connection_string > mynovelcraft_full_backup.sql

-- Individual table exports (if needed)
COPY users TO '/tmp/users.csv' DELIMITER ',' CSV HEADER;
COPY projects TO '/tmp/projects.csv' DELIMITER ',' CSV HEADER;  
COPY chapters TO '/tmp/chapters.csv' DELIMITER ',' CSV HEADER;
COPY characters TO '/tmp/characters.csv' DELIMITER ',' CSV HEADER;
COPY ai_chat_messages TO '/tmp/ai_chat_messages.csv' DELIMITER ',' CSV HEADER;
COPY ai_suggestions TO '/tmp/ai_suggestions.csv' DELIMITER ',' CSV HEADER;
COPY audiobooks TO '/tmp/audiobooks.csv' DELIMITER ',' CSV HEADER;
COPY support_tickets TO '/tmp/support_tickets.csv' DELIMITER ',' CSV HEADER;
COPY copyright_info TO '/tmp/copyright_info.csv' DELIMITER ',' CSV HEADER;

-- Check data counts before export
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL  
SELECT 'chapters', COUNT(*) FROM chapters
UNION ALL
SELECT 'characters', COUNT(*) FROM characters
UNION ALL
SELECT 'audiobooks', COUNT(*) FROM audiobooks;