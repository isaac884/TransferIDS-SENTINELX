import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const required = [
  "backend/app/main.py",
  "backend/app/database.py",
  "backend/app/api/auth_routes.py",
  "backend/app/api/intake_routes.py",
  "backend/app/api/detection_routes.py",
  "backend/app/api/dashboard_routes.py",
  "backend/app/api/events_routes.py",
  "backend/app/api/incidents_routes.py",
  "backend/app/api/websocket_routes.py",
  "backend/app/services/event_store.py",
  "backend/app/integrations/onnx_runtime_service.py",
  "backend/app/ml/artifacts/feature_order.json",
  "backend/app/ml/artifacts/transferids_c3.onnx",
  "backend/app/ml/artifacts/transferids_c3.metadata.json",
  "backend/tests/test_detection_pipeline.py",
  "frontend/index.html",
  "frontend/dashboard.html",
  "frontend/intake.html",
  "frontend/incidents.html",
  "frontend/response.html",
  "frontend/insights.html",
  "frontend/reports.html",
  "frontend/settings.html",
  "frontend/app.js",
  "frontend/styles.css",
  "docs/PRD.md",
  "docs/legacy-product-docs/TransferIDS_web_PRD_20260507.md",
  "scripts/init_database.py",
  "start_all.ps1",
  "stop_all.ps1",
  "Dockerfile",
  "docker-compose.yml",
  "alembic.ini",
];

const failures = [];
for (const path of required) {
  if (!existsSync(path)) failures.push(`missing required file: ${path}`);
}

const checks = [
  ["backend/app/main.py", ["/api/health", "/ws/events", "2026-05-09-sentinelx-merged", "index.html"]],
  ["backend/app/api/intake_routes.py", ["/upload", "MODEL_ARTIFACT_MISSING", "INVALID_FEATURE_SCHEMA", "csv.DictReader", "_parse_json", "event_store.add_many"]],
  ["backend/app/api/detection_routes.py", ["/model/status", "MODEL_ARTIFACT_MISSING", "Detection request must include non-empty features"]],
  ["backend/app/api/dashboard_routes.py", ["event_store.summary", "api_success"]],
  ["backend/app/api/events_routes.py", ["clear-dev-only", "settings.environment.lower() != \"development\"", "/export"]],
  ["backend/app/api/incidents_routes.py", ["/from-event/{event_id}", "/{incident_id}/state", "/{incident_id}/timeline"]],
  ["backend/app/services/event_store.py", ["No sample, synthetic", "_persist_add_many", "_db_list_events", "allowed_statuses"]],
  ["backend/app/integrations/onnx_runtime_service.py", ["predict_batch", "settings.attack_threshold"]],
  ["frontend/app.js", ["loadWeb3DashboardCompat", "uploadWeb3DetectionFile", "/intake/upload", "/dashboard/summary", "/events", "/incidents", "/detection/model/status", "/ws/events"]],
  ["frontend/intake.html", ["Analyze CSV / JSON", "accept=\".csv,.json,application/json,text/csv\""]],
  ["start_all.ps1", ["$BackendPort = 8010", "/api/health", "index.html", "2026-05-09-sentinelx-merged"]],
];

for (const [file, patterns] of checks) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const pattern of patterns) {
    if (!text.includes(pattern)) failures.push(`${file} missing "${pattern}"`);
  }
}

if (existsSync("backend/app/ml/artifacts/feature_order.json")) {
  const featureOrder = JSON.parse(readFileSync("backend/app/ml/artifacts/feature_order.json", "utf8"));
  if (!Array.isArray(featureOrder) || featureOrder.length !== 13) {
    failures.push("feature_order.json must contain exactly 13 features");
  }
}

for (const file of walk("backend").concat(walk("frontend"))) {
  const normalized = file.replaceAll("\\", "/");
  if (normalized.includes("__pycache__")) continue;
  if (normalized.includes("sample_flows") || normalized.includes("mock-data")) {
    failures.push(`forbidden file remains: ${normalized}`);
  }
}

if (failures.length) {
  console.error(`Product readiness check failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("Merged SENTINEL-X readiness check passed");

function walk(root) {
  if (!existsSync(root)) return [];
  const entries = [];
  for (const name of readdirSync(root)) {
    if (name === "__pycache__" || name === ".pytest_cache") continue;
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) entries.push(...walk(path));
    else entries.push(path);
  }
  return entries;
}
