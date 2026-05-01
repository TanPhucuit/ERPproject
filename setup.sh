#!/bin/bash

# NovaTech ERP - Quick Deployment Script

echo "🚀 NovaTech ERP - Vercel Deployment Setup"
echo "=========================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing git repository..."
    git init
    echo "✅ Git repository initialized"
fi

# Frontend
echo ""
echo "📦 Setting up Frontend..."
cd frontend
npm install
npm run build
echo "✅ Frontend ready for deployment"
cd ..

# Backend
echo ""
echo "📦 Setting up Backend..."
cd backend
npm install
npm run build
echo "✅ Backend ready for deployment"
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub: git add . && git commit -m 'initial commit' && git push"
echo "2. Frontend: Connect GitHub repo to Vercel"
echo "3. Backend: Deploy to Render.com (Root dir: backend)"
echo "4. Update VITE_API_URL in Vercel env with your backend URL"
echo ""
echo "📖 See VERCEL_DEPLOYMENT_GUIDE.md for detailed instructions"
