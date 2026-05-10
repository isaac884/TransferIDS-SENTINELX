param(
    [switch] $NoBrowser
)

$ErrorActionPreference = "Stop"
$ScriptVersion = "2026-05-10-sentinelx-restart-v2"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendRoot = Join-Path $Root "backend"
$FrontendRoot = Join-Path $Root "frontend"
$BackendPort = 8010
$LegacyFrontendPort = 5173
$StartScript = Join-Path $Root "start_all.ps1"

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

            $IsLegacyFrontend =
                $CommandLine -like "*http.server $LegacyFrontendPort*" -or
                ($CommandLine -like "*$FrontendPath*" -and $CommandLine -like "*http.server*") -or
                ($CommandLine -like "*$NormalizedFrontend*" -and $CommandLine -like "*http.server*")

            ($IsBackend -or $IsLegacyFrontend) -and $_.ProcessId -ne $PID
        }
    }

    foreach ($Process in $Processes) {
        Write-Host "[TransferIDS] stopping PID $($Process.ProcessId)" -ForegroundColor DarkGray
        Stop-Process -Id $Process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Stop-PortProcess {
    param([int] $Port)

    $Connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($Connection in $Connections) {
        $OwnerProcessId = $Connection.OwningProcess
        if ($OwnerProcessId -and $OwnerProcessId -ne $PID) {
            Write-Host "[TransferIDS] freeing port $Port from PID $OwnerProcessId" -ForegroundColor DarkGray
            Stop-Process -Id $OwnerProcessId -Force -ErrorAction SilentlyContinue
        }
    }
}

function Wait-PortReleased {
    param(
        [int] $Port,
        [int] $TimeoutSeconds = 15
    )

    $Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $Connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if (-not $Connection) {
            return
        }
        Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $Deadline)

    throw "Port $Port is still occupied after restart cleanup."
}

Set-Location $Root

Write-Host "[TransferIDS] restart_all.ps1 version: $ScriptVersion" -ForegroundColor DarkGray
Write-Host "[TransferIDS] script path: $PSCommandPath" -ForegroundColor DarkGray

if (-not (Test-Path $StartScript)) {
    throw "Missing start_all.ps1 at $StartScript"
}

Write-Host "[TransferIDS] Restarting SENTINEL-X runtime..." -ForegroundColor Cyan
Stop-TransferIDSRuntimeProcesses -BackendPath $BackendRoot -FrontendPath $FrontendRoot
Stop-PortProcess -Port $BackendPort
Stop-PortProcess -Port $LegacyFrontendPort
Wait-PortReleased -Port $BackendPort
Wait-PortReleased -Port $LegacyFrontendPort

Write-Host "[TransferIDS] Runtime stopped. Starting fresh runtime..." -ForegroundColor Cyan
if ($NoBrowser) {
    & $StartScript -NoBrowser
} else {
    & $StartScript
}
