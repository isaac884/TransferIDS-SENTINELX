param(
    [switch] $NoBrowser
)

$ErrorActionPreference = "Stop"
$ScriptVersion = "2026-05-10-sentinelx-start"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendRoot = Join-Path $Root "backend"
$FrontendRoot = Join-Path $Root "frontend"
$BackendPort = 8010

function Stop-TransferIDSRuntimeProcesses {
    param(
        [string] $BackendPath,
        [string] $FrontendPath
    )

    $NormalizedBackend = $BackendPath.Replace("\", "\\")
    $NormalizedFrontend = $FrontendPath.Replace("\", "\\")

    $Processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $CommandLine = $_.CommandLine
        if (-not $CommandLine) {
            $false
        } else {
            $IsBackend =
                $CommandLine -like "*uvicorn app.main:app*" -or
                ($CommandLine -like "*$BackendPath*" -and $CommandLine -like "*uvicorn*") -or
                ($CommandLine -like "*$NormalizedBackend*" -and $CommandLine -like "*uvicorn*")

            $IsFrontend =
                $CommandLine -like "*http.server 5173*" -or
                ($CommandLine -like "*$FrontendPath*" -and $CommandLine -like "*http.server*") -or
                ($CommandLine -like "*$NormalizedFrontend*" -and $CommandLine -like "*http.server*")

            ($IsBackend -or $IsFrontend) -and $_.ProcessId -ne $PID
        }
    }

    foreach ($Process in $Processes) {
        Stop-Process -Id $Process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Stop-PortProcess {
    param([int] $Port)

    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        $ProcessId = $connection.OwningProcess
        if ($ProcessId -and $ProcessId -ne $PID) {
            Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Assert-Command {
    param([string] $Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Wait-HttpEndpoint {
    param(
        [string] $Url,
        [int] $TimeoutSeconds = 60
    )

    $Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    } while ((Get-Date) -lt $Deadline)

    throw "Timed out waiting for $Url"
}

Set-Location $Root

Write-Host "[TransferIDS] start_all.ps1 version: $ScriptVersion" -ForegroundColor DarkGray
Write-Host "[TransferIDS] script path: $PSCommandPath" -ForegroundColor DarkGray

Assert-Command python
Assert-Command npm

if (-not (Test-Path (Join-Path $BackendRoot ".env"))) {
    throw "Missing backend\.env. Create it before starting the platform."
}

if (-not (Test-Path (Join-Path $BackendRoot "app\ml\artifacts\transferids_c3.onnx"))) {
    throw "Missing production ONNX model: backend\app\ml\artifacts\transferids_c3.onnx"
}

Write-Host "[TransferIDS] Initializing database..." -ForegroundColor Cyan
npm run db:init

Write-Host "[TransferIDS] Stopping previous TransferIDS runtime processes..." -ForegroundColor Cyan
Stop-TransferIDSRuntimeProcesses -BackendPath $BackendRoot -FrontendPath $FrontendRoot
Start-Sleep -Seconds 1

Write-Host "[TransferIDS] Clearing occupied local ports $BackendPort and 5173..." -ForegroundColor Cyan
Stop-PortProcess -Port $BackendPort
Stop-PortProcess -Port 5173
Start-Sleep -Seconds 1

$BackendCommand = @"
`$ErrorActionPreference = 'Stop'
Set-Location '$BackendRoot'
`$env:PYTHONPATH = '$BackendRoot'
python -m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort
"@

Write-Host "[TransferIDS] Starting backend on http://127.0.0.1:$BackendPort" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $BackendCommand -WorkingDirectory $BackendRoot

Write-Host "[TransferIDS] Waiting for backend health..." -ForegroundColor Cyan
Wait-HttpEndpoint -Url "http://127.0.0.1:$BackendPort/api/health" -TimeoutSeconds 60

Write-Host "[TransferIDS] Verifying same-origin frontend mount..." -ForegroundColor Cyan
$RuntimeInfo = Invoke-RestMethod -Uri "http://127.0.0.1:$BackendPort/runtime-info" -TimeoutSec 10
if ($RuntimeInfo.runtime_version -ne "2026-05-09-sentinelx-merged") {
    throw "Backend runtime version mismatch. Runtime info: $($RuntimeInfo | ConvertTo-Json -Compress)"
}
if (-not $RuntimeInfo.index_html_exists) {
    throw "Backend is not serving the expected frontend. Runtime info: $($RuntimeInfo | ConvertTo-Json -Compress)"
}

Start-Sleep -Seconds 1
$LoginUrl = "http://127.0.0.1:$BackendPort/index.html"
if ($NoBrowser) {
    Write-Host "[TransferIDS] Browser launch skipped by -NoBrowser. Open manually: $LoginUrl" -ForegroundColor Yellow
} else {
    Write-Host "[TransferIDS] Opening browser: $LoginUrl" -ForegroundColor Green
    Start-Process $LoginUrl
}

Write-Host ""
Write-Host "TransferIDS SENTINEL-X is starting." -ForegroundColor Green
Write-Host "Frontend: $LoginUrl"
Write-Host "Backend:  http://127.0.0.1:$BackendPort/api/health"
Write-Host "Mode:     same-origin frontend served by FastAPI"
Write-Host "Login:    admin / TransferIDS_Admin_2026!"
