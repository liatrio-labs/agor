# Deploying Agor to Railway

This guide covers deploying the Agor daemon + UI to Railway using the production Docker container.

## Prerequisites

1. Railway account (free tier works, Pro recommended for production)
2. GitHub repository connected to Railway
3. API keys for AI services (optional but recommended):
   - Anthropic API key (Claude)
   - OpenAI API key (Codex)
   - Google Gemini API key

## Quick Start

### 1. Install Railway CLI (optional, but recommended)

```bash
npm install -g @railway/cli
railway login
```

### 2. Deploy from Dashboard

**Option A: Via Railway Dashboard (Easiest)**

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `agor` repository
4. Railway will auto-detect the `Dockerfile` and deploy

**Option B: Via Railway CLI**

```bash
# From repo root
railway init
railway up
```

### 3. Configure Environment Variables

In Railway dashboard, add these variables:

**Required:**
```bash
NODE_ENV=production
# PORT is auto-set by Railway, no need to configure
```

**Security Note:** 
- Railway automatically sets `RAILWAY_ENVIRONMENT` which triggers secure mode
- Anonymous authentication is **automatically disabled** on Railway
- Daemon will refuse to start if someone tries to enable anonymous auth

**Optional (but recommended for functionality):**
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here  
GEMINI_API_KEY=your-gemini-key-here

# CORS configuration (if hosting UI separately)
CORS_ORIGIN=https://your-ui-domain.railway.app

# Or allow all origins (less secure)
# CORS_ORIGIN=*
```

### 4. Add Persistent Volume (Critical!)

Agor needs persistent storage for the SQLite database:

1. In Railway dashboard → Your service → **Settings**
2. Scroll to **Volumes**
3. Click **New Volume**
4. Configure:
   ```
   Mount Path: /home/agor/.agor
   ```
5. Railway will restart your service automatically

**⚠️ Without a volume, your database will be lost on each deploy!**

### 5. Configure Networking

1. Railway will auto-generate a public URL like `https://agor-production.up.railway.app`
2. Optionally add a custom domain in **Settings → Domains**

### 6. Verify Deployment

Check health endpoint:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-07T12:34:56.789Z",
  "version": "0.7.1",
  "uptime": 123.456
}
```

---

## Architecture on Railway

### What Gets Deployed

```
┌─────────────────────────────────────────┐
│  Railway Container                       │
│  ┌─────────────────────────────────────┐│
│  │  Agor Daemon (Node.js)              ││
│  │  - FeathersJS API (REST + WebSocket)││
│  │  - Serves UI at /ui/ (static files) ││
│  │  - MCP endpoint at /mcp             ││
│  │  - Health check at /health          ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────────────────────────────────┐│
│  │  Persistent Volume                  ││
│  │  /home/agor/.agor/                  ││
│  │  - agor.db (SQLite)                 ││
│  │  - config.yaml                       ││
│  │  - worktrees/ (git repositories)    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Port Configuration

- Railway sets `$PORT` environment variable automatically
- Daemon binds to `$PORT` (defaults to 3030 if not set)
- UI is served at `https://your-app.railway.app/ui/`
- API available at `https://your-app.railway.app/` (REST + WebSocket)

---

## Troubleshooting

### Build Fails: "Cannot find package"

**Problem:** pnpm workspace dependencies not resolving

**Solution:** The new `Dockerfile` copies all workspace packages. If issues persist:

```bash
# Locally test the Docker build
docker build -t agor-test -f Dockerfile .
docker run -p 3030:3030 agor-test
```

### Database Resets on Deploy

**Problem:** No persistent volume configured

**Solution:** Add a volume (see step 4 above)

### CORS Errors from UI

**Problem:** UI hosted on different domain than daemon

**Solution:** Set `CORS_ORIGIN` environment variable in Railway:

```bash
# Single origin
CORS_ORIGIN=https://your-ui.railway.app

# Multiple origins (comma-separated)
CORS_ORIGIN=https://ui1.railway.app,https://ui2.railway.app

# All origins (not recommended for production)
CORS_ORIGIN=*
```

### Out of Memory (OOM) Errors

**Problem:** Railway free tier has 512MB RAM limit

**Solution:**
- Upgrade to Pro plan (8GB RAM)
- Or optimize build by using `--max-old-space-size`:

