Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

& "$PSScriptRoot\sync-backend.ps1"
& "$PSScriptRoot\sync-frontend.ps1"

Write-Host "All sync complete. Review changes with: git status"
