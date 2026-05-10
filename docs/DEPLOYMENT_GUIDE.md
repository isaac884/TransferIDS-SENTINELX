# Deployment Guide

Local development:

```bash
cd web3
python -m pip install -r backend/requirements.txt
npm run db:init
PYTHONPATH=backend python -m uvicorn app.main:app --reload --app-dir backend
```

Database configuration is read from `backend/.env` or environment variables. The default product path is PostgreSQL:

```text
DATABASE_URL=postgresql+psycopg://postgres:0000@127.0.0.1:5432/transferids_web3
```

If `DATABASE_REQUIRED=false`, the backend remains available when PostgreSQL is down, reports database status as unavailable, and falls back to process memory without generating fake events.

Model runtime is optional during MVP validation. Install it only when `backend/app/ml/artifacts/transferids_c3.onnx` exists:

```bash
python -m pip install -r backend/requirements-model.txt
```

Container baseline:

```bash
docker compose up --build
```
