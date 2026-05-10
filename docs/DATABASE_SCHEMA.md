# Database Schema

Baseline schema is defined in `backend/sql/postgres_schema.sql` and should be migrated through Alembic for production deployments.

Runtime persistence is database-first:

- `events`: only successful real ONNX inference results.
- `ingestion_jobs`: upload job metadata for accepted CSV/JSON uploads.
- `incidents`: derived only from attack events.
- `reviews`: analyst decisions that do not rewrite core detection output.
- `metrics`: reserved for persisted product metrics.

Initialization options:

```bash
npm run db:init
alembic upgrade head
```

Validation failures, missing model artifacts, and model runtime errors do not create database rows.
