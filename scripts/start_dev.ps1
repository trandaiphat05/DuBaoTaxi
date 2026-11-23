# scripts/start_dev.ps1
# Script khoi chay song song ca Backend (FastAPI) va Frontend (Vite)

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  KHỞI ĐỘNG NHANH HỆ THỐNG TAXI NYC (BACKEND + FRONTEND)" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

$projectRoot = Split-Path -Parent $PSScriptRoot

# Khoi chay Backend
Write-Host "Khởi động Backend (FastAPI) trên cổng 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot'; python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

# Khoi chay Frontend
Write-Host "Khởi động Frontend (Vite) trên cổng 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$projectRoot\frontend'; npm run dev"

Write-Host "`n[✓] Đã kích hoạt cả 2 tiến trình:" -ForegroundColor Green
Write-Host " - Backend API:  http://127.0.0.1:8000 (Tài liệu API tại /docs)" -ForegroundColor White
Write-Host " - Frontend Web: http://localhost:5173" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
