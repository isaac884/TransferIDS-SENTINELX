$ErrorActionPreference = "Stop"

$AgentRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentScript = Join-Path $AgentRoot "transferids_agent.py"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python is required to run the TransferIDS thin sensor agent."
}

if (-not (Test-Path $AgentScript)) {
    throw "Missing transferids_agent.py in $AgentRoot"
}

python $AgentScript --help
Write-Host "[TransferIDS Agent] Smoke test passed. The thin agent entrypoint is available." -ForegroundColor Green
