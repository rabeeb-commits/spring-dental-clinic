# Deployment Guide

This guide will help you deploy the Dental Clinic Management App to free hosting services.

## Quick Summary

- **Frontend**: Deploy to Netlify (Free)
- **Backend**: Deploy to Railway (Free $5 credit/month) or Render (Free tier)
- **Database**: PostgreSQL (included with Railway/Render)

## Prerequisites

1. GitHub account
2. Netlify account (sign up at https://netlify.com)
3. Railway account (sign up at https://railway.app) OR Render account (sign up at https://render.com)

## Step 1: Push to GitHub

1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - ready for deployment"
   ```

2. Create a new repository on GitHub

3. Push to GitHub:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository

### 2.2 Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create the database and set `DATABASE_URL`

### 2.3 Configure Backend Service
1. Click "+ New" → "GitHub Repo" (if not already added)
2. Select your repository
3. Railway will detect it's a Node.js app
4. Click on the service → "Settings"
5. Set **Root Directory**: `backend`
6. Set **Build Command**: `npm install && npm run build && npx prisma generate`
7. Set **Start Command**: `npm run start`

### 2.4 Set Environment Variables
In Railway service settings → "Variables", add:

```
DATABASE_URL=<auto-set by PostgreSQL service>
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://your-app.netlify.app (set after Netlify deployment)
PORT=<auto-set by Railway>
```

**To generate JWT_SECRET:**
- Windows (PowerShell): `[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
- Linux/Mac: `openssl rand -base64 32`

### 2.5 Run Database Migrations
1. In Railway, click on your backend service
2. Click "Deployments" → "View Logs"
3. Click "Shell" tab (or use Railway CLI)
4. Run:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   npm run seed
   ```

### 2.6 Get Backend URL
1. In Railway, click on your backend service
2. Go to "Settings" → "Networking"
3. Generate a public domain (e.g., `https://your-app.railway.app`)
4. **Copy this URL** - you'll need it for Netlify

## Step 3: Deploy Frontend to Netlify

### 3.1 Create Netlify Account
1. Go to https://netlify.com
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repository

### 3.2 Configure Build Settings
Netlify should auto-detect settings from `netlify.toml`, but verify:

- **Base directory**: `frontend`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `frontend/dist`
- **Node version**: `18` (set in Environment variables)

### 3.3 Set Environment Variables
In Netlify → Site settings → Environment variables, add:

```
VITE_API_URL=https://your-backend.railway.app/api
```

Replace `your-backend.railway.app` with your actual Railway backend URL.

### 3.4 Deploy
1. Click "Deploy site"
2. Netlify will build and deploy automatically
3. Get your site URL: `https://your-app.netlify.app`

### 3.5 Update Backend CORS
1. Go back to Railway
2. Update `FRONTEND_URL` environment variable:
   ```
   FRONTEND_URL=https://your-app.netlify.app
   ```
3. Railway will automatically redeploy

## Step 4: Verify Deployment

### Test Backend
Visit: `https://your-backend.railway.app/api/health`

Should return:
```json
{
  "status": "ok",
  "message": "Dental Clinic API is running",
  "timestamp": "..."
}
```

### Test Frontend
1. Visit: `https://your-app.netlify.app`
2. Try logging in with default credentials:
   - Email: `admin@dentalclinic.com`
   - Password: `admin123`
3. Verify all features work

## Alternative: Deploy to Render

If you prefer Render over Railway:

### Backend on Render
1. Sign up at https://render.com
2. "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: `dental-clinic-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build && npx prisma generate`
   - **Start Command**: `npm run start`
   - **Instance Type**: Free

5. Add PostgreSQL:
   - "New +" → "PostgreSQL"
   - Plan: Free (90 days, then $7/month)
   - Copy Internal Database URL

6. Set environment variables (same as Railway)

7. **Note**: Render free tier has cold starts (15-30s first request after inactivity)

### Frontend on Netlify
Same as Step 3 above, but use Render URL:
```
VITE_API_URL=https://your-backend.onrender.com/api
```

## Troubleshooting

### Backend Issues

**Build fails:**
- Check Railway/Render logs
- Verify Node version is 18+
- Ensure all dependencies are in package.json

**Database connection fails:**
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Run `npx prisma generate` before migrations

**CORS errors:**
- Verify `FRONTEND_URL` matches your Netlify URL exactly
- Check backend logs for CORS errors
- Ensure frontend uses correct `VITE_API_URL`

### Frontend Issues

**Build fails:**
- Check Netlify build logs
- Verify Node version is set to 18
- Ensure `VITE_API_URL` is set

**API calls fail:**
- Verify `VITE_API_URL` points to correct backend URL
- Check browser console for errors
- Verify backend is running and accessible

**404 errors on page refresh:**
- Verify `_redirects` file exists in `frontend/public/`
- Check `netlify.toml` has redirects configured

### Database Issues

**Migrations fail:**
- Run `npx prisma generate` first
- Use `prisma migrate deploy` (not `migrate dev`)
- Check database connection string

**Seed fails:**
- Verify database is accessible
- Check seed script for errors
- Run migrations before seeding

## Security Checklist

- [ ] Change default admin password immediately
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Verify `.env` files are NOT in Git
- [ ] Review CORS settings
- [ ] Enable HTTPS (automatic on Netlify/Railway/Render)
- [ ] Set `NODE_ENV=production`

## Cost Summary

**Free Tier:**
- Netlify: Free (100GB bandwidth, 300 build minutes/month)
- Railway: Free ($5 credit/month - usually enough)
- OR Render: Free (with limitations - 90 days for PostgreSQL)

**After Free Tier:**
- Railway: Pay-as-you-go (~$5-10/month)
- Render: $7/month PostgreSQL + $7/month web service
- Netlify: Still free for most use cases

## Support

If you encounter issues:
1. Check deployment logs in Railway/Render/Netlify
2. Verify all environment variables are set
3. Test backend health endpoint
4. Check browser console for frontend errors
