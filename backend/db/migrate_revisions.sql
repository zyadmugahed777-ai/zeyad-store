CREATE TABLE IF NOT EXISTS theme_content_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
