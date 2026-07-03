function Get-StripeCliPath {
  $cmd = Get-Command stripe -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $wingetGlob = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Stripe.StripeCli*\stripe.exe'
  $wingetExe = Get-Item -Path $wingetGlob -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($wingetExe) {
    return $wingetExe.FullName
  }

  return $null
}

function Write-StripeCliNotFound {
  Write-Host 'Stripe CLI no encontrado.' -ForegroundColor Red
  Write-Host 'Instala con: winget install Stripe.StripeCli' -ForegroundColor Yellow
  Write-Host 'Si ya esta instalado, cierra y abre la terminal o usa: npm run stripe:login' -ForegroundColor Yellow
  Write-Host ''
}
