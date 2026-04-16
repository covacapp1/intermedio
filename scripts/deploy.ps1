param(
  [string]$Message = "update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

$ErrorActionPreference = 'Stop'

Write-Host "[A] Push a GitHub para disparar Vercel"
powershell -ExecutionPolicy Bypass -File .\scripts\push.ps1 -Message $Message
if ($LASTEXITCODE -ne 0) {
  throw "Fallo el push a GitHub"
}

Write-Host "[B] Deploy de Supabase function"
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-supabase.ps1
if ($LASTEXITCODE -ne 0) {
  throw "Fallo el deploy de Supabase"
}
