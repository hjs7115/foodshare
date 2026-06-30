Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Fetching frontend..."
git fetch frontend main

Write-Host "Checking out frontend files into flat project..."
git checkout frontend/main -- .env.example index.html package-lock.json package.json pnpm-workspace.yaml postcss.config.mjs public scripts/fix_docx_korean.py scripts/test-backend.bat scripts/test-backend.sh scripts/update_docx_pwa_focus.py src/app src/styles src/main.tsx vite.config.ts docs

New-Item -ItemType Directory -Force docs | Out-Null
git show frontend/main:README.md | Set-Content -Encoding UTF8 docs/README-frontend.md

Write-Host "Frontend sync complete. Review changes with: git status"
