# TransferIDS SENTINEL-X Product Technical Checklist

Date: 2026-05-08

Scope: `TransferIDS_web` product shell plus the linked `NIDS` detection runtime used by the wrapper.

This checklist is a closure artifact, not a marketing claim. A row marked `Complete` has code, tests, or release-gate evidence. A row marked `Partial`, `Deferred`, or `Blocked` is not production-complete yet.

## Status Legend

| Status | Meaning |
|---|---|
| Complete | Implemented and covered by a test, release check, or concrete runtime path. |
| Partial | Implemented enough for the current local product baseline, but missing production hardening or broader coverage. |
| Research | Exists in the research pipeline, but is not yet promoted to production product runtime. |
| Deferred | Explicitly out of the current release scope. |
| Blocked | Requires an external decision, secret, model artifact, infrastructure, or user-approved scope change. |

## Current Release Gate

| Gate | Status | Evidence |
|---|---|---|
| Web release package | Complete | `npm run release:package` |
| Wrapper security contract | Complete | `backend/tests/test_wrapper_security_contract.py` |
| Endpoint policy regression | Complete | `../NIDS/backend/tests/test_detection_engine_endpoint_policy.py` |
| Binary checkpoint regression | Complete | `../NIDS/backend/tests/test_checkpoint_regression.py` |
| Multiclass attack-family regression | Complete | `../NIDS/backend/tests/test_multiclass_checkpoint_regression.py` |
| ONNX feature and label contract | Complete | `docs/ONNX_PRODUCTION_MODEL_CONTRACT_20260507.md`, `TRANSFERIDS_ONNX_FEATURES`, `TRANSFERIDS_ONNX_LABELS` |
| Frontend English and load contract | Complete | `npm run frontend:check`, `scripts/frontend_runtime_check.mjs` |
| API hardening contract | Complete | Rate limiting, secure headers, and request timing middleware in `backend/main.py` |
| Docker / reverse proxy baseline | Complete | `Dockerfile`, `docker-compose.yml`, `reverse_proxy/nginx.conf` |
| Alembic baseline migration | Complete | `alembic.ini`, `backend/alembic/versions/20260508_0001_transferids_web_baseline.py` |
| API v1 compatibility mount | Complete | `/api/v1` mounted beside `/api` in `backend/main.py` |
| Event bus baseline | Complete | `backend/services/event_bus_service.py`, `/platform/event-bus/*` |
| Tenant context guard | Complete | `X-TransferIDS-Tenant`, tenant baseline SQL, `/platform/tenant/context` |
| SHAP explainability adapter | Complete | Optional SHAP runtime endpoint with fallback influence adapter |
| Product readiness meta-check | Complete | `npm run product:check` |

