# PURA Call Center - Free Hosting Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the PURA Call Center application to free hosting platforms. The application is currently deployed on Manus hosting but can be migrated to alternative providers like Render.com, Railway, or Vercel.

## Deployment Options Comparison

| Platform | Database | Cost | SSL | Deployment Time |
|----------|----------|------|-----|-----------------|
| **Render.com** | PostgreSQL (free tier) | Free | ✓ Included | 2-5 minutes |
| **Railway** | PostgreSQL/MySQL | Free | ✓ Included | 2-5 minutes |
| **Vercel** | External required | Free | ✓ Included | 1-2 minutes |
| **Heroku** | PostgreSQL | Paid only | ✓ Included | 2-5 minutes |

**Recommendation**: **Render.com** offers the best balance of free tier features, ease of use, and reliability for this application.

---

## Option 1: Deploy to Render.com (Recommended)

### Step 1: Prepare Your Repository

#### 1.1 Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in to your account
2. Click the **+** icon in the top-right corner and select **New repository**
3. Enter repository name: `pura-call-center`
4. Choose **Public** (required for free tier)
5. Click **Create repository**

#### 1.2 Push Your Code to GitHub

Open your terminal and run these commands from the project directory:

```bash
cd /home/ubuntu/pura-call-center

# Initialize git if not already done
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: PURA Call Center application"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/pura-call-center.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 2: Set Up Render.com

#### 2.1 Create Render Account

1. Visit [Render.com](https://render.com)
2. Click **Sign up** and choose GitHub authentication
3. Authorize Render to access your GitHub repositories
4. Complete the registration process

#### 2.2 Create PostgreSQL Database

1. In Render dashboard, click **New +** and select **PostgreSQL**
2. Enter database name: `pura-call-center-db`
3. Region: Choose closest to your location
4. PostgreSQL Version: Latest available
5. Pricing Plan: **Free** (auto-pauses after 7 days of inactivity)
6. Click **Create Database**
7. **Save the connection string** - you'll need it for the web service

### Step 3: Create Web Service

#### 3.1 Deploy Application

1. In Render dashboard, click **New +** and select **Web Service**
2. Connect your GitHub repository:
   - Click **Connect account** if needed
   - Select `pura-call-center` repository
   - Click **Connect**
3. Configure the service:
   - **Name**: `pura-call-center`
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `pnpm install && pnpm db:push`
   - **Start Command**: `pnpm start`
   - **Pricing Plan**: **Free**

#### 3.2 Add Environment Variables

1. Scroll down to **Environment** section
2. Click **Add Environment Variable** and add each of these:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-random-secret-key-here
VITE_APP_TITLE=PURA Call Center
VITE_APP_LOGO=https://pura.ai/wp-content/uploads/2025/06/logo.png
NODE_ENV=production
```

**Important**: Replace `DATABASE_URL` with the connection string from your PostgreSQL database.

To generate a random `JWT_SECRET`, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3.3 Deploy

1. Click **Create Web Service**
2. Render will automatically build and deploy your application
3. Wait for the build to complete (usually 3-5 minutes)
4. Your application URL will be displayed (e.g., `https://pura-call-center.onrender.com`)

### Step 4: Verify Deployment

1. Visit your application URL
2. Test the login functionality
3. Create a test call record
4. Verify data persists after refresh
5. Test the admin dashboard (login as "Chandan" or "Esmail")

### Step 5: Configure Custom Domain (Optional)

1. In Render dashboard, go to your web service settings
2. Click **Settings** → **Custom Domain**
3. Enter your domain name
4. Follow DNS configuration instructions
5. Wait for DNS propagation (usually 24 hours)

---

## Option 2: Deploy to Railway

### Step 1: Prepare Repository

Follow the same GitHub repository setup as Render.com (Steps 1.1-1.2 above).

### Step 2: Set Up Railway

#### 2.1 Create Railway Account

