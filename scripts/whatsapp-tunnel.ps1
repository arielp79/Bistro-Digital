param(
  [int]$Port = 3000
)

Write-Host ""
Write-Host "=== Bistró Digital — Túnel WhatsApp (staging) ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Dejá la API corriendo en http://localhost:$Port (npm run dev:api)"
Write-Host "2. Copiá la URL HTTPS que aparezca abajo"
Write-Host "3. En apps/api/.env seteá: API_PUBLIC_URL=<url-del-tunel>"
Write-Host "4. Reiniciá la API y configurá el webhook en Meta Developers"
Write-Host ""

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue

if ($cloudflared) {
  Write-Host "Usando cloudflared..." -ForegroundColor Green
  cloudflared tunnel --url "http://localhost:$Port"
  exit $LASTEXITCODE
}

if ($ngrok) {
  Write-Host "Usando ngrok..." -ForegroundColor Green
  ngrok http $Port
  exit $LASTEXITCODE
}

Write-Host "No se encontró cloudflared ni ngrok." -ForegroundColor Red
Write-Host ""
Write-Host "Instalá uno de estos:"
Write-Host "  cloudflared: winget install Cloudflare.cloudflared"
Write-Host "  ngrok:       winget install Ngrok.Ngrok"
Write-Host ""
Write-Host "O manualmente: ngrok http $Port"
exit 1
