# Starts a tiny local workflow API and tests it with HTTP calls.
# This is the shortest practical way to curl ERP business workflows because the
# production app is a Vite frontend, not an HTTP backend.

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$Port = if ($env:WORKFLOW_TEST_PORT) { [int]$env:WORKFLOW_TEST_PORT } else { 8787 }
$BaseUrl = "http://localhost:$Port"
$LogFile = Join-Path $ScriptDir 'workflow_api_server.log'
$ErrFile = Join-Path $ScriptDir 'workflow_api_server.err.log'

function Invoke-LocalCurl {
  param(
    [Parameter(Mandatory = $true)] [string] $Method,
    [Parameter(Mandatory = $true)] [string] $Path
  )

  $params = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    ContentType = 'application/json'
  }
  if ($Method -ne 'GET') { $params.Body = '{}' }
  return Invoke-RestMethod @params
}

Write-Host "=== ERP WORKFLOW CURL TESTS ===" -ForegroundColor Green
Write-Host "Starting local test backend: $BaseUrl" -ForegroundColor Cyan

$node = Get-Command node -ErrorAction Stop
$server = Start-Process `
  -FilePath $node.Source `
  -ArgumentList @('scripts/api_tests/workflow_api_server.mjs') `
  -WorkingDirectory $RepoRoot `
  -PassThru `
  -WindowStyle Hidden `
  -RedirectStandardOutput $LogFile `
  -RedirectStandardError $ErrFile

try {
  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $health = Invoke-LocalCurl -Method GET -Path '/health'
      $ready = $true
      break
    } catch {
      if ($server.HasExited) {
        throw "Workflow API server exited early. See $ErrFile"
      }
    }
  }
  if (-not $ready) { throw "Workflow API server did not become ready. See $ErrFile" }

  Write-Host "[OK] Backend ready. Mode: $($health.mode)" -ForegroundColor Green
  Write-Host "[OK] Master data: product=$($health.masterData.product), warehouse=$($health.masterData.warehouse), supplier=$($health.masterData.supplier)" -ForegroundColor Green

  Write-Host ""
  Write-Host "Curl: POST /workflows/all" -ForegroundColor Cyan
  $result = Invoke-LocalCurl -Method POST -Path '/workflows/all'
  $result | ConvertTo-Json -Depth 12 | Write-Host

  if (-not $result.ok) {
    throw "One or more workflow tests failed. See JSON above for the exact step."
  }

  Write-Host ""
  Write-Host "[OK] All ERP workflows passed through local curl API." -ForegroundColor Green
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
