# Railway Deployment Quick Reference

## 🚀 Deploy Now

```bash
# Option 1: Railway CLI
railway login
railway init
railway up

# Option 2: Railway Dashboard
# Visit railway.app → New Project → Deploy from GitHub
```

## ⚙️ Required Configuration

### Environment Variables (Railway Dashboard)

```bash
NODE_ENV=production
PORT=3030

# Optional API keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# CORS (if UI hosted separately)
CORS_ORIGIN=https://your-ui.vercel.app
```

### Persistent Volume (CRITICAL!)

```
Settings → Volumes → New Volume
Mount Path: /home/agor/.agor
```

## ✅ Deployment Checklist

- [ ] Environment variables set
- [ ] Persistent volume attached to `/home/agor/.agor`
- [ ] Health check passing: `curl https://your-app.railway.app/health`
- [ ] Logs show: "✅ Starting daemon on port 3030"
- [ ] UI accessible at: `https://your-app.railway.app/ui/`
- [ ] WebSocket test passes (open UI, check console)

## 🐛 Common Issues

### Build Fails

```bash
# Test locally first
docker build -t agor-test -f Dockerfile .
docker run -p 3030:3030 agor-test

# Check logs
railway logs --follow
```

### Database Resets

**Problem:** No volume attached
**Fix:** Add volume at `/home/agor/.agor` (see above)

### CORS Errors

**Problem:** UI can't connect to API
**Fix:** Set `CORS_ORIGIN` environment variable

### Out of Memory

**Problem:** Free tier 512MB limit
**Fix:** Upgrade to Pro ($20/month, 8GB RAM)

## 📊 What Gets Deployed

```
Railway Container:
├── Daemon (Node.js)
│   ├── REST API at /
│   ├── WebSocket at /
│   ├── UI static files at /ui/
│   └── Health check at /health
└── Persistent Volume
    └── /home/agor/.agor/
        ├── agor.db
        ├── config.yaml
        └── worktrees/
```

## 🔗 Quick Links

- Health: `https://your-app.railway.app/health`
- UI: `https://your-app.railway.app/ui/`
- API Docs: `https://your-app.railway.app/docs`
- Logs: Railway Dashboard → Your Service → Logs

## 💰 Pricing

- **Free:** $5 credit/month (512MB RAM)
- **Pro:** $20/month (8GB RAM, better for production)
- **Usage:** ~$0.02/hour (~$15/month if always running)

## 🆘 Still Failing?

1. Check build logs in Railway dashboard
2. Test Docker build locally (see above)
3. Join Railway Discord: https://discord.gg/railway
4. Open GitHub issue: https://github.com/preset-io/agor/issues

## 📚 Full Guide

See `DEPLOYMENT_RAILWAY.md` for detailed instructions.

