@echo off
setlocal
cd /d "%~dp0"
set "PORT=8123"

where node >nul 2>nul
if %errorlevel%==0 goto :node

where python >nul 2>nul
if %errorlevel%==0 goto :python

echo.
echo Dragon Ball: Canyon Run needs Node.js or Python 3 to start a local server.
echo You can also open index.html directly in your browser.
echo.
pause
exit /b 1

:node
echo Starting Dragon Ball: Canyon Run at http://127.0.0.1:%PORT%
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://127.0.0.1:%PORT%'"
node server.js
goto :end

:python
echo Starting Dragon Ball: Canyon Run at http://127.0.0.1:%PORT%
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 1; Start-Process 'http://127.0.0.1:%PORT%'"
python -m http.server %PORT% --bind 127.0.0.1
goto :end

:end
endlocal