## 1. Core Architecture Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Backend Infrastructure | FastAPI API Gateway | Complete | Wrapper backend exposes FastAPI routes in `backend/main.py`. |
| Backend Infrastructure | Async API support | Partial | FastAPI supports async routes, but not all service paths are async-native. |
| Backend Infrastructure | JWT Authentication | Complete | Legacy auth integration is guarded by wrapper security tests. |
| Backend Infrastructure | RBAC (Admin / Analyst / Viewer) | Partial | Admin/user route guards exist; full role matrix still needs formal policy tests. |
| Backend Infrastructure | PostgreSQL integration | Complete | PostgreSQL schemas and SQLAlchemy models exist. |
| Backend Infrastructure | SQLAlchemy ORM | Complete | ORM-backed wrapper and legacy runtime paths exist. |
| Backend Infrastructure | Alembic migrations | Complete | Baseline migration applies app-compatible schema and tenant baseline. |
| Backend Infrastructure | API versioning (/api/v1) | Complete | Root app mounts the authenticated API under `/api/v1` for forward-compatible clients. |
| Backend Infrastructure | Structured logging | Partial | Request timing/status logging now exists; centralized JSON log aggregation is not complete. |
| Backend Infrastructure | Environment variable management | Complete | `.env.example` documents runtime variables. |
| Backend Infrastructure | Docker support | Complete | Multi-stage Dockerfile and Compose stack cover backend, PostgreSQL, Redis, and Nginx reverse proxy. |
| Backend Infrastructure | Health check endpoint | Complete | Health/runtime endpoints exist. |
| Backend Infrastructure | Rate limiting | Complete | API middleware enforces env-configured per-client/path limits through `TRANSFERIDS_RATE_LIMIT_*`. |
| Backend Infrastructure | CORS configuration | Complete | Configurable through `TRANSFERIDS_CORS_ALLOW_ORIGINS`. |
| Backend Infrastructure | Error handling middleware | Partial | FastAPI validation/errors exist; product-wide error envelope is not complete. |
| Backend Infrastructure | Request validation | Complete | Pydantic schemas protect wrapper inputs. |
| Frontend Infrastructure | React / Vue frontend | Deferred | Current product shell is static HTML/CSS/JS, not React/Vue. |
| Frontend Infrastructure | Route protection | Partial | Backend API is protected; static pages still rely on API auth behavior. |
| Frontend Infrastructure | Token persistence | Complete | Existing frontend auth flow persists token state. |
| Frontend Infrastructure | Real-time dashboard updates | Complete | WebSocket live feed with polling fallback exists and is deferred until after page initialization to reduce load blocking. |
| Frontend Infrastructure | State management | Partial | Vanilla JS state modules exist; no formal React/Vue store. |
| Frontend Infrastructure | Responsive layout | Complete | SOC pages are responsive within the static frontend. |
| Frontend Infrastructure | Dark mode | Complete | SENTINEL-X design is dark tactical by default. |
| Frontend Infrastructure | Component architecture | Partial | Shared CSS/JS patterns exist; no typed component framework. |
| Frontend Infrastructure | Loading states | Partial | Some data panels handle empty/loading states; not universal. |
| Frontend Infrastructure | Error boundaries | Deferred | Framework-level error boundaries require React/Vue migration. |
| Frontend Infrastructure | Table virtualization | Deferred | Not needed for the current static release scale. |
| Frontend Infrastructure | Chart rendering optimization | Partial | Heavy runtime startup is deferred and frontend gate checks deferred scripts; large chart virtualization is not formalized. |

## 2. Detection Pipeline Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Data Intake | CSV upload | Partial | Detection rows and canonical ingestion are supported; UI upload path is basic. |
| Data Intake | PCAP upload | Partial | Suricata replay/upload control exists; native PCAP feature extraction is not fully productized. |
| Data Intake | NetFlow ingestion | Partial | Env support exists; production sensor pipeline still needs deployment hardening. |
| Data Intake | Suricata EVE ingestion | Complete | Suricata EVE ingestion path exists and is guarded by API auth. |
| Data Intake | Live capture support | Partial | Sensor control scripts exist; production capture lifecycle remains environment-specific. |
| Data Intake | Batch inference | Complete | Detection run/ingest paths process batches. |
| Data Intake | Streaming inference | Deferred | No event bus/WebSocket streaming inference yet. |
| Data Intake | Multi-source ingestion | Complete | Canonical mapper normalizes endpoint, Suricata, NetFlow-like rows. |
| Validation & Alignment | Input schema validation | Complete | Pydantic schemas and canonical mapper validate shape. |
| Validation & Alignment | Missing value handling | Complete | Alignment layer fills missing canonical features. |
| Validation & Alignment | Feature normalization | Complete | Research artifacts include scaler persistence. |
| Validation & Alignment | Canonical feature mapping | Complete | `backend/common/canonical_mapper.py`. |
| Validation & Alignment | Cross-domain feature alignment | Complete | 13-feature canonical space is enforced. |
| Validation & Alignment | Unsupported feature detection | Partial | Schema checks exist; full user-facing diagnostics can improve. |
| Validation & Alignment | Feature overlap validation | Complete | Feature schema is checked in checkpoint regression. |
| Validation & Alignment | Domain shift validation | Complete | Out-of-range and drift logic affect decisioning. |
| ML Pipeline | Preprocessing pipeline | Complete | Research and runtime preprocessing artifacts exist. |
| ML Pipeline | Scaler persistence | Complete | `scaler.pkl` artifacts are consumed by regression. |
| ML Pipeline | Model registry | Partial | ONNX contract/model metadata exist; formal registry service is deferred. |
| ML Pipeline | Model loading manager | Partial | ONNX and legacy model loading paths exist; registry lifecycle is not complete. |
| ML Pipeline | Inference queue | Deferred | No queue-backed worker path yet. |
| ML Pipeline | Confidence scoring | Complete | Decision engine consumes confidence score. |
| ML Pipeline | Threshold configuration | Complete | Shadow optimizer and env-backed policies exist. |
| ML Pipeline | Multi-model switching | Partial | Legacy vs ONNX switching exists; full registry switching is deferred. |
| ML Pipeline | Cross-domain inference | Complete | C3/C3-2 regression and runtime metadata support this. |
| ML Pipeline | Domain adaptation pipeline | Research | Implemented in research outputs, not fully product-controlled. |
| ML Pipeline | ONNX optimization | Partial | Export/smoke/runtime exists; production ONNX artifact remains optional. |
| ML Pipeline | GPU compatibility | Research | Training/checkpoint environment supports CUDA; web runtime defaults CPU. |
| TransferIDS Stages | C0/C1/C2/C3/C3-1/C3-2 | Research | Experiment artifacts exist; product runtime uses selected outputs and summaries. |
| TransferIDS Stages | Target-assisted fine-tuning | Complete | C3-2 binary and harmonized multiclass checkpoints exist and are regression-tested. |

