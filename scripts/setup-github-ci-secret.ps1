# Configura el secret MONGODB_URI en GitHub Actions para el pipeline CI.
# Requiere: GitHub CLI (gh) autenticado -- https://cli.github.com/

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $repoRoot 'apps\api\.env'

Write-Host ''
Write-Host '=== Bistro Digital - Configurar secret CI (MONGODB_URI) ===' -ForegroundColor Cyan
Write-Host ''

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host 'GitHub CLI (gh) no esta instalado o no esta en PATH.' -ForegroundColor Red
  Write-Host 'Instala desde https://cli.github.com/ y ejecuta: gh auth login'
  exit 1
}

if (-not (Test-Path $envFile)) {
  Write-Host "No se encontro $envFile" -ForegroundColor Red
  Write-Host 'Copia apps/api/.env.example -> apps/api/.env y configura MongoDB Atlas.'
  exit 1
}

$mongodbUri = $null
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*MONGODB_URI\s*=\s*(.+)\s*$') {
    $mongodbUri = $Matches[1].Trim().Trim('"').Trim("'")
  }
}

if (-not $mongodbUri) {
  Write-Host 'MONGODB_URI no definida en apps/api/.env' -ForegroundColor Red
  exit 1
}

if ($mongodbUri -match 'USUARIO|PASSWORD|localhost') {
  Write-Host 'MONGODB_URI parece un placeholder o localhost -- usa tu cluster Atlas real.' -ForegroundColor Yellow
}

Write-Host 'Verificando conexion a Atlas...' -ForegroundColor Gray
Push-Location $repoRoot
npm run test:preflight --silent
if ($LASTEXITCODE -ne 0) {
  Pop-Location
  Write-Host 'Preflight fallo -- corrige la URI o la whitelist de IP en Atlas antes de subir el secret.' -ForegroundColor Red
  exit 1
}
Pop-Location

Write-Host ''
Write-Host 'Atlas OK. Subiendo secret MONGODB_URI al repositorio remoto...' -ForegroundColor Green
Write-Host '(El valor no se mostrara en pantalla.)' -ForegroundColor Gray
Write-Host ''

$ghArgs = @('secret', 'set', 'MONGODB_URI', '--body', $mongodbUri)

$repo = $env:GITHUB_REPOSITORY
if (-not $repo) {
  try {
    $repo = (& git remote get-url origin 2>$null) -replace '\.git$', '' -replace '^git@github\.com:', '' -replace '^https://github\.com/', ''
  } catch {
    $repo = $null
  }
}
if ($repo) {
  $ghArgs += @('--repo', $repo)
  Write-Host "Repositorio: $repo" -ForegroundColor Gray
}

& gh @ghArgs

if ($LASTEXITCODE -ne 0) {
  Write-Host 'Error al configurar el secret. Estas autenticado? gh auth login' -ForegroundColor Red
  Write-Host 'Si el repo no tiene git remoto, usa: gh secret set MONGODB_URI --repo OWNER/REPO'
  exit 1
}

Write-Host ''
Write-Host 'Secret MONGODB_URI configurado.' -ForegroundColor Green
Write-Host ''
Write-Host 'Importante para CI en GitHub Actions:' -ForegroundColor Yellow
Write-Host '  - Atlas -> Network Access -> agregar 0.0.0.0/0 (o IPs de runners de GitHub)'
Write-Host '  - El job integration-e2e corre tras unit: preflight, seed, integracion y E2E'
Write-Host '  - Dispara el workflow manualmente: Actions -> CI -> Run workflow'
Write-Host ''
