param(
  [string]$Message = "update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

$ErrorActionPreference = 'Stop'

Write-Host "[1/3] git add -A"
git add -A

Write-Host "[2/3] git commit"
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
  Write-Host "No habia cambios nuevos para commitear o git devolvio un estado no exitoso."
}

Write-Host "[3/3] git push"
git push
if ($LASTEXITCODE -ne 0) {
  throw "Fallo git push"
}
