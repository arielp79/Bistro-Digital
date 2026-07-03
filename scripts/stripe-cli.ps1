# Wrapper de Stripe CLI (funciona aunque stripe no este en PATH tras winget).
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$StripeArgs
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'resolve-stripe-cli.ps1')

$stripePath = Get-StripeCliPath
if (-not $stripePath) {
  Write-StripeCliNotFound
  exit 1
}

if ($StripeArgs.Count -eq 0) {
  Write-Host "Stripe CLI: $stripePath" -ForegroundColor DarkGray
  & $stripePath --version
  exit $LASTEXITCODE
}

& $stripePath @StripeArgs
exit $LASTEXITCODE
