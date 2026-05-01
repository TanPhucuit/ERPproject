#!/bin/bash

# 🔐 NovaTech ERP - Secret Generator
# Generate random secrets for production deployment

echo "🔐 NovaTech ERP - Secret Generator"
echo "=================================="
echo ""

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT_SECRET (32 bytes):"
echo "$JWT_SECRET"
echo ""

# Alternative: 64-byte secret (more secure)
JWT_SECRET_64=$(openssl rand -base64 64)
echo "Generated JWT_SECRET (64 bytes - more secure):"
echo "$JWT_SECRET_64"
echo ""

echo "📝 Usage Instructions:"
echo ""
echo "1. Copy one of the secrets above"
echo "2. Add to backend/.env.local:"
echo "   JWT_SECRET=<paste-secret-here>"
echo ""
echo "3. Add to Render/Railway environment variables:"
echo "   JWT_SECRET=<same-secret>"
echo ""
echo "⚠️  Keep this secret safe!"
echo "    Do not commit to GitHub"
echo "    Do not share with anyone"