## 3. SOC Workflow Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Incident Management | Incident queue | Complete | Dashboard/incidents pages are incident-centric. |
| Incident Management | Severity classification | Complete | Decision engine computes severity and priority. |
| Incident Management | SLA timer | Partial | SLA fields and UI pressure exist; full escalation calendar is deferred. |
| Incident Management | Analyst assignment | Partial | UI supports analyst workflow framing; backend assignment model is incomplete. |
| Incident Management | Incident status tracking | Complete | Incident state transition API is guarded. |
| Incident Management | Attack timeline | Complete | Incident and dashboard timelines exist. |
| Incident Management | Related event grouping | Complete | Incident grouping key and event aggregation exist. |
| Incident Management | Case notes | Partial | Review/notes concepts exist; full notebook-style case notes are deferred. |
| Incident Management | Evidence export | Partial | Report/evidence UI exists; chain-of-custody export is not fully automated. |
| Alerting System | Rule-based alerting | Complete | Alert construction and suppression exist. |
| Alerting System | ML alerting | Complete | ML decisions can create materialized alerts/events. |
| Alerting System | Duplicate suppression | Complete | Alert suppression logic exists. |
| Alerting System | Risk scoring | Complete | `compute_risk_score` is used in materialization. |
| Alerting System | Alert prioritization | Complete | Priority levels drive UI and incident queue. |
| Alerting System | False positive marking | Complete | Review labels support false-positive tracking. |
| Alerting System | Escalation logic | Partial | State changes and SLA pressure exist; automated escalation policies are deferred. |
| Analyst Experience | Threat summary cards | Complete | Dashboard and incident pages use threat-first summaries. |
| Analyst Experience | Explainability panel | Complete | AI briefing, evidence, and verification metadata exist. |
| Analyst Experience | Feature contribution view | Complete | SHAP/fallback explainability endpoint returns per-row top feature influence. |
| Analyst Experience | Confidence breakdown | Complete | Confidence and verification evidence are exposed. |
| Analyst Experience | Comparative stage analysis | Complete | Insights page presents adaptation gain and stages. |
| Analyst Experience | Detection lineage | Complete | Runtime/model metadata stored with events. |
| Analyst Experience | Query/search system | Partial | Search UI exists; backend full-text query is not complete. |
| Analyst Experience | Investigation workspace | Complete | Incidents page is split around incident workflow. |

## 4. Visualization Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Dashboard | Live metrics | Complete | Metrics API and dashboard panels exist. |
| Dashboard | Threat heatmap / map | Partial | Attack geo map exists; heatmap mode is not complete. |
| Dashboard | Trend analysis | Complete | Pressure trend and false-positive trend exist. |
| Dashboard | Attack distribution | Partial | Event/incident distribution exists; family distribution depends on multiclass production promotion. |
| Dashboard | Model performance monitoring | Complete | Adaptation gain/model stability panels exist. |
| Dashboard | Adaptation gain visualization | Complete | Dashboard/insights expose adaptation gain. |
| Dashboard | Dataset comparison charts | Research | Present in research artifacts, not full product charts. |
| Dashboard | Domain drift visualization | Complete | Insights/drift panels exist. |
| Charts & Analytics | t-SNE visualization | Research | Exists as research concept, not product runtime. |
| Charts & Analytics | ROC curve / Confusion matrix | Research | Metrics artifacts exist; product display is limited. |
| Charts & Analytics | Feature importance | Complete | SHAP/fallback feature influence is available through the explainability API. |
| Charts & Analytics | Distribution comparison | Partial | Drift comparison exists, deeper distribution UI deferred. |
| Charts & Analytics | Time-series analytics | Complete | Trend panels and metrics summary exist. |

