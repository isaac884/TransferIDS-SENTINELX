"""Initial TransferIDS web3 persistence schema.

Revision ID: 20260509_0001
Revises:
Create Date: 2026-05-09
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260509_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("username", sa.String(length=128), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_users_tenant_id", "users", ["tenant_id"])
    op.create_index("ix_users_username", "users", ["username"])

    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("event_id", sa.String(length=64), nullable=False),
        sa.Column("source_reference", sa.String(length=255), nullable=True),
        sa.Column("row_number", sa.Integer(), nullable=True),
        sa.Column("source_ip", sa.String(length=64), nullable=True),
        sa.Column("destination_ip", sa.String(length=64), nullable=True),
        sa.Column("verdict", sa.String(length=64), nullable=True),
        sa.Column("classification_scope", sa.String(length=64), nullable=True),
        sa.Column("attack_family", sa.String(length=128), nullable=True),
        sa.Column("attack_family_source", sa.String(length=128), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("threshold", sa.Float(), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.Column("model_name", sa.String(length=128), nullable=True),
        sa.Column("model_version", sa.String(length=128), nullable=True),
        sa.Column("dataset_origin", sa.String(length=128), nullable=True),
        sa.Column("features", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint("event_id"),
    )
    op.create_index("ix_events_tenant_id", "events", ["tenant_id"])
    op.create_index("ix_events_event_id", "events", ["event_id"])
    op.create_index("ix_events_source_ip", "events", ["source_ip"])
    op.create_index("ix_events_destination_ip", "events", ["destination_ip"])
    op.create_index("ix_events_verdict", "events", ["verdict"])
    op.create_index("ix_events_severity", "events", ["severity"])

    op.create_table(
        "incidents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("incident_id", sa.String(length=64), nullable=False),
        sa.Column("source_event_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("priority", sa.String(length=16), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.Column("assignee", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint("incident_id"),
    )
    op.create_index("ix_incidents_tenant_id", "incidents", ["tenant_id"])
    op.create_index("ix_incidents_incident_id", "incidents", ["incident_id"])
    op.create_index("ix_incidents_source_event_id", "incidents", ["source_event_id"])
    op.create_index("ix_incidents_priority", "incidents", ["priority"])
    op.create_index("ix_incidents_severity", "incidents", ["severity"])

    op.create_table(
        "ingestion_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("job_id", sa.String(length=64), nullable=False),
        sa.Column("source_reference", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("records_processed", sa.Integer(), nullable=True),
        sa.Column("events_created", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.UniqueConstraint("job_id"),
    )
    op.create_index("ix_ingestion_jobs_tenant_id", "ingestion_jobs", ["tenant_id"])
    op.create_index("ix_ingestion_jobs_job_id", "ingestion_jobs", ["job_id"])
    op.create_index("ix_ingestion_jobs_status", "ingestion_jobs", ["status"])

    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("event_id", sa.String(length=64), nullable=True),
        sa.Column("analyst", sa.String(length=128), nullable=True),
        sa.Column("verdict", sa.String(length=64), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_reviews_tenant_id", "reviews", ["tenant_id"])
    op.create_index("ix_reviews_event_id", "reviews", ["event_id"])
    op.create_index("ix_reviews_verdict", "reviews", ["verdict"])

    op.create_table(
        "metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("metric_name", sa.String(length=128), nullable=False),
        sa.Column("metric_value", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_metrics_tenant_id", "metrics", ["tenant_id"])
    op.create_index("ix_metrics_metric_name", "metrics", ["metric_name"])

    op.create_table(
        "daily_metrics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("metric_date", sa.Date(), nullable=True),
        sa.Column("raw_observations", sa.Integer(), nullable=True),
        sa.Column("materialized_events", sa.Integer(), nullable=True),
        sa.Column("false_positive_rate", sa.Float(), nullable=True),
    )
    op.create_index("ix_daily_metrics_tenant_id", "daily_metrics", ["tenant_id"])
    op.create_index("ix_daily_metrics_metric_date", "daily_metrics", ["metric_date"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("event_id", sa.Integer(), nullable=True),
        sa.Column("severity", sa.String(length=32), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_alerts_tenant_id", "alerts", ["tenant_id"])
    op.create_index("ix_alerts_event_id", "alerts", ["event_id"])
    op.create_index("ix_alerts_severity", "alerts", ["severity"])

    op.create_table(
        "devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), nullable=True),
        sa.Column("hostname", sa.String(length=255), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("criticality", sa.String(length=32), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_devices_tenant_id", "devices", ["tenant_id"])
    op.create_index("ix_devices_ip_address", "devices", ["ip_address"])


def downgrade() -> None:
    for table in (
        "devices",
        "alerts",
        "daily_metrics",
        "metrics",
        "reviews",
        "ingestion_jobs",
        "incidents",
        "events",
        "users",
    ):
        op.drop_table(table)
