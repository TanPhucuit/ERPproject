# NovaTech ERP - Vercel Deployment Guide

## 🚀 Architecture

```
/project
├── frontend/              # React + Vite (deployed to Vercel)
│   ├── src/
│   ├── .env.local        # Frontend env vars
│   └── package.json
├── backend/              # Express API (deploy separately)
│   ├── src/
│   ├── .env.local       # Backend env vars
│   └── package.json
├── database_schema.sql   # Supabase database schema
├── vercel.json          # Vercel configuration
└── README.md
```

## 📋 Setup Instructions

### 1. Frontend Deployment to Vercel

**Option A: Deploy via Vercel UI**

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Select `frontend` as root directory
6. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://thrazxhwqetphjogcdji.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
   VITE_API_URL=https://your-backend-url/api
   ```
7. Click Deploy

**Option B: Deploy via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel --prod
```

### 2. Backend Deployment

**Option 1: Deploy to Render.com (Recommended for Node.js)**

1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +"
4. Select "Web Service"
5. Connect your GitHub repository
6. Configure:
   - **Name**: novatech-erp-backend
   - **Root Directory**: backend
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18
7. Add environment variables (same as .env.example)
8. Click Deploy

**Option 2: Deploy to Railway.app**

1. Go to [railway.app](https://railway.app)
2. Click "Start New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Add environment variables
6. Deploy

**Option 3: Deploy to Fly.io**

```bash
# Install Fly CLI
# Go to https://fly.io/docs/getting-started/installing-flyctl/

# Login
flyctl auth login

# Create app
flyctl launch

# Deploy
flyctl deploy
```

### 3. Environment Variables Setup

**Frontend (.env.local in frontend/)**
```
VITE_SUPABASE_URL=https://thrazxhwqetphjogcdji.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
VITE_API_URL=https://your-backend-domain.com/api
```

**Backend (.env.local in backend/)**
```
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://thrazxhwqetphjogcdji.supabase.co
SUPABASE_ANON_KEY=sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
JWT_SECRET=your-secure-jwt-secret-min-32-characters
CORS_ORIGIN=https://your-frontend-domain.vercel.app
LOG_LEVEL=info
```

## 🔗 Connecting Frontend to Backend

1. **Update Backend URL**: Get the deployed backend URL (e.g., `https://novatech-backend.onrender.com`)
2. **Update Frontend**: Set `VITE_API_URL` to `https://novatech-backend.onrender.com/api`
3. **Update CORS**: Backend `CORS_ORIGIN` should include frontend URL

## 🌐 DNS Configuration (Optional)

For custom domains:
1. Add custom domain in Vercel/Render settings
2. Update DNS records pointing to provider's nameservers
3. SSL/TLS will be automatic

## 📝 Quick Deploy Checklist

- [ ] Frontend environment variables configured in Vercel
- [ ] Backend environment variables configured in hosting platform
- [ ] Database schema deployed to Supabase
- [ ] Backend deployed and running
- [ ] Frontend `VITE_API_URL` points to deployed backend
- [ ] CORS configured on backend
- [ ] Test login functionality
- [ ] Monitor logs for errors

## 🐛 Troubleshooting

**Frontend build fails**
- Check Node version (need 18+)
- Verify all environment variables are set
- Clear build cache

**Backend connection issues**
- Verify VITE_API_URL is correct
- Check CORS settings
- Verify backend is running

**Database connection issues**
- Verify Supabase credentials
- Check database schema was imported
- Review Supabase connection logs

## 📚 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Render Documentation](https://render.com/docs)
- [Railway Documentation](https://docs.railway.app)
