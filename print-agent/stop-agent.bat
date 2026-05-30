@echo off
echo Stopping POS Print Agent...
pm2 stop pos-print-agent 2>nul
sc stop "POS Print Agent" 2>nul
echo Done.
pause
