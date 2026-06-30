Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Fetching backend..."
git fetch backend main

Write-Host "Checking out backend files into flat project..."
git checkout backend/main -- .gitattributes build.gradle gradle gradlew gradlew.bat settings.gradle src/main src/test docs/API.md docs/design docs/images

New-Item -ItemType Directory -Force docs | Out-Null
git show backend/main:README.md | Set-Content -Encoding UTF8 docs/README-backend.md

Write-Host "Backend sync complete. Review changes with: git status"
