# TransferIDS SENTINEL-X

Merged final product workspace.

This project combines:

- `backend/` from `TransferIDS/web3`: FastAPI, PostgreSQL persistence, ONNX detection, validation, schemas, services, tests, and scripts.
- `frontend/` from `TransferIDS_web/frontend`: SOC product UI, command-center layout, and analyst workflow pages.

The merge keeps one backend, one auth system, and one API surface. It does not seed demo alerts, fabricate events, or use mock inference fallback.

## Golden Path

```text
Upload CSV/JSON
-> validate 13 canonical features
-> run transferids_c3.onnx only if the artifact exists
-> materialize detection events
-> persist events/incidents
-> render dashboard from backend APIs
```

If no real events exist, the dashboard must show an empty operational state instead of fake SOC metrics.

## Start

```powershell
cd D:\Project\TransferIDS\TransferIDS_SENTINELX
.\start_all.ps1
```

The script initializes the database, starts FastAPI on `http://127.0.0.1:8010`, serves the frontend from the same origin, and opens `index.html`.

## Checks

```bash
npm run frontend:check
npm run product:check
npm run release:check
```

Backend tests remain under `backend/tests`:

```powershell
pytest -q backend\tests
```

## Primary API

- `GET /api/health`
- `POST /api/intake/upload`
- `GET /api/dashboard/summary`
- `GET /api/events`
- `GET /api/incidents`
- `GET /api/detection/model/status`
- `WS /ws/events`

## Data Integrity Rules

- No simulator execution path.
- No seeded security events.
- No fake alerts.
- No random prediction fallback.
- No auto-filled missing features.
- `MODEL_ARTIFACT_MISSING` never creates events.
