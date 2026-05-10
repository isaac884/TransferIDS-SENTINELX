CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tenants (id, name)
VALUES ('default', 'Default Tenant')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'analyst',
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    event_id TEXT UNIQUE,
    source_reference TEXT,
    row_number INTEGER,
    source_ip TEXT,
    destination_ip TEXT,
    verdict TEXT,
    classification_scope TEXT DEFAULT 'binary',
    attack_family TEXT,
    attack_family_source TEXT,
    confidence DOUBLE PRECISION DEFAULT 0,
    threshold DOUBLE PRECISION DEFAULT 0,
    severity TEXT NOT NULL DEFAULT 'low',
    risk_score DOUBLE PRECISION DEFAULT 0,
    model_name TEXT,
    model_version TEXT,
    dataset_origin TEXT,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    incident_id TEXT UNIQUE NOT NULL,
    source_event_id TEXT,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'P3',
    status TEXT NOT NULL DEFAULT 'New',
    severity TEXT NOT NULL DEFAULT 'low',
    confidence DOUBLE PRECISION DEFAULT 0,
    risk_score DOUBLE PRECISION DEFAULT 0,
    assignee TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    job_id TEXT UNIQUE NOT NULL,
    source_reference TEXT NOT NULL,
    status TEXT NOT NULL,
    records_processed INTEGER NOT NULL DEFAULT 0,
    events_created INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    metric_name TEXT NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    event_id TEXT,
    analyst TEXT,
    verdict TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
