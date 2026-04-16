$ErrorActionPreference = 'Stop'

Write-Host "Deploying Supabase Edge Function: server"
supabase functions deploy server
if ($LASTEXITCODE -ne 0) {
  throw "Fallo el deploy de la funcion server"
}
