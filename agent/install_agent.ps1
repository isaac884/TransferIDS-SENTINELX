$ErrorActionPreference = "Stop"

$AgentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigExample = Join-Path $AgentRoot "config.example.json"
$Config = Join-Path $AgentRoot "config.json"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python is required to run the TransferIDS thin sensor agent."
}

if (-not (Test-Path $ConfigExample)) {
    throw "Missing config.example.json in $AgentRoot"
}

if (-not (Test-Path $Config)) {
    Copy-Item $ConfigExample $Config
    Write-Host "[TransferIDS Agent] Created config.json from config.example.json" -ForegroundColor Green
} else {
    Write-Host "[TransferIDS Agent] config.json already exists; leaving it unchanged." -ForegroundColor Yellow
}

Write-Host "[TransferIDS Agent] Thin sensor setup complete." -ForegroundColor Green
Write-Host "[TransferIDS Agent] Edit config.json with a real agent_id, tenant_id, server_url, auth_token, and observation_file before sending observations."
Write-Host "[TransferIDS Agent] This MVP does not install a Windows Service and does not perform raw packet capture."
