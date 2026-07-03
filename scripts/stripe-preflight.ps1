# Preflight billing SaaS con Stripe (operador de la plataforma).
# Verifica variables antes de probar checkout / webhooks locales.

$ErrorActionPreference = 'Continue'
$repoRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $repoRoot 'apps\api\.env'

Write-Host ''
Write-Host '=== Bistro Digital - Preflight Stripe SaaS ===' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path $envFile)) {
  Write-Host "No se encontro $envFile" -ForegroundColor Red
  Write-Host 'Copia apps/api/.env.example y completa las variables Stripe.' -ForegroundColor Yellow
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
    Name = 'STRIPE_SECRET_KEY'
    Ok = $vars['STRIPE_SECRET_KEY'] -match '^sk_(test|live)_'
    Hint = 'Dashboard Stripe -> Developers -> API keys (modo test)'
  }
  @{
    Name = 'STRIPE_PUBLISHABLE_KEY'
    Ok = $vars['STRIPE_PUBLISHABLE_KEY'] -match '^pk_(test|live)_'
    Hint = 'Opcional en API; usado por el panel admin'
  }
  @{
    Name = 'STRIPE_WEBHOOK_SECRET'
    Ok = $vars['STRIPE_WEBHOOK_SECRET'] -match '^whsec_'
    Hint = 'Tras npm run stripe:listen, copiar whsec_... a .env y reiniciar API'
  }
  @{
    Name = 'STRIPE_PRICE_PRO'
    Ok = $vars['STRIPE_PRICE_PRO'] -match '^price_'
    Hint = 'Producto Pro en Stripe -> copiar Price ID'
  }
  @{
    Name = 'STRIPE_PRICE_ENTERPRISE'
    Ok = $vars['STRIPE_PRICE_ENTERPRISE'] -match '^price_'
    Hint = 'Producto Enterprise en Stripe -> copiar Price ID'
  }
  @{
    Name = 'WEB_ADMIN_URL'
    Ok = $vars['WEB_ADMIN_URL'] -match '^https?://'
    Hint = 'Default dev: http://localhost:3001 (success/cancel URLs checkout)'
  }
)

$allOk = $true
foreach ($c in $checks) {
  $icon = if ($c.Ok) { '[OK]' } else { '[--]' }
  $color = if ($c.Ok) { 'Green' } else { 'Yellow' }
  Write-Host "$icon $($c.Name)" -ForegroundColor $color
  if (-not $c.Ok) {
    Write-Host "     $($c.Hint)" -ForegroundColor DarkGray
    $allOk = $false
  }
}

Write-Host ''
. (Join-Path $PSScriptRoot 'resolve-stripe-cli.ps1')
$stripePath = Get-StripeCliPath
if ($stripePath) {
  Write-Host '[OK] Stripe CLI instalado' -ForegroundColor Green
  Write-Host "     $stripePath" -ForegroundColor DarkGray
} else {
  Write-Host '[--] Stripe CLI no instalado' -ForegroundColor Yellow
  Write-Host '     winget install Stripe.StripeCli' -ForegroundColor DarkGray
  Write-Host '     Luego: npm run stripe:login' -ForegroundColor DarkGray
  $allOk = $false
}

Write-Host ''
Write-Host 'Flujo local sugerido:' -ForegroundColor Cyan
Write-Host '  1. Crear productos Pro y Enterprise en https://dashboard.stripe.com/test/products'
Write-Host '  2. Completar STRIPE_* en apps/api/.env'
Write-Host '  3. Terminal A: npm run dev:api'
Write-Host '  4. Terminal B: npm run stripe:listen  -> copiar whsec a .env y reiniciar API'
Write-Host '  5. Terminal C: npm run dev:admin -> /onboarding o /settings para checkout'
Write-Host ''

if ($allOk) {
  Write-Host 'Listo para probar billing SaaS con Stripe test.' -ForegroundColor Green
  exit 0
}

Write-Host 'Faltan pasos de configuracion (ver arriba).' -ForegroundColor Yellow
exit 1
