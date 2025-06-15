@echo off
:: Upload current folder to GitHub using Git and GitHub API
:: Requirements:
::   - Git must be installed
::   - Node.js must be installed
::   - GITHUB_TOKEN must be set as an environment variable

:: === Input ===
set /p repoName=Enter GitHub repository name:
set /p isPrivate=Private repo? (yes/no):

:: === Check for GitHub Token ===
if "%GITHUB_TOKEN%"=="" (
    echo Error: GITHUB_TOKEN environment variable not set.
    echo Please set it using: setx GITHUB_TOKEN your_token_here
    exit /b 1
)

:: === Initialize Git if not already ===
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    git init
)

:: === Create GitHub repo using curl and GitHub API ===
:: Get GitHub username
for /f "tokens=*" %%u in ('curl -s -H "Authorization: token %GITHUB_TOKEN%" https://api.github.com/user ^| findstr "login"') do (
    for /f "tokens=2 delims=:" %%a in ("%%u") do set githubUser=%%~a
)
set githubUser=%githubUser:~1,-2%

:: Check if repo exists
curl -s -H "Authorization: token %GITHUB_TOKEN%" https://api.github.com/repos/%githubUser%/%repoName% | findstr /C:"Not Found" >nul
if not errorlevel 1 (
    echo Repository already exists on GitHub.
) else (
    set privateFlag=false
    if /i "%isPrivate%"=="yes" set privateFlag=true

    curl -s -X POST -H "Authorization: token %GITHUB_TOKEN%" ^
         -d "{\"name\": \"%repoName%\", \"private\": %privateFlag%}" ^
         https://api.github.com/user/repos >nul

    echo Created repository: https://github.com/%githubUser%/%repoName%
)

:: === Commit and Push ===
git add .
git commit -m "Initial commit via Windows script"
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin https://github.com/%githubUser%/%repoName%.git
git push -u origin main

echo.
echo ✅ Project pushed to: https://github.com/%githubUser%/%repoName%
pause
