# 🚀 Vercel Frontend Deployment Complete Guide

## What is Vercel?

Vercel is the platform built by the creators of Next.js. Perfect for deploying React/Vite apps with:
- ✅ Automatic deployments from Git
- ✅ Zero-config setup
- ✅ Global CDN
- ✅ Serverless functions (if needed)
- ✅ Free tier available

## 📦 Step 1: Prepare Your Repository

### 1.1 Push Code to GitHub

```bash
# From project root
git init
git add .
git commit -m "Initial commit: NovaTech ERP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/novatech-erp.git
git push -u origin main
```

### 1.2 Verify Structure

Your GitHub repo should have this structure:
```
novatech-erp/
├── frontend/           ← React app
├── backend/            ← Node.js API
├── database_schema.sql
├── vercel.json
└── README.md
```

## 🌐 Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account

### 2.2 Import Project

1. After login, click "New Project"
2. Under "Import Git Repository", paste:
   ```
   https://github.com/YOUR_USERNAME/novatech-erp
   ```
3. Click "Import"

### 2.3 Configure Project

In the "Configure Project" screen:

1. **Framework**: Select `Vite`
2. **Root Directory**: Click "Edit" and select `frontend`
3. **Build & Output Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

Screenshot reference:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project Name:  novatech-erp
Framework:     Vite ✓
Root Directory: frontend ✓
Environment:   (Next step)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.4 Add Environment Variables

**IMPORTANT**: Before clicking Deploy, add environment variables:

1. In the same configuration screen, scroll down to "Environment Variables"
2. Add these variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://thrazxhwqetphjogcdji.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w` |
| `VITE_API_URL` | `http://localhost:3001/api` (Update later after backend deployment) |

Screenshot:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment Variables

VITE_SUPABASE_URL
Value: https://thrazxhwqetphjogcdji.supabase.co
   [Add]

VITE_SUPABASE_ANON_KEY
Value: sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w
   [Add]

VITE_API_URL  
Value: http://localhost:3001/api
   [Add]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2.5 Deploy

1. Click "Deploy"
2. Wait for build to complete (3-5 minutes)
3. You'll see a success message with your deployment URL

Your app is now live at: `https://novatech-erp-XXXXXX.vercel.app`

## 🔄 Step 3: Deploy Backend

Follow the steps in VERCEL_DEPLOYMENT_GUIDE.md to deploy backend to:
- **Render.com** (recommended)
- **Railway.app**
- **Fly.io**

You'll get a backend URL like: `https://novatech-erp-backend.onrender.com`

## 🔗 Step 4: Connect Frontend to Backend

### 4.1 Update Environment Variable

1. Go to your Vercel project dashboard
2. Click "Settings"
3. Go to "Environment Variables"
4. Find `VITE_API_URL`
5. Edit it to your backend URL:
   ```
   https://your-backend.onrender.com/api
   ```
6. Save

### 4.2 Trigger Redeploy

Option A (Recommended - Auto Redeploy):
1. Go to Deployments
2. Click on the latest deployment
3. Scroll down and click "Redeploy"

Option B (Manual via Git):
```bash
git add .
git commit -m "Update backend URL"
git push
# Vercel automatically redeploys on push
```

Wait for new deployment. Your frontend will now use the real backend!

## ✅ Verify Deployment

### Test Frontend
```bash
# In browser, visit your Vercel URL:
https://novatech-erp-XXXXXX.vercel.app/

# You should see:
- ✅ Login page loads
- ✅ Can input email/password
- ✅ No errors in console (F12)
```

### Test Backend Connectivity
```bash
# Open browser console (F12)
# Go to Network tab
# Try to login

# You should see:
- ✅ POST https://your-backend.onrender.com/api/auth/login
- ✅ Response status 200 or 401 (not CORS error)
```

### Test API Directly
```bash
curl https://your-backend.onrender.com/health
# Should return:
# {"status":"ok","timestamp":"2024-04-17T10:30:45.123Z"}
```

## 🔧 Advanced Configuration

### Custom Domain
1. Go to Vercel project → Settings → Domains
2. Click "Add"
3. Enter your domain (e.g., `erp.yourdomain.com`)
4. Follow DNS configuration instructions
5. SSL certificate auto-generated within 48 hours

### Automatic Deployments
Currently enabled by default:
- Any push to `main` branch → auto-deploy to production
- PR to `main` → preview deployment

To disable:
1. Settings → Git
2. Turn off "Deploy on push"

### Environment Variables Management

**Development (.env.local)**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3001/api
```

**Production (Vercel Dashboard)**
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://your-backend-url/api
```

Different URLs for local vs production! ✅

## 📊 Monitoring & Analytics

### Deployment History
- Go to "Deployments" tab to see all previous versions
- Rollback to any previous deployment in seconds

### Performance Analytics
- Go to Settings → Speed Insights
- Monitor page load times and Core Web Vitals

### Error Tracking
- View deploy logs if build fails
- Check runtime errors in browser console

## 🐛 Troubleshooting

### Build Fails with "Module not found"
```
Error: Cannot find module 'react'
```
**Solution:**
```bash
cd frontend
npm install
git add package-lock.json
git commit -m "fix: update dependencies"
git push
```

### Frontend Can't Connect to Backend
**Problem**: CORS error in browser console
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
1. Check backend `CORS_ORIGIN` includes frontend URL
2. Verify `VITE_API_URL` is correct
3. Ensure backend is running

### Pages Return 404
**Problem**: Routing isn't working after deploy
**Solution:**
Your `vercel.json` should handle client-side routing. Current config is correct for Vite.

### Environment Variables Not Loading
**Problem**: `VITE_API_URL` is undefined
**Solution:**
1. Verify variables are set in Vercel dashboard
2. Redeploy after adding variables
3. Clear browser cache
4. Rebuild locally to test: `npm run build`

## 📚 Deployment Process Flow

```
┌─────────────────────────────────────────────┐
│ 1. Make changes locally                     │
│    npm run dev → Test everything           │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ 2. Push to GitHub                           │
│    git add . → git commit → git push        │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ 3. Vercel Auto-Detects                      │
│    Build → Run Tests → Deploy               │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│ 4. Live on Production! 🚀                   │
│    https://your-app.vercel.app              │
└─────────────────────────────────────────────┘
```

## 🎯 Next Steps

1. ✅ Deploy backend to Render/Railway/Fly
2. ✅ Update `VITE_API_URL` in Vercel
3. ✅ Test login functionality
4. ✅ Create test customer/order
5. ✅ Share URL with team
6. ✅ Monitor logs for issues

## 📞 Support Resources

- Vercel Docs: https://vercel.com/docs
- React Docs: https://react.dev
- Vite Docs: https://vitejs.dev
- Supabase Docs: https://supabase.com/docs

---

**Congratulations! Your ERP frontend is now deployed on Vercel!** 🎉

For backend deployment, see VERCEL_DEPLOYMENT_GUIDE.md
