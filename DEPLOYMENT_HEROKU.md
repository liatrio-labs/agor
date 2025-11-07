# Deploying Agor to Heroku

## ⚠️ Important: Heroku Limitations

**Heroku's ephemeral filesystem means SQLite won't work!** The filesystem resets on every deploy.

### Two Deployment Options:

1. **PostgreSQL (Recommended for Heroku)** - Requires code changes to support Postgres
2. **Railway/Render Instead (Easier)** - These platforms support persistent volumes for SQLite

**This guide covers both options.**

---

## Option 1: Deploy with PostgreSQL (Requires Migration)

### Prerequisites

1. Heroku account (no free tier, starts at $7/month)
2. Heroku CLI installed
3. Code changes to support PostgreSQL (see below)

### Required Code Changes for PostgreSQL

Agor currently uses LibSQL (SQLite). To use PostgreSQL on Heroku:

**1. Update `packages/core/src/db/index.ts`:**

```typescript
// Add PostgreSQL support
import { drizzle as drizzleLibSQL } from 'drizzle-orm/libsql';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export async function createDatabaseAsync(url: string) {
  // Check if PostgreSQL
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    const client = postgres(url);
    return drizzlePostgres(client, { schema });
  }
  
  // LibSQL/SQLite
  const { createClient } = await import('@libsql/client');
  const client = createClient({ url });
  return drizzleLibSQL(client, { schema });
}
```

**2. Add PostgreSQL dependencies:**

```bash
cd packages/core
pnpm add postgres drizzle-orm
```

**3. Update `apps/agor-daemon/src/index.ts`:**

```typescript
// Use DATABASE_URL from Heroku addon
const DB_PATH = process.env.DATABASE_URL || 
                expandPath(process.env.AGOR_DB_PATH || 'file:~/.agor/agor.db');
```

**4. Run migrations for PostgreSQL:**

```bash
cd packages/core
pnpm drizzle-kit generate:pg
```

### Deploy to Heroku with PostgreSQL

```bash
# 1. Login to Heroku
heroku login

# 2. Create Heroku app
heroku create your-app-name

# 3. Add PostgreSQL addon
heroku addons:create heroku-postgresql:essential-0

# 4. Set stack to container (for Docker)
heroku stack:set container

# 5. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set ANTHROPIC_API_KEY=sk-ant-your-key
heroku config:set OPENAI_API_KEY=sk-your-key
heroku config:set CORS_ORIGIN=*

# 6. Deploy
git push heroku main

# 7. Check logs
heroku logs --tail

# 8. Open app
heroku open
```

### Verify Deployment

```bash
# Check health
curl https://your-app.herokuapp.com/health

# Check UI
open https://your-app.herokuapp.com/ui/
```

---

## Option 2: Use Railway/Render Instead (Easier)

**Recommended if you want to keep SQLite** (no code changes needed).

### Why Railway/Render are Better for Agor:

| Feature | Heroku | Railway | Render |
|---------|--------|---------|--------|
| SQLite Support | ❌ No (ephemeral) | ✅ Yes (volumes) | ✅ Yes (disks) |
| Free Tier | ❌ None | ✅ $5 credit/month | ✅ Free tier |
| Pricing | $7-$25/month | $5-$20/month | Free-$20/month |
| Setup Complexity | Medium | Easy | Easy |
| PostgreSQL Required | ✅ Yes | ❌ No | ❌ No |

### Deploy to Railway (Already Configured!)

```bash
railway login
railway init
railway up
```

See `DEPLOYMENT_RAILWAY.md` for complete Railway guide.

### Deploy to Render

See `DEPLOYMENT_RENDER.md` (if I create it) for Render deployment.

---

## Heroku Configuration Files

I've created three files for Heroku deployment:

### 1. `heroku.yml` (Docker Build Configuration)

```yaml
build:
  docker:
    web: Dockerfile
run:
  web: node apps/agor-daemon/dist/index.js
```

This tells Heroku to use Docker for deployment.

### 2. `Procfile` (Process Configuration)

```
web: cd apps/agor-daemon && node dist/index.js
```

Defines how to run the web process.

### 3. `app.json` (One-Click Deploy)

Enables "Deploy to Heroku" button and defines:
- Required addons (PostgreSQL)
- Environment variables
- App metadata

---

## Heroku-Specific Environment Variables

Heroku automatically sets:

- `PORT` - Port your app should listen on
- `DATABASE_URL` - PostgreSQL connection string (if addon added)
- `DYNO` - Dyno identifier (e.g., `web.1`)
- `HEROKU_APP_NAME` - Your app name

Your daemon already reads `PORT`:

```typescript
const DAEMON_PORT = envPort || config.daemon?.port || 3030;
```

---

## Heroku Pricing (2024)

No free tier anymore:

- **Basic:** $7/month (512MB RAM) - Too small for Agor
- **Standard 1X:** $25/month (512MB RAM) - Minimum for Agor
- **Standard 2X:** $50/month (1GB RAM) - Recommended
- **PostgreSQL:** $9-$50/month depending on plan

**Total: ~$34-100/month** (vs Railway at $20/month with persistent storage)

---

## Heroku Deployment Checklist

