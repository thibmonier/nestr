-- Schéma D1 Nestr (Phase 4)

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  google_sub  TEXT UNIQUE NOT NULL,
  email       TEXT,
  name        TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

-- Liste de tâches complète par utilisateur (blob JSON, last-write-wins).
CREATE TABLE IF NOT EXISTS tasks (
  user_id     TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preferences (
  user_id     TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Identifiants calendrier chiffrés (provider = 'google' | 'apple').
CREATE TABLE IF NOT EXISTS calendar_credentials (
  user_id     TEXT NOT NULL,
  provider    TEXT NOT NULL,
  enc         TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (user_id, provider)
);

-- Config IA chiffrée par utilisateur (provider + clé API). Un provider actif par user.
CREATE TABLE IF NOT EXISTS ai_credentials (
  user_id     TEXT PRIMARY KEY,
  provider    TEXT NOT NULL,
  enc         TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
