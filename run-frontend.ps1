# Run AICTE Frontend Dev Server
Write-Host "Starting AICTE Frontend on http://localhost:3000..." -ForegroundColor Cyan
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")

cd frontend
npm.cmd run dev
