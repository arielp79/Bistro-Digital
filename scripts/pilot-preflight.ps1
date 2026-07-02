# Preflight para cliente piloto Meta + AFIP (operador SaaS).
# Verifica variables del servidor antes de conectar un restaurante real.

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $repoRoot 'apps\api\.env'

Write-Host ''
Write-Host '=== Bistro Digital - Preflight cliente piloto ===' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $envFile)) {
  Write-Host "No se encontró $envFile" -ForegroundColor Red
  exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$' -and $_ -notmatch '^\s*#') {
    $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}

$checks = @(
  @{
    Name = 'MONGODB_URI'
    Ok = [bool]$vars['MONGODB_URI'] -and $vars['MONGODB_URI'] -notmatch 'USUARIO|PASSWORD'
    Hint = 'Cluster Atlas en apps/api/.env'
  }
  @{
    Name = 'GEMINI_API_KEY'
    Ok = [bool]$vars['GEMINI_API_KEY']
    Hint = 'Google AI Studio: https://aistudio.google.com/apikey'
  }
  @{
    Name = 'OPENAI_API_KEY (alternativa)'
    Ok = [bool]$vars['OPENAI_API_KEY']
    Hint = 'Opcional si usás Gemini'
  }
  @{
    Name = 'API_PUBLIC_URL (HTTPS)'
    Ok = $vars['API_PUBLIC_URL'] -match '^https://'
    Hint = 'Tras npm run pilot:tunnel, pegar URL en API_PUBLIC_URL y reiniciar API'
  }
  @{
    Name = 'WHATSAPP_APP_SECRET (opcional)'
    Ok = [bool]$vars['WHATSAPP_APP_SECRET']
    Hint = 'Recomendado en produccion - valida firmas de webhooks Meta'
  }
  @{
    Name = 'ENCRYPTION_KEY'
    Ok = [bool]$vars['ENCRYPTION_KEY'] -and $vars['ENCRYPTION_KEY'].Length -ge 64
    Hint = '32 bytes hex - cifra tokens de Meta/AFIP en MongoDB'
  }
)

$requiredOk = $true
foreach ($c in $checks) {
  $icon = if ($c.Ok) { '[OK]' } else { '[--]' }
  $color = if ($c.Ok) { 'Green' } else { 'Yellow' }
  if ($c.Name -eq 'GEMINI_API_KEY' -and -not $c.Ok -and -not $vars['OPENAI_API_KEY']) { $requiredOk = $false }
  if ($c.Name -match 'API_PUBLIC_URL' -and -not $c.Ok) { $requiredOk = $false }
  if ($c.Name -eq 'MONGODB_URI' -and -not $c.Ok) { $requiredOk = $false }
  if ($c.Name -eq 'ENCRYPTION_KEY' -and -not $c.Ok) { $requiredOk = $false }
  Write-Host "$icon $($c.Name)" -ForegroundColor $color
  if (-not $c.Ok) {
    Write-Host "     -> $($c.Hint)" -ForegroundColor Gray
  }
}

Write-Host ''
Write-Host 'Panel admin (restaurante):' -ForegroundColor Cyan
Write-Host '  http://localhost:3001/pilot-setup  - checklist Meta + AFIP'
Write-Host '  http://localhost:3001/connect-meta - WhatsApp / Instagram'
Write-Host '  http://localhost:3001/connect-afip  - certificados AFIP'
Write-Host ''

if (-not $requiredOk) {
  Write-Host 'Faltan requisitos del operador SaaS antes del piloto.' -ForegroundColor Yellow
  exit 1
}

Write-Host 'Servidor listo para onboarding piloto.' -ForegroundColor Green
exit 0
