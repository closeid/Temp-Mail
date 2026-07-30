CREATE TABLE IF NOT EXISTS admin_access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_admin_access_tokens_token_hash ON admin_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_access_tokens_expires_at ON admin_access_tokens(expires_at);