Add to `Dockerfile` builder stage:
```dockerfile
ENV NODE_OPTIONS="--max-old-space-size=512"
```

### Health Check Failing

**Problem:** Daemon not responding on `/health`

**Debug steps:**
1. Check Railway logs: Dashboard → Service → Logs
2. Verify port binding:
   ```bash
   railway logs
   # Look for: "✅ Starting daemon on port 3030"
   ```
3. Test locally:
   ```bash
   docker build -t agor-test .
   docker run -p 3030:3030 -e PORT=3030 agor-test
   curl http://localhost:3030/health
   ```

### Git Operations Fail

**Problem:** GitHub authentication not configured

**Solution:** Add deploy key or use GitHub CLI auth:

1. Generate SSH key in Railway container (via Railway CLI):
   ```bash
   railway run bash
   ssh-keygen -t ed25519 -C "railway-agor"
   cat ~/.ssh/id_ed25519.pub
   ```

2. Add public key to GitHub: Settings → SSH keys → New SSH key

3. Or use GitHub CLI with token:
   ```bash
   # Add as Railway environment variable
   GH_TOKEN=ghp_your_token_here
   ```

---

## Production Checklist

- [ ] Persistent volume configured at `/home/agor/.agor`
- [ ] API keys set in Railway environment variables
- [ ] CORS configured for UI domain
- [ ] Custom domain configured (optional)
- [ ] Health check passing
- [ ] Logs show no errors
- [ ] Database persists across deploys
- [ ] Git authentication working (for repo management)
- [ ] WebSocket connections working (test in UI)

---

## Advanced: Multi-Container Deployment

For high-traffic deployments, separate daemon and UI:

### Service 1: Agor Daemon (API + WebSocket)

```dockerfile
# Use production Dockerfile as-is
# Don't serve UI static files
```

Environment:
```bash
NODE_ENV=production
SERVE_UI=false  # Custom flag (requires code change)
```

### Service 2: Agor UI (Static + Vercel)

Deploy UI to Vercel (faster CDN):

```bash
cd apps/agor-ui
vercel --prod
```

Environment variables in Vercel:
```bash
VITE_DAEMON_URL=https://agor-api.railway.app
```

Update CORS on daemon:
```bash
CORS_ORIGIN=https://agor-ui.vercel.app
```

---

## Cost Estimates

**Railway Free Tier:**
- $5 credit/month
- 512MB RAM, 1 vCPU
- 500 hours/month
- Good for: Testing, personal use

**Railway Pro ($20/month):**
- $20 credit/month (~500 hours)
- 8GB RAM, 8 vCPU
- 500 GB bandwidth
- Good for: Team use, production

**Pro Tip:** Railway charges per hour used. Stop services when not in use to save credits:

```bash
# Via CLI
railway down

# Via dashboard
Settings → Sleep service when inactive
```

---

## Monitoring

Railway provides built-in monitoring:

1. **Logs:** Real-time logs in dashboard
2. **Metrics:** CPU, memory, network usage
3. **Deployments:** Track deploy history
4. **Alerts:** Set up alerts for downtime (Pro plan)

Add custom monitoring with health check:
```bash
# External monitoring (UptimeRobot, Pingdom, etc.)
GET https://your-app.railway.app/health
```

---

## Rollback

If a deploy breaks:

1. **Via Dashboard:**
   - Deployments tab → Click previous successful deploy → Redeploy

2. **Via CLI:**
   ```bash
   railway status
   railway rollback
   ```

---

## Getting Help

**Railway Issues:**
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app

**Agor Issues:**
- GitHub Issues: https://github.com/preset-io/agor/issues
- Discord: [Your discord link]

---

## Next Steps

After deploying:

1. Access UI at `https://your-app.railway.app/ui/`
2. Create admin user via API or CLI
3. Configure MCP servers in UI
4. Start creating sessions and worktrees!

---

## Alternative Deployment Options

If Railway doesn't work for you, try:

- **Render.com** - Similar to Railway, better for long-running services
- **Fly.io** - Global distribution, persistent volumes
- **Digital Ocean App Platform** - Simple, predictable pricing
- **AWS ECS/Fargate** - Enterprise scale (more complex)
- **Your own VPS** - Full control, requires more setup

See `docs/deployment/` for platform-specific guides.

