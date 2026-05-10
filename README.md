# TransferIDS SENTINEL-X

AI-driven intrusion detection and SOC-oriented cybersecurity platform for cross-domain network environments.

TransferIDS SENTINEL-X integrates FastAPI backend services, telemetry ingestion, canonical 13-feature validation, ONNX-based intrusion detection inference, event materialization, incident workflows, and analyst-facing dashboard pages.

## Core Features

- CSV/JSON telemetry ingestion
- Canonical 13-feature validation
- ONNX-based intrusion detection inference
- Security event materialization
- Incident and dashboard workflows
- SOC-oriented frontend interface
- No fake alerts, no seeded security events, and no mock inference fallback

## Tech Stack

Python, FastAPI, PostgreSQL, ONNX Runtime, SQLAlchemy, Alembic, JavaScript, HTML, CSS, PowerShell, Docker

## Golden Path

Upload CSV/JSON  
→ validate 13 canonical features  
→ run ONNX inference only if model artifact exists  
→ materialize detection events  
→ persist events/incidents  
→ render dashboard from backend APIs
