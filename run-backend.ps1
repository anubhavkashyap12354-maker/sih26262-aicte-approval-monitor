# Run AICTE FastAPI Backend
Write-Host "Starting AICTE FastAPI Backend on http://localhost:8000..." -ForegroundColor Cyan
$env:DISABLE_SQLALCHEMY_CEXT = "1"
$pythonPath = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"

if (!(Test-Path $pythonPath)) {
    $pythonPath = "python"
}

cd backend
& $pythonPath -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