## 5. MCP / AI Analysis Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| AI Assistant | Incident summarization | Complete | AI advisor service produces incident review summaries. |
| AI Assistant | Attack explanation | Complete | Decision briefing and recommendation panels exist. |
| AI Assistant | Risk interpretation | Complete | AI advisor and risk summaries exist. |
| AI Assistant | Suggested response actions | Complete | Response recommendations and action center exist. |
| AI Assistant | Detection reasoning | Complete | Verification evidence and decision summaries exist. |
| AI Assistant | Context-aware querying | Partial | Context panels exist; free-form retrieval QA is deferred. |
| AI Assistant | Security knowledge integration | Partial | MITRE/security framing exists; external TI knowledge base is deferred. |
| Explainability | SHAP integration | Complete | Optional SHAP adapter exists with runtime availability reporting and fallback feature influence. |
| Explainability | Feature attribution | Complete | SHAP/fallback endpoint returns top feature influence per row. |
| Explainability | Confidence reasoning | Complete | Confidence and evidence fusion are exposed. |
| Explainability | Cross-domain interpretation | Complete | Adaptation gain and drift are productized. |
| Explainability | Human-readable analysis | Complete | AI briefing and analyst guidance are human-readable. |

## 6. Real-Time Capability Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Streaming | WebSocket support | Complete | Authenticated `/ws/realtime` endpoint exists with frontend WebSocket consumption and polling fallback. |
| Streaming | Background workers | Partial | Sensor/startup scripts exist; queue-backed workers are deferred. |
| Streaming | Event queue | Complete | Event bus service publishes to Redis Streams when available and falls back to an in-memory ring. |
| Streaming | Incremental ingestion | Partial | Batch polling and ingestion jobs exist; streaming queue deferred. |
| Streaming | Near real-time alerts | Complete | Dashboard uses backend live event views. |
| Streaming | Live incident updates | Complete | Live feed uses WebSocket when available and falls back to polling. |
| Endpoint/Sensor | Central Sensor Mode | Partial | Suricata sensor support exists; SPAN deployment docs need hardening. |
| Endpoint/Sensor | Sensor collector | Partial | Collector metadata exists; full fleet management deferred. |
| Endpoint/Sensor | Network mirror/SPAN support | Deferred | Environment-specific deployment not packaged. |
| Endpoint/Sensor | Flow aggregation | Complete | Incident/event grouping and materialization exist. |
| Endpoint Agent Mode | Local agent | Partial | Endpoint agent flow schema/policy exists; packaged agent lifecycle is deferred. |
| Endpoint Agent Mode | Secure communication | Partial | API auth exists; mTLS/enrollment hardening deferred. |
| Endpoint Agent Mode | Auto-update mechanism | Deferred | Not implemented. |
| Endpoint Agent Mode | Lightweight collector | Partial | Endpoint telemetry format exists; final packaged collector deferred. |
| Endpoint Agent Mode | Local buffering | Deferred | Not implemented. |

