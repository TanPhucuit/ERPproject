@echo off
REM NovaTech ERP - Quick Deployment Script for Windows

echo.
echo 🚀 NovaTech ERP - Vercel Deployment Setup
echo ==========================================
echo.

REM Check if git is initialized
if not exist ".git" (
    echo 📝 Initializing git repository...
    git init
    echo ✅ Git repository initialized
)

REM Frontend
echo.
echo 📦 Setting up Frontend...
cd frontend
call npm install
call npm run build
if errorlevel 1 (
    echo ❌ Frontend setup failed
    pause
    exit /b 1
)
echo ✅ Frontend ready for deployment
cd ..

REM Backend
echo.
echo 📦 Setting up Backend...
cd backend
call npm install
call npm run build
if errorlevel 1 (
    echo ❌ Backend setup failed
    pause
    exit /b 1
)
echo ✅ Backend ready for deployment
cd ..

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. git add .
echo 2. git commit -m "initial commit"
echo 3. git push origin main
echo 4. Go to Vercel.com and import your GitHub repo
echo 5. Deploy backend separately to Render.com or Railway
echo 6. Update environment variables
echo.
echo 📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions
echo.
pause
