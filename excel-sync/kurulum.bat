@echo off
chcp 65001 >nul
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo.
    echo HATA: Python bulunamadi.
    echo.
    echo Once https://www.python.org/downloads/ adresinden Python'u kurun.
    echo Kurulum ekraninda "Add python.exe to PATH" kutusunu MUTLAKA isaretleyin.
    echo Kurduktan sonra bu dosyaya tekrar cift tiklayin.
    echo.
    pause
    exit /b 1
)

python setup_wizard.py

echo.
pause
