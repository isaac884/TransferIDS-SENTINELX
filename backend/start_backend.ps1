$ErrorActionPreference = "Stop"

$BackendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $BackendRoot
$BackendPort = 8010

Set-Location $BackendRoot

if (-not (Test-Path ".env")) {
    throw "Missing backend\.env."
}

if (-not (Test-Path "app\ml\artifacts\transferids_c3.onnx")) {
    throw "Missing app\ml\artifacts\transferids_c3.onnx."
}

Set-Location $ProjectRoot
npm run db:init

Set-Location $BackendRoot
$env:PYTHONPATH = $BackendRoot
python -m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort
