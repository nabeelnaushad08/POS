@echo off
echo Setting up POS Print Agent with PM2 (auto-start on boot)...
echo.
echo Step 1: Installing PM2 globally...
npm install -g pm2
echo.
echo Step 2: Starting print agent...
pm2 start "%~dp0index.js" --name "pos-print-agent"
echo.
echo Step 3: Saving PM2 process list...
pm2 save
echo.
echo Step 4: Setting up Windows auto-start...
pm2-startup install
echo.
echo Done! The POS Print Agent will now start automatically on Windows boot.
echo    To check status: pm2 status
echo    To view logs: pm2 logs pos-print-agent
echo    To stop: pm2 stop pos-print-agent
echo.
pause
