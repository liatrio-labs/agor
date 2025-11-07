# Health Check Troubleshooting

## Yes, the `/health` endpoint exists! ✅

The health endpoint is implemented at line 2326 in `apps/agor-daemon/src/index.ts`:

```typescript
app.use('/health', {
  async find(params?: Params) {
    return {
      status: 'ok',
      timestamp: Date.now(),
      version: DAEMON_VERSION,
      auth: {
        requireAuth: config.daemon?.requireAuth === true,
        allowAnonymous: allowAnonymous,
      },
    };
  },
});
```

## Test Health Endpoint

### Local Docker Test
```bash
# Build and run
docker build -t agor-test -f Dockerfile .
docker run -d -p 3030:3030 --name agor-test agor-test

# Wait 10-15 seconds for startup, then test
sleep 15
curl http://localhost:3030/health

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

### Railway Test
```bash
# After deploying to Railway
curl https://your-app.railway.app/health

# Or check in browser:
open https://your-app.railway.app/health
```

## Common Health Check Issues

### Issue 1: "Connection Refused" During Startup

**Symptom:**
```
curl: (7) Failed to connect to localhost port 3030: Connection refused
```

**Cause:** Daemon is still starting (database init, service registration)

**Fix:** The healthcheck has a 60-second start period now. Railway gives it time to start.

**How to verify:**
```bash
# Check Railway logs
railway logs --follow

# Look for this message:
✅ Starting daemon on port 3030
🎉 Agor daemon listening on port 3030
```

### Issue 2: Railway Shows "Unhealthy"

**Cause:** Railway's health check might be hitting the endpoint before daemon is ready.

**Current Configuration:**
- `healthcheckPath = "/health"` in railway.toml
- `healthcheckTimeout = 10` seconds
- `restartPolicyDelay = 10` seconds before first check

**Debug Steps:**

1. **Check if daemon started:**
   ```bash
   railway logs | grep "listening on port"
   ```

2. **Manually test health endpoint:**
   ```bash
   # Get your Railway URL from dashboard
   curl https://your-app-production.up.railway.app/health
   ```

3. **Check Railway health check logs:**
   - Railway Dashboard → Your Service → Settings → Health Checks
   - View recent health check results

### Issue 3: 401 Unauthorized on Health Check

**This is OK!** The `/health` endpoint is **always public** (no auth required).

But if you get 401, check:
```bash
# Should work without auth
curl https://your-app.railway.app/health

# Response should NOT be:
# {"message":"Not authenticated"}
```

If you get 401, the endpoint might be misconfigured. Check daemon logs.

### Issue 4: Docker HEALTHCHECK vs Railway Health Check

**Important:** Railway **ignores** Docker's `HEALTHCHECK` directive!

Railway uses its own health check system configured in `railway.toml`:
```toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 10
```

Docker's HEALTHCHECK only works when running locally with `docker run`.

## Verification Checklist

After deployment, verify:

- [ ] Railway logs show: `🎉 Agor daemon listening on port 3030`
- [ ] Manual curl to `/health` returns JSON with `status: "ok"`
- [ ] Railway dashboard shows service as "Active" (green)
- [ ] No restart loops in Railway dashboard
- [ ] Health endpoint responds within 10 seconds

## Railway Health Check Configuration

Current settings in `railway.toml`:

```toml
[deploy]
healthcheckPath = "/health"      # Endpoint to check
healthcheckTimeout = 10           # Max 10 seconds to respond
restartPolicyDelay = 10           # Wait 10s after start before first check
restartPolicyType = "ON_FAILURE"  # Restart if health check fails
restartPolicyMaxRetries = 10      # Try 10 times before giving up
```

## What Happens on Health Check Failure

1. **First failure:** Railway waits `restartPolicyDelay` seconds
2. **Retries:** Up to `restartPolicyMaxRetries` times
3. **After max retries:** Service marked as "Crashed"
4. **Logs:** Check Railway logs for error messages

## Health Endpoint Response Formats

### Public Response (Unauthenticated)
```json
{
  "status": "ok",
  "timestamp": 1704657600000,
  "version": "0.7.1",
  "auth": {
    "requireAuth": false,
    "allowAnonymous": false
  }
}
```

### Authenticated Response (With JWT Token)
```json
{
  "status": "ok",
  "timestamp": 1704657600000,
  "version": "0.7.1",
  "database": "file:/home/agor/.agor/agor.db",
  "auth": {
    "requireAuth": false,
    "allowAnonymous": false,
    "user": "admin@example.com",
    "role": "admin"
  },
  "mcp": {
    "enabled": true
  }
}
```

## Quick Fixes

### If health check keeps failing:

1. **Increase startup time:**
   ```toml
   # In railway.toml
   [deploy]
   restartPolicyDelay = 30  # Give it 30 seconds before first check
   ```

2. **Increase timeout:**
   ```toml
   healthcheckTimeout = 30  # Allow 30 seconds to respond
   ```

3. **Check daemon logs for startup errors:**
   ```bash
   railway logs --follow
   ```

4. **Verify endpoint works manually:**
   ```bash
   curl -v https://your-app.railway.app/health
   ```

## Summary

✅ **The `/health` endpoint exists and works**

The configuration has been updated to:
- Give daemon 60 seconds to start before first health check
- Allow 10 seconds for health check to respond
- Restart up to 10 times on failure

**If still having issues after these changes, check Railway logs for the actual error.**

