-- Intentionally does not create events, alerts, incidents, metrics, or any security data.
-- Optional admin bootstrap only. Replace the hash before production use.
INSERT INTO users (tenant_id, username, password_hash, role)
VALUES ('default', 'admin', '$2b$12$replace_with_real_bcrypt_hash', 'admin')
ON CONFLICT (username) DO NOTHING;
