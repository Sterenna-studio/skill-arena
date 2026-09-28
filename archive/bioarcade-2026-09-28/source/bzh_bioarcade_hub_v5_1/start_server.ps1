\
Set-Location -LiteralPath $PSScriptRoot
Write-Host ""
Write-Host "[BioArcade] Starting local server on http://localhost:8000/"
Write-Host "Close the window to stop the server."
Write-Host ""
python -m http.server 8000
