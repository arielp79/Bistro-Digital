# Guarda GEMINI_API_KEY en apps/api/.env y valida conexión con Gemini.
param(
  [string]$ApiKey
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $repoRoot 'apps\api\.env'

Write-Host ''
Write-Host '=== Bistró Digital — Configurar Gemini API Key ===' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $envFile)) {
  Write-Host "No se encontró $envFile" -ForegroundColor Red
  exit 1
}

$key = $ApiKey
if (-not $key) {
  Write-Host 'Obtené tu key en: https://aistudio.google.com/apikey' -ForegroundColor Gray
  Write-Host ''
  $key = Read-Host 'Pegá tu GEMINI_API_KEY'
}

$key = $key.Trim().Trim('"').Trim("'")
if (-not $key -or $key.Length -lt 20) {
  Write-Host 'API key inválida o vacía.' -ForegroundColor Red
  exit 1
}

$content = Get-Content $envFile -Raw
if ($content -match '(?m)^GEMINI_API_KEY=') {
  $content = $content -replace '(?m)^GEMINI_API_KEY=.*$', "GEMINI_API_KEY=$key"
} else {
  $content = $content.TrimEnd() + "`nGEMINI_API_KEY=$key`n"
}
if ($content -notmatch '(?m)^AI_PROVIDER=') {
  $content = $content.TrimEnd() + "`nAI_PROVIDER=gemini`n"
} else {
  $content = $content -replace '(?m)^AI_PROVIDER=.*$', 'AI_PROVIDER=gemini'
}
Set-Content -Path $envFile -Value $content -NoNewline -Encoding utf8

Write-Host 'GEMINI_API_KEY guardada en apps/api/.env' -ForegroundColor Green
Write-Host 'Probando conexión con Gemini...' -ForegroundColor Gray

Push-Location $repoRoot
npm run gemini:test --silent
$code = $LASTEXITCODE
Pop-Location

if ($code -ne 0) {
  Write-Host 'La key se guardó pero la prueba falló — verificá que la key sea válida.' -ForegroundColor Yellow
  exit $code
}

Write-Host ''
Write-Host 'Gemini OK. Reiniciá la API: npm run dev:api' -ForegroundColor Green
exit 0
