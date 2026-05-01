# 📋 Vercel Deployment Checklist

## ✅ Pre-Deployment Setup

### Local Testing
- [ ] Clone repository locally
- [ ] Run `npm run install-all`
- [ ] Run `npm run develop` - verify both frontend and backend start
- [ ] Login to app with demo credentials
- [ ] Test creating a customer, product, sales order
- [ ] Verify no console errors

### Environment Variables
- [ ] Frontend `.env.local` has Supabase credentials
- [ ] Backend `.env.local` has Supabase and JWT secret
- [ ] `.env.local` files are in `.gitignore` (not committed)
- [ ] `.env.example` files exist as templates

### Database
- [ ] Supabase project created
- [ ] `database_schema.sql` imported successfully
- [ ] 63 tables verified in Supabase
- [ ] Demo user created in `users` table
- [ ] Test data seeded (optional)

## 🚀 Frontend Deployment (Vercel)

### GitHub Setup
- [ ] Repository pushed to GitHub
- [ ] Main branch is production-ready
- [ ] No sensitive data committed

### Vercel Configuration
1. Go to https://vercel.com
2. Click "New Project"
3. Import GitHub repository
4. Configure:
   - [ ] Project name: `novatech-erp` (or your choice)
   - [ ] Framework preset: `Vite`
   - [ ] Root directory: `frontend`
   - [ ] Build command: `npm run build`
   - [ ] Output directory: `dist`

### Environment Variables (Vercel)
Add under **Settings → Environment Variables**:
- [ ] `VITE_SUPABASE_URL`: `https://thrazxhwqetphjogcdji.supabase.co`
- [ ] `VITE_SUPABASE_ANON_KEY`: `sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w`
- [ ] `VITE_API_URL`: `https://your-backend-url/api` (update after backend deployment)

### Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (3-5 minutes)
- [ ] Verify deployment succeeded
- [ ] Visit deployed URL and test login

## 🔧 Backend Deployment

### Choose Your Platform

#### Option A: Render.com (Recommended)
1. Go to https://render.com
2. Sign up / Login
3. Click "New +"
4. Select "Web Service"
5. Connect GitHub repository
6. Configure:
   - [ ] Name: `novatech-erp-backend`
   - [ ] Environment: `Node`
   - [ ] Region: Choose nearest to you
   - [ ] Branch: `main`
   - [ ] Root directory: `backend`
   - [ ] Build command: `npm install && npm run build`
   - [ ] Start command: `npm start`

7. Add environment variables:
   - [ ] `PORT`: `3001`
   - [ ] `NODE_ENV`: `production`
   - [ ] `SUPABASE_URL`: `https://thrazxhwqetphjogcdji.supabase.co`
   - [ ] `SUPABASE_ANON_KEY`: `sb_publishable_8JCzcLEIlLwC-pXmOsZoCw_-msYi8_w`
   - [ ] `JWT_SECRET`: (generate random 32+ char string)
   - [ ] `CORS_ORIGIN`: `https://your-frontend.vercel.app`
   - [ ] `LOG_LEVEL`: `info`

8. Click "Create Web Service"
9. Wait for first deploy (5-10 minutes)
10. Copy deployed URL (e.g., `https://novatech-backend.onrender.com`)

#### Option B: Railway.app
1. Go to https://railway.app
2. Create new project
3. Deploy from GitHub repo
4. Add environment variables (same as above)

### Get Backend URL
- [ ] Deployed backend URL (e.g., `https://novatech-backend.onrender.com`)
- [ ] Test health check: `https://your-backend-url/health`

## 🔗 Connect Frontend to Backend

1. Get your **backend URL** from Render/Railway
2. Go back to Vercel project settings
3. Update environment variable:
   - [ ] `VITE_API_URL`: `https://your-backend-url/api`
4. Trigger redeploy:
   - [ ] Make a small code change (e.g., add comment)
   - [ ] Push to main
   - [ ] Vercel auto-redeploys
   - OR manually redeploy from Vercel dashboard

## ✨ Final Testing

### Frontend (Vercel URL)
- [ ] Page loads without errors
- [ ] Can see login form
- [ ] Try login with: `admin@novatech.com` / `password123`
- [ ] Dashboard loads after login
- [ ] Navigate between modules (CRM, Sales, etc.)
- [ ] No CORS errors in console

### Backend Connectivity
- [ ] Test API directly: 
  ```bash
  curl https://your-backend-url/health
  ```
- [ ] Should return: `{"status":"ok","timestamp":"..."}`
- [ ] Frontend can fetch data from API

### Full Workflow Test
- [ ] Login with demo credentials
- [ ] View dashboard metrics
- [ ] Create a new customer
- [ ] Verify customer appears in list
- [ ] No errors in browser console
- [ ] No errors in backend logs (Render/Railway dashboard)

## 🔐 Security Checklist

- [ ] JWT_SECRET is strong (32+ random characters)
- [ ] CORS_ORIGIN is set to frontend URL only
- [ ] No sensitive data in GitHub commits
- [ ] `.env` files are in `.gitignore`
- [ ] Environment variables set in deployment platform (not in code)
- [ ] Supabase RLS policies enabled (if using them)

## 📊 Monitoring & Debugging

### Vercel Dashboard
- [ ] Check build logs for errors
- [ ] Monitor function duration
- [ ] Review analytics

### Render/Railway Dashboard
- [ ] Check deploy logs
- [ ] Monitor CPU/Memory usage
- [ ] Review service logs

### Supabase Dashboard
- [ ] Check database connectivity
- [ ] Review query performance
- [ ] Check authentication logs

## 🚨 Troubleshooting

### Frontend Deploy Fails
**Problem**: Build error during Vercel deploy
**Solution**:
```bash
# In frontend directory
npm run build
# Fix any errors locally first
```

### Backend Connection Issues
**Problem**: Frontend → Backend requests fail (CORS error)
**Solution**:
- [ ] Verify CORS_ORIGIN includes `https://` and domain
- [ ] Verify backend URL is correct in VITE_API_URL
- [ ] Check backend logs for connection errors

### Database Connection Fails
**Problem**: Backend can't connect to Supabase
**Solution**:
- [ ] Verify SUPABASE_URL in .env
- [ ] Verify SUPABASE_ANON_KEY is correct
- [ ] Test connection in Supabase dashboard

### Login Fails
**Problem**: Can't login even with correct credentials
**Solution**:
- [ ] Check `users` table has data in Supabase
- [ ] Verify JWT_SECRET is consistent between deployments
- [ ] Check backend logs for authentication errors

## 📝 Post-Deployment

- [ ] Update DNS records (if using custom domain)
- [ ] Setup monitoring/alerts
- [ ] Document deployed URLs
- [ ] Share access with team
- [ ] Create database backups
- [ ] Document deployment process for team

## 📞 Quick Links

| Service | URL |
|---------|-----|
| Vercel | https://vercel.com |
| Render | https://render.com |
| Railway | https://railway.app |
| Supabase | https://supabase.com |
| GitHub | https://github.com |

## ✅ Done!

Once all checkboxes are complete, your ERP system is live on Vercel! 🎉

---

**Need help?** 
- Check error messages in Vercel/Render logs
- Review browser console (F12)
- Check Supabase dashboard
- Verify all environment variables match exactly
