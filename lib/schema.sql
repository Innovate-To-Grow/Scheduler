CREATE TABLE IF NOT EXISTS event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  start_hour INTEGER NOT NULL DEFAULT 9,
  end_hour INTEGER NOT NULL DEFAULT 17,
  days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',
  mode TEXT NOT NULL DEFAULT 'inperson',
  location TEXT NOT NULL DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_code ON event(code);

CREATE TABLE IF NOT EXISTS participant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  schedule_inperson TEXT NOT NULL,
  schedule_virtual TEXT NOT NULL,
  submitted INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
  UNIQUE(event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_participant_event ON participant(event_id);

CREATE TABLE IF NOT EXISTS participant_weight (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  participant_name TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  included INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (event_id) REFERENCES event(id) ON DELETE CASCADE,
  UNIQUE(event_id, participant_name)
);
