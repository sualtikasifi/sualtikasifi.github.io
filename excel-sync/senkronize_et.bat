@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist config.json (
    echo.
    echo HATA: config.json bulunamadi. Once kurulum.bat'i calistirin.
    echo.
    pause
    exit /b 1
)

python sync.py

echo.
pause
