$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 5500

if ($env:MEDIPOINT_WEB_PORT) {
    $port = [int]$env:MEDIPOINT_WEB_PORT
}

Set-Location $repoRoot

Write-Host "Serving MediPoint portal at http://127.0.0.1:$port/" -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop.' -ForegroundColor Cyan

python -m http.server $port
