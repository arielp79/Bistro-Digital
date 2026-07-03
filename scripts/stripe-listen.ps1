# Reenvia webhooks Stripe al API local (billing SaaS).
# Requiere Stripe CLI: winget install Stripe.StripeCli && stripe login

$ErrorActionPreference = 'Stop'
$forwardUrl = 'localhost:3000/api/v1/webhooks/stripe'

. (Join-Path $PSScriptRoot 'resolve-stripe-cli.ps1')
$stripePath = Get-StripeCliPath
if (-not $stripePath) {
  Write-StripeCliNotFound
  Write-Host 'Luego ejecuta: npm run stripe:login' -ForegroundColor Yellow
  Write-Host ''
  exit 1
}

Write-Host ''
Write-Host '=== Stripe listen -> API local ===' -ForegroundColor Cyan
Write-Host "Forward: http://$forwardUrl" -ForegroundColor DarkGray
Write-Host ''
Write-Host 'Copia el webhook signing secret (whsec_...) a STRIPE_WEBHOOK_SECRET en apps/api/.env' -ForegroundColor Yellow
Write-Host 'y reinicia la API despues de iniciar este listener.' -ForegroundColor Yellow
Write-Host ''

& $stripePath listen --forward-to $forwardUrl