## 7. Security Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Application Security | Password hashing | Blocked | User explicitly asked to keep plaintext password for now; this must be fixed before real production. |
| Application Security | HTTPS support | Deferred | Requires reverse proxy/cert deployment. |
| Application Security | API authentication | Complete | Security contract checks protected routes. |
| Application Security | RBAC enforcement | Partial | Admin/user guards exist; full role policy matrix deferred. |
| Application Security | SQL injection prevention | Complete | ORM and parameterized paths are used. |
| Application Security | XSS prevention | Partial | Static UI avoids dangerous rendering in main paths; formal CSP/testing deferred. |
| Application Security | CSRF protection | Deferred | Token-based API currently; browser CSRF hardening deferred. |
| Application Security | Secure headers | Complete | Backend/root middleware applies `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and COOP. |
| Infrastructure Security | Secret management | Partial | `.env` ignored; production secret vault not implemented. |
| Infrastructure Security | Audit logging | Partial | Review records and events exist; full audit trail deferred. |
| Infrastructure Security | Backup strategy | Deferred | Not implemented. |
| Infrastructure Security | Database access control | Partial | DB URL/env supported; least-privilege deployment deferred. |
| Infrastructure Security | Container isolation | Deferred | Docker/container release not implemented. |

## 8. Research & Experiment Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Experiment Reproducibility | Config-driven experiments | Research | Experiment configs/artifacts exist in the research repo. |
| Experiment Reproducibility | Seed control | Research | Research scripts support reproducibility; product gate only validates selected artifacts. |
| Experiment Reproducibility | Metrics export | Complete | Metrics CSV/JSON artifacts exist. |
| Experiment Reproducibility | Experiment tracking | Partial | Filesystem artifact tracking exists; MLflow-like registry deferred. |
| Experiment Reproducibility | Model checkpointing | Complete | Checkpoints exist and are loaded by regression tests. |
| Experiment Reproducibility | Artifact versioning | Partial | Release manifest and docs exist; immutable model registry deferred. |
| Dataset Integrity | Label harmonization | Complete | Harmonized multiclass schema exists. |
| Dataset Integrity | Leakage prevention | Partial | Source-stat normalization design exists; formal leakage audit should remain in research CI. |
| Dataset Integrity | Split reproducibility | Complete | Split artifacts and IDs exist. |
| Dataset Integrity | Bidirectional evaluation | Complete | Both transfer directions have artifacts. |
| Dataset Integrity | Feature consistency validation | Complete | Regression validates feature schema consistency. |

## 9. DevOps Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Deployment | Docker Compose | Complete | `docker-compose.yml` defines PostgreSQL, Redis, web, and reverse proxy services. |
| Deployment | CI/CD pipeline | Complete | `.github/workflows/ci.yml` runs release gate and Alembic syntax validation. |
| Deployment | Reverse proxy | Complete | Nginx reverse proxy config includes security headers and WebSocket upgrade handling. |
| Deployment | Service monitoring | Partial | Health/runtime endpoints exist; production monitoring stack deferred. |
| Deployment | Crash recovery | Partial | Windows startup scripts exist; process supervisor not complete. |
| Deployment | Automatic restart | Partial | Windows startup/restart scripts exist. |
| Monitoring | Backend metrics | Complete | Metrics summary API exists. |
| Monitoring | API latency tracking | Complete | API middleware logs per-request `duration_ms` and status code. |
| Monitoring | Model inference latency | Deferred | Not implemented. |
| Monitoring | System resource monitoring | Deferred | Not implemented. |
| Monitoring | Log aggregation | Deferred | Not implemented. |

## 10. Product Readiness Layer

| Area | Item | Status | Closure |
|---|---|---|---|
| Productization | Multi-user support | Partial | Auth exists; full RBAC/user lifecycle needs more hardening. |
| Productization | Tenant isolation | Partial | Tenant header guard, tenant context endpoint, and tenant SQL baseline exist; full ORM query filtering remains a future hardening step. |
| Productization | Licensing model | Deferred | Not implemented. |
| Productization | Collector management | Partial | Sensor controls and collector IDs exist; fleet management deferred. |
| Productization | Update system | Deferred | Not implemented. |
| Productization | Settings management | Partial | Settings page exists; full backend config persistence deferred. |
| Productization | Report generation | Complete | Reports workspace and PRD docs exist. |
| Productization | Export APIs | Partial | Evidence/report concepts exist; formal export API set deferred. |

## Multiclass Attack-Family Closure

Multiclass attack-family classification is no longer an unguarded claim. The current closure is:

- Label mapping is explicit through `TRANSFERIDS_ONNX_LABELS`.
- `Normal` is treated as a benign model label in evidence fusion.
- A harmonized multiclass golden-set fixture covers `Botnet/Others`, `Brute Force` boundary behavior, `DoS/DDoS`, `Normal`, `Probing/Scan`, and `Web/Infiltration`.
- Regression fails if post-finetune labels drift outside expected family labels, if normal traffic materializes as attack, or if attack-family mismatch exceeds the current known-boundary allowance.

Production note: the current harmonized multiclass model is guarded, but not promoted as the primary production classifier. Binary attack/normal decisioning remains the production-safe path until multiclass balanced accuracy and family-level regression thresholds meet the production promotion bar.
