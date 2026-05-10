$ErrorActionPreference = "Stop"

$AgentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$QueuePath = Join-Path $AgentRoot "queue"
$LogPath = Join-Path $AgentRoot "agent.log"

if (Test-Path $QueuePath) {
    Remove-Item $QueuePath -Recurse -Force
    Write-Host "[TransferIDS Agent] Removed local retry queue." -ForegroundColor Green
}

if (Test-Path $LogPath) {
    Remove-Item $LogPath -Force
    Write-Host "[TransferIDS Agent] Removed local agent log." -ForegroundColor Green
}

Write-Host "[TransferIDS Agent] Thin agent cleanup complete." -ForegroundColor Green
Write-Host "[TransferIDS Agent] config.json is intentionally preserved. Delete it manually if credentials must be removed."
