@echo off
chcp 65001 >nul
echo ================================================================
echo   KHỞI ĐỘNG NHANH HỆ THỐNG TAXI NYC (BACKEND + FRONTEND)
echo ================================================================
echo Đang khởi chạy FastAPI Backend tại http://127.0.0.1:8000 ...
start "NYC Taxi - FastAPI Backend (Port 8000)" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Đang khởi chạy Vite React Frontend tại http://localhost:5173 ...
start "NYC Taxi - Vite Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo [✓] Đã khởi chạy cả 2 tiến trình trong các cửa sổ riêng biệt!
echo - Backend API:  http://127.0.0.1:8000 (Swagger docs tại /docs)
echo - Frontend Web: http://localhost:5173
echo ================================================================
