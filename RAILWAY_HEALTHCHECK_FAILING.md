# 🚨 Railway Health Check Failing - Debug Guide

## Quick Diagnosis

Run this debug script first:

```bash
./debug-railway-health.sh
```

This will check:
- ✅ Railway service status
- ✅ Recent logs
- ✅ Whether daemon started
- ✅ Health endpoint accessibility

---

## Step-by-Step Debugging

### Step 1: Check Railway Logs

```bash
railway logs --follow
```

**Look for these key messages:**

✅ **Good signs (daemon started successfully):**
```
🚀 Starting Agor production server...
✅ Handlebars helpers registered
✅ Starting daemon on port 3030
🎉 Agor daemon listening on port 3030
📂 Serving UI from: /app/apps/agor-daemon/ui
```

❌ **Bad signs (errors):**
```
Error: Cannot find module '@agor/core'
ENOENT: no such file or directory
Error connecting to database
npm ERR! missing script: start
```

---

### Step 2: Common Issues & Fixes

#### Issue #1: "Cannot find module '@agor/core'"

**Symptom in logs:**
```
Error: Cannot find module '@agor/core/db'
```

**Cause:** Build didn't copy dependencies correctly

**Fix:** The `--ignore-scripts` flag in Dockerfile should have fixed this. Verify the Dockerfile line 86:
```dockerfile
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
```

**Rebuild and redeploy:**
```bash
git add Dockerfile
git commit -m "Fix: Add --ignore-scripts to pnpm install"
git push origin main
railway up
```

---

#### Issue #2: "Daemon not listening on correct port"

**Symptom in logs:**
```
✅ Starting daemon on port 3030
(but Railway expects different port)
```

**Cause:** Railway sets `PORT` environment variable, daemon might not be reading it

**Fix:** Check that daemon reads `PORT` env var (it should, line 201 in daemon/src/index.ts)

**Verify in Railway dashboard:**
```bash
railway variables
# Should show: PORT=XXXX (Railway auto-sets this)
```

---

#### Issue #3: "Database initialization taking too long"

**Symptom in logs:**
```
📦 Initializing database...
(then nothing for 30+ seconds)
```

**Cause:** First-time database creation is slow without persistent volume

**Fix:** Add persistent volume in Railway dashboard:

1. Go to Railway Dashboard
2. Click your service
3. Go to **Settings** → **Volumes**
4. Click **New Volume**
5. Set mount path: `/home/agor/.agor`
6. Save and redeploy

---

#### Issue #4: "Build succeeded but deployment fails"

**Symptom:** Build completes, but service shows "Crashed"

**Debug steps:**

```bash
# 1. Check Railway dashboard deployment logs
railway logs --deployment

# 2. Check if Docker healthcheck works locally
docker build -t agor-test -f Dockerfile .
docker run -d -p 3030:3030 --name agor-test agor-test
sleep 20
curl http://localhost:3030/health

# 3. If local works, check Railway environment
railway run bash
# Inside Railway container:
node apps/agor-daemon/dist/index.js
```

---

#### Issue #5: "Health endpoint returns 500 Internal Server Error"

**Symptom:**
```bash
curl https://your-app.railway.app/health
# Returns: {"error":"Internal Server Error"}
```

**Cause:** Daemon started but has runtime errors

**Debug:**
```bash
railway logs --follow
# Look for stack traces after "listening on port"
```

**Common runtime errors:**
- Missing environment variables
- Database connection failed
- File permissions issue

---

### Step 3: Manual Health Check Test

Test the health endpoint directly:

```bash
# Get your Railway URL
railway status

# Test health endpoint (should return JSON)
curl https://your-app-XXXXX.up.railway.app/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": 1704657600000,
#   "version": "0.7.1",
#   "auth": {
#     "requireAuth": false,
#     "allowAnonymous": false
#   }
# }
```

If you get HTML instead of JSON, the daemon isn't running.

---

### Step 4: Check Railway Configuration

Verify your `railway.toml` settings:

```bash
cat railway.toml
```

**Should contain:**
```toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 10
restartPolicyDelay = 10
```

**If it's different, update it:**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = ""
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
healthcheckPath = "/health"
healthcheckTimeout = 10
restartPolicyDelay = 10

[env]
NODE_ENV = "production"
```

Then redeploy:
```bash
git add railway.toml
git commit -m "Fix: Update Railway health check config"
git push origin main
railway up
```

---

### Step 5: Increase Health Check Timeout

If daemon is starting slowly, increase the timeout:

**Option A: In `railway.toml`:**
```toml
[deploy]
healthcheckTimeout = 30  # Increased from 10 to 30 seconds
restartPolicyDelay = 30  # Wait 30s before first check
```

**Option B: In Railway Dashboard:**
1. Settings → Health Checks
2. Increase timeout to 30 seconds
3. Increase delay to 30 seconds

---

### Step 6: Check Environment Variables

Verify required environment variables are set:

```bash
railway variables

