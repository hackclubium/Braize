ALTER TABLE users ADD COLUMN hackatime_access_token TEXT;
ALTER TABLE projects ADD COLUMN hackatime_project_name TEXT;

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
