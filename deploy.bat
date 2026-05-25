@echo off
setlocal enabledelayedexpansion

echo ============================================
echo KUSQA — Deploy & Commit Script
echo ============================================
echo.

REM Get current date/time for commit message
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)

set "commit_msg=chore: environment stabilization with bun - %mydate% %mytime%"

echo Commit message: %commit_msg%
echo.

REM Step 1: Check git status
echo ============================================
echo STEP 1: Git Status
echo ============================================
git status --short
echo.

REM Step 2: Add all changes
echo ============================================
echo STEP 2: Staging Changes
echo ============================================
git add .
echo ✓ Changes staged
echo.

REM Step 3: Commit
echo ============================================
echo STEP 3: Committing
echo ============================================
git commit -m "%commit_msg%"
if errorlevel 1 (
  echo ⚠ Nothing to commit or commit failed
) else (
  echo ✓ Commit successful
)
echo.

REM Step 4: Push to repository
echo ============================================
echo STEP 4: Pushing to Repository
echo ============================================
git push origin main
if errorlevel 1 (
  echo ✗ Push failed. Check your connection or authentication.
  echo Try: git push origin main --verbose
  pause
  exit /b 1
)
echo ✓ Push successful
echo.

REM Step 5: Run dev server
echo ============================================
echo STEP 5: Starting Dev Server
echo ============================================
echo Running: bun run dev
echo Local:   http://localhost:8081/
echo.
bun run dev

pause
