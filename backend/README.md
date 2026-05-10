# TransferIDS SENTINEL-X Backend

FastAPI backend skeleton for SOC ingestion, detection, incidents, response coordination, model explainability and API v1 routing.

## Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Health check: `GET /healthz`

## Database

Default local PostgreSQL URL aligned with the existing local TransferIDS PostgreSQL server:

```text
postgresql+psycopg://postgres:0000@127.0.0.1:5432/transferids_web3
```

Initialize tables:

```powershell
cd ..
npm run db:init
```

Runtime status:

```text
GET /api/integrations/database-status
```

Only successful real inference writes rows to `events`, `ingestion_jobs`, and derived attack `incidents`. Validation failures and missing model artifacts do not write database rows.
