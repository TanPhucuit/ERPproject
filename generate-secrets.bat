@echo off
REM 🔐 NovaTech ERP - Secret Generator
REM For Windows systems

echo.
echo 🔐 NovaTech ERP - Secret Generator
echo ===================================
echo.

REM Note: This requires OpenSSL to be installed
where openssl >nul 2>nul
if errorlevel 1 (
    echo ❌ OpenSSL not found. Please install OpenSSL from:
    echo    https://slproweb.com/products/Win32OpenSSL.html
    echo.
    echo Or use this online generator:
    echo    https://generate-random.org/encryption-key-generator?count=1
    echo.
    echo Then manually add to .env.local
    pause
    exit /b 1
)

echo 📝 Generated JWT_SECRET (use for both dev and prod):
openssl rand -base64 32

echo.
echo 📝 Usage Instructions:
echo.
echo 1. Copy the secret above
echo 2. Add to backend\.env.local:
echo    JWT_SECRET=^<paste-secret-here^>
echo.
echo 3. Add to Render/Railway environment variables:
echo    JWT_SECRET=^<same-secret^>
echo.
echo ⚠️ Keep this secret safe!
echo    Do not commit to GitHub
echo    Do not share with anyone
echo.
pause
