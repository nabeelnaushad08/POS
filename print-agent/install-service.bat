@echo off
echo Installing POS Print Agent as Windows Service...
echo This requires Administrator privileges.
echo.
node "%~dp0install-service.js"
echo.
pause
