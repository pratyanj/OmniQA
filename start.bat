@echo off
echo Installing QA Platform dependencies...
cd /d "P:\React native\QA"
npm install
echo.
echo Starting dev server on port 8006...
npm run dev
pause