# Should see:
# NODE_ENV=production
# PORT=XXXX (auto-set by Railway)
# RAILWAY_ENVIRONMENT=production (auto-set)
```

**Add missing variables:**
```bash
railway variables set NODE_ENV=production
railway variables set ANTHROPIC_API_KEY=sk-ant-your-key
```

---

### Step 7: Restart Service

Sometimes a simple restart fixes it:

```bash
# Via CLI
railway restart

# Or via dashboard:
# Railway Dashboard → Your Service → Restart
```

---

## Advanced Debugging

### Access Railway Container Shell

```bash
railway run bash
```

Inside the container, check:

```bash
# 1. Check if files are there
ls -la /app/apps/agor-daemon/dist/

# 2. Check if node_modules are there
ls -la /app/node_modules/@agor/

# 3. Try starting manually
cd /app/apps/agor-daemon
PORT=3030 node dist/index.js

# 4. Check if health endpoint works
curl http://localhost:3030/health
```

---

## Railway-Specific Fixes

### Fix #1: Railway Ignoring Dockerfile

**Symptom:** Railway not using your Dockerfile

**Cause:** Railway defaulting to Nixpacks instead of Docker

**Fix:** Set buildpack in `railway.toml`:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

### Fix #2: Railway Build Timeout

**Symptom:** Build times out after 10 minutes

**Cause:** pnpm install taking too long (downloading packages)

**Fix:** Use Railway's build cache:
```bash
# Nothing needed - Railway automatically caches Docker layers
# But you can optimize by combining RUN commands
```

### Fix #3: Railway Out of Memory

**Symptom:** Build succeeds but deployment crashes with OOM

**Fix:** Upgrade Railway plan:
- Free tier: 512MB (might be too small)
- Hobby: 1GB
- Pro: 8GB (recommended)

```bash
# Check memory usage
railway logs | grep -i "memory"
```

---

## Verification Checklist

After making fixes, verify:

- [ ] `railway logs` shows "listening on port 3030"
- [ ] `railway logs` shows "Serving UI from: ..."
- [ ] No error messages in logs
- [ ] `curl https://your-app.railway.app/health` returns JSON
- [ ] Railway dashboard shows service as "Active" (green)
- [ ] No restart loops (check deployment history)
- [ ] Volume is attached (if using SQLite)

---

## Still Failing?

### Get Detailed Logs

```bash
# Full logs with timestamps
railway logs --json > railway-logs.json

# Search for specific errors
railway logs | grep -i error
railway logs | grep -i failed
railway logs | grep -i timeout
```

### Check Railway Status Page

https://railway.statuspage.io/

Sometimes Railway has platform-wide issues.

### Contact Railway Support

If nothing works:

1. Railway Discord: https://discord.gg/railway
2. Tweet @Railway: https://twitter.com/Railway
3. Email: team@railway.app

**Include in your support request:**
- Railway project ID
- Deployment logs
- Screenshot of error
- Steps you've already tried

---

## Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Build fails | Check `Dockerfile` line 86 has `--ignore-scripts` |
| Daemon won't start | Check logs for error messages |
| Health check timeout | Increase `healthcheckTimeout` to 30s |
| Wrong port | Verify `PORT` env var is set |
| No volume | Add volume at `/home/agor/.agor` |
| Out of memory | Upgrade to Pro plan (8GB RAM) |
| Module not found | Rebuild with fixed Dockerfile |

---

## Test Locally First

Before debugging Railway, test Docker build locally:

```bash
# Build
docker build -t agor-test -f Dockerfile .

# Run
docker run -d -p 3030:3030 --name agor-test agor-test

# Wait for startup
sleep 20

# Test health
curl http://localhost:3030/health

# Check logs
docker logs agor-test

# Clean up
docker stop agor-test && docker rm agor-test
```

If it works locally but not on Railway, it's a Railway configuration issue.

---

## Most Common Solution

**90% of health check failures are due to:**

1. **Daemon not starting** (check logs for errors)
2. **Missing persistent volume** (add at `/home/agor/.agor`)
3. **Health check too aggressive** (increase timeout to 30s)

Try these three fixes first before diving deeper!

---

**Run the debug script for instant diagnosis:**
```bash
./debug-railway-health.sh
```

Then share the output if you need more help!