1. Visit [Railway.app](https://railway.app)
2. Click **Start Project** and authenticate with GitHub
3. Authorize Railway to access your repositories

#### 2.2 Create Project

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Choose `pura-call-center` repository
4. Click **Deploy**

#### 2.3 Add PostgreSQL Database

1. In your project, click **Add Service**
2. Select **PostgreSQL**
3. Railway automatically creates the database
4. Copy the connection string from the database service

#### 2.4 Configure Environment Variables

1. Click on your web service
2. Go to **Variables** tab
3. Add the following variables:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-random-secret-key
VITE_APP_TITLE=PURA Call Center
VITE_APP_LOGO=https://pura.ai/wp-content/uploads/2025/06/logo.png
NODE_ENV=production
```

#### 2.5 Configure Build and Start Commands

1. Go to **Settings** tab
2. Set **Build Command**: `pnpm install && pnpm db:push`
3. Set **Start Command**: `pnpm start`
4. Save changes

Railway will automatically deploy your application.

---

## Option 3: Deploy to Vercel (Frontend Only)

**Note**: Vercel is best for frontend-only applications. For full-stack deployment, use Render or Railway instead.

### Step 1: Prepare Repository

Follow the same GitHub repository setup as Render.com.

### Step 2: Deploy to Vercel

1. Visit [Vercel.com](https://vercel.com)
2. Click **Import Project**
3. Select **Import Git Repository**
4. Paste your GitHub repository URL
5. Click **Continue**
6. Configure project settings:
   - **Framework**: Next.js (or Node.js)
   - **Root Directory**: `./`
7. Add environment variables (same as above)
8. Click **Deploy**

---

## Post-Deployment Configuration

### 1. Database Migrations

After deployment, ensure your database schema is up to date:

```bash
# SSH into your deployed application (if available)
# Then run:
pnpm db:push
```

Most hosting platforms run this automatically during the build process.

### 2. Test Critical Features

After deployment, test these features to ensure everything works:

1. **Login**: Test with regular agent name and admin name
2. **Create Call**: Add a new patient call
3. **Duplicate Detection**: Add the same patient again and verify `numberOfTrials` increments
4. **Search**: Filter patients by name and ID
5. **Export**: Download CSV data
6. **Admin Dashboard**: Verify statistics display correctly
7. **Start New Day**: Clear patient list and verify data persists

### 3. Monitor Logs

Most platforms provide log viewing:

**Render.com**: Dashboard → Logs tab
**Railway**: Project → Logs tab
**Vercel**: Project → Deployments → Logs

Check logs regularly for errors and performance issues.

### 4. Set Up Automatic Backups

For production use, configure automated database backups:

- **Render.com**: Automatic daily backups included
- **Railway**: Manual backup option available
- **Vercel**: Requires external database backup service

---

## Troubleshooting Deployment Issues

### Build Fails with "pnpm: command not found"

**Solution**: Add this to your build command:
```
npm install -g pnpm && pnpm install && pnpm db:push
```

### Database Connection Error

**Solution**: Verify your `DATABASE_URL` environment variable:
1. Check the connection string format: `postgresql://user:password@host:port/database`
2. Ensure the database exists
3. Verify firewall rules allow connections

### Application Starts but Shows Blank Page

**Solution**:
1. Check browser console for errors (F12)
2. Check application logs for server errors
3. Verify all environment variables are set correctly
4. Clear browser cache and restart

### "Unknown column 'numberOfTrials'" Error

**Solution**: Run database migrations:
```bash
pnpm db:push
```

This error indicates the schema hasn't been updated in the database.

### High Memory Usage / Application Crashes

**Solution**:
1. Reduce the refetch interval in `CallContext.tsx` from 2000ms to 5000ms
2. Implement pagination for the patient list
3. Upgrade to a paid tier if traffic is high

---

## Performance Optimization

### 1. Database Indexing

Add indexes to frequently queried columns:

```sql
CREATE INDEX idx_patient_name ON calls(patientName);
CREATE INDEX idx_appointment_id ON calls(appointmentId);
CREATE INDEX idx_agent_name ON calls(agentName);
CREATE INDEX idx_is_active ON calls(isActive);
```

### 2. API Response Caching

Implement caching for expensive queries:

```typescript
// In your tRPC procedure
.query(async ({ ctx }) => {
  return ctx.redis.getOrSet('calls:list', async () => {
    return await getAllCalls();
  }, 60); // Cache for 60 seconds
})
```

### 3. Frontend Optimization

- Lazy load the admin dashboard
- Implement virtual scrolling for large patient lists
- Use React.memo for expensive components

---

## Monitoring & Maintenance

### Set Up Alerts

Configure alerts for:
- Application crashes
- High error rates
- Database connection failures
- High CPU/memory usage

### Regular Maintenance Tasks

**Weekly**:
- Review application logs for errors
- Check database performance metrics
- Verify backup completion

**Monthly**:
- Analyze usage patterns
- Review and optimize slow queries
- Update dependencies (with testing)

**Quarterly**:
- Full security audit
- Database optimization
- Performance tuning

---

## Rollback Procedure

If deployment causes issues:

### Render.com
1. Go to your web service
2. Click **Deployments**
3. Select the previous working deployment
4. Click **Redeploy**

### Railway
1. Go to your project
2. Click **Deployments**
3. Select the previous version
4. Click **Redeploy**

### GitHub
If you need to revert code changes:
```bash
git revert <commit-hash>
git push origin main
```

---

## Cost Estimation

### Monthly Costs (Estimated)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Render.com** | $0 (limited) | $7+/month |
| **Railway** | $5 credit | $5+/month |
| **Vercel** | $0 (frontend) | $20+/month |
| **Database** | $0 (limited) | $15+/month |

**Total for free tier**: $0-5/month
**Total for production**: $30-50/month

---

## Migration from Manus to New Platform

### Data Migration

1. **Export current data**:
   ```bash
   # Download CSV from admin panel
   # Or query database directly
   SELECT * FROM calls INTO OUTFILE 'calls.csv';
   ```

2. **Create new database** on target platform

3. **Import data** (if needed):
   ```bash
   LOAD DATA INFILE 'calls.csv' INTO TABLE calls;
   ```

### DNS/Domain Update

1. Update your domain's DNS records to point to new hosting
2. Wait for DNS propagation (24-48 hours)
3. Verify old and new sites are both accessible during transition
4. Update any bookmarks or documentation

---

## Support Resources

- **Render.com Documentation**: https://render.com/docs
- **Railway Documentation**: https://docs.railway.app
- **Vercel Documentation**: https://vercel.com/docs
- **tRPC Documentation**: https://trpc.io/docs
- **Drizzle ORM Documentation**: https://orm.drizzle.team

---

**Last Updated**: February 20, 2026
**Version**: 1.0.0
**Status**: Production Ready