### Before Deploying:

- [ ] Decide: PostgreSQL migration or use Railway/Render?
- [ ] If PostgreSQL: Update database code (see above)
- [ ] If PostgreSQL: Add `postgres` and `drizzle-orm` dependencies
- [ ] If PostgreSQL: Generate PostgreSQL migrations
- [ ] Install Heroku CLI
- [ ] Have API keys ready

### After Deploying:

- [ ] Add PostgreSQL addon: `heroku addons:create heroku-postgresql`
- [ ] Set environment variables
- [ ] Deploy: `git push heroku main`
- [ ] Check health: `curl https://your-app.herokuapp.com/health`
- [ ] Create admin user
- [ ] Test authentication
- [ ] Monitor logs: `heroku logs --tail`

---

## Health Checks on Heroku

Heroku automatically monitors your app's health by:
1. Checking if the process is running
2. Checking if it responds to HTTP requests
3. Restarting if it crashes

**Heroku doesn't support custom health check paths** like Railway does.

Your `/health` endpoint will still work for manual monitoring.

---

## Troubleshooting Heroku

### "Application Error" Page

**Debug:**
```bash
heroku logs --tail
```

**Common causes:**
1. Database connection failed (PostgreSQL not configured)
2. Port binding issue (not listening on `$PORT`)
3. Out of memory (upgrade dyno size)

### Database Connection Errors

```bash
# Check DATABASE_URL is set
heroku config:get DATABASE_URL

# Should look like:
# postgres://user:pass@host:5432/dbname
```

### Slow Performance

**Cause:** Basic dyno (512MB RAM) is too small

**Fix:** Upgrade to Standard 2X (1GB RAM):
```bash
heroku ps:resize web=standard-2x
```

### Out of Memory

**Check memory usage:**
```bash
heroku logs --tail | grep "Memory"
```

**Fix:** Upgrade dyno or optimize memory usage.

---

## Migration Guide: SQLite → PostgreSQL

If you decide to migrate to PostgreSQL for Heroku:

### 1. Export SQLite Data

```bash
# Dump data from SQLite
sqlite3 ~/.agor/agor.db .dump > backup.sql
```

### 2. Convert to PostgreSQL Format

```bash
# Install sqlite3-to-postgres (if needed)
npm install -g sqlite-to-postgres

# Convert
sqlite-to-postgres backup.sql > postgres.sql
```

### 3. Import to Heroku PostgreSQL

```bash
# Get PostgreSQL credentials
heroku pg:credentials:url

# Import
heroku pg:psql < postgres.sql
```

### 4. Update Schema Migrations

```bash
cd packages/core
pnpm drizzle-kit generate:pg
pnpm drizzle-kit push:pg
```

---

## Comparison: Heroku vs Railway vs Render

| Feature | Heroku | Railway | Render |
|---------|--------|---------|--------|
| **Pricing** | $25-50/mo | $5-20/mo | Free-$20/mo |
| **Free Tier** | ❌ None | ✅ $5 credit | ✅ Yes |
| **SQLite Support** | ❌ No | ✅ Yes | ✅ Yes |
| **PostgreSQL** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Setup Difficulty** | Medium | Easy | Easy |
| **Persistent Storage** | ❌ Ephemeral | ✅ Volumes | ✅ Disks |
| **Docker Support** | ✅ Yes | ✅ Yes | ✅ Yes |
| **WebSocket Support** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Health Checks** | Basic | Custom | Custom |
| **Best For** | Established apps | New projects | Side projects |

---

## Recommendation

**For Agor, I recommend Railway or Render over Heroku because:**

1. ✅ **No code changes needed** (SQLite works with persistent volumes)
2. ✅ **Lower cost** ($5-20/month vs $34-100/month)
3. ✅ **Easier setup** (no database migration required)
4. ✅ **Better developer experience** (simpler configuration)

**Use Heroku if:**
- You already have a Heroku account with credits
- You need enterprise features (teams, compliance)
- You want to use Heroku's PostgreSQL (excellent database addon)

---

## Deploy to Heroku Button

Want to offer one-click deployment? Add this to your README:

```markdown
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/preset-io/agor)
```

This uses the `app.json` configuration file I created.

---

## Summary

**Heroku deployment requires:**

1. ✅ `heroku.yml` (created)
2. ✅ `Procfile` (created)
3. ✅ `app.json` (created)
4. ⚠️ **PostgreSQL migration** (code changes needed)
5. ⚠️ **Higher cost** ($34-100/month vs $20/month)

**Alternative recommendation:** Use Railway (already configured, no code changes, cheaper)

See `DEPLOYMENT_RAILWAY.md` for Railway deployment (ready to go!).

---

## Getting Help

**Heroku Issues:**
- Heroku Docs: https://devcenter.heroku.com
- Heroku Support: https://help.heroku.com

**PostgreSQL Migration Help:**
- Drizzle ORM Docs: https://orm.drizzle.team/docs/get-started-postgresql
- Open GitHub issue: https://github.com/preset-io/agor/issues

---

**Questions?** Ask about:
- PostgreSQL migration steps
- Railway vs Heroku comparison
- Cost optimization strategies

