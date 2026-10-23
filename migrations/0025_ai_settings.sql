-- Personal-site AI assistant: one row of Ollama Cloud connection settings.
-- The API key is stored only as AES-GCM ciphertext (see src/server/ai/settings.ts)
-- and is never returned to the browser. This table is deliberately separate
-- from `settings`, whose rows are exposed through the admin feed payload.

CREATE TABLE IF NOT EXISTS ai_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  api_key_ciphertext TEXT,
  api_key_hint TEXT,
  extra_instructions TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
