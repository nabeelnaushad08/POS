@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM Zenthoz POS — Client Deployment Package Builder (Windows)
REM Usage: scripts\package-for-client.bat clientname
REM ─────────────────────────────────────────────────────────────────────────────

SET CLIENT=%1
IF "%CLIENT%"=="" SET CLIENT=client
SET PACKAGE_NAME=zenthoz-pos-%CLIENT%
SET PACKAGE_DIR=dist\%PACKAGE_NAME%

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Zenthoz POS - Packaging for: %CLIENT%
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo [1/4] Building Next.js app...
call npm run build
IF ERRORLEVEL 1 (echo BUILD FAILED & exit /b 1)

echo [2/4] Assembling package...
IF EXIST "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%\app"

xcopy /e /i /q ".next\standalone" "%PACKAGE_DIR%\app"
xcopy /e /i /q ".next\static"     "%PACKAGE_DIR%\app\.next\static"
xcopy /e /i /q "public"           "%PACKAGE_DIR%\app\public"
xcopy /e /i /q "prisma"           "%PACKAGE_DIR%\prisma"
xcopy /e /i /q "print-agent"      "%PACKAGE_DIR%\print-agent"
xcopy /e /i /q "docs"             "%PACKAGE_DIR%\docs"
copy ".env.example" "%PACKAGE_DIR%\.env.example"

echo [3/4] Creating ZIP...
powershell -NoProfile -Command "Compress-Archive -Path '%PACKAGE_DIR%' -DestinationPath 'dist\%PACKAGE_NAME%.zip' -Force"

echo [4/4] Cleaning up...
rmdir /s /q "%PACKAGE_DIR%"

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Done!  -^>  dist\%PACKAGE_NAME%.zip
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
