#!/bin/bash
# Railway Health Check Debugging Script
# Run this to diagnose why health checks are failing

set -e

echo "🔍 Railway Health Check Debugging"
echo "=================================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install it:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Get Railway status
echo "📊 Railway Service Status:"
echo "-------------------------"
railway status
echo ""

# Get Railway logs (last 100 lines)
echo "📋 Recent Railway Logs:"
echo "----------------------"
railway logs --tail 100
echo ""

# Check if daemon started
echo "🔍 Checking if daemon started successfully..."
echo "--------------------------------------------"
if railway logs | grep -q "listening on port"; then
    echo "✅ Daemon appears to have started"
    PORT=$(railway logs | grep "listening on port" | tail -1 | sed -n 's/.*port \([0-9]*\).*/\1/p')
    echo "   Port: $PORT"
else
    echo "❌ No 'listening on port' message found in logs"
    echo "   This means daemon failed to start"
fi
echo ""

# Get Railway URL
echo "🌐 Getting Railway URL..."
RAILWAY_URL=$(railway status | grep "URL" | awk '{print $2}')

if [ -z "$RAILWAY_URL" ]; then
    echo "⚠️  Could not determine Railway URL"
    echo "   Check Railway dashboard for your app URL"
else
    echo "✅ Railway URL: $RAILWAY_URL"
    echo ""
    
    # Test health endpoint manually
    echo "🏥 Testing Health Endpoint:"
    echo "--------------------------"
    echo "Attempting: curl $RAILWAY_URL/health"
    echo ""
    
    if curl -f -v "$RAILWAY_URL/health" 2>&1 | head -20; then
        echo ""
        echo "✅ Health endpoint is accessible!"
    else
        echo ""
        echo "❌ Health endpoint failed"
        echo ""
        echo "Possible causes:"
        echo "1. Daemon not started yet (check logs above)"
        echo "2. Port mismatch (daemon not listening on Railway's PORT)"
        echo "3. Startup taking too long (Railway timeout)"
        echo "4. Database initialization failing"
    fi
fi

echo ""
echo "=================================="
echo "Next Steps:"
echo "=================================="
echo ""
echo "1. Check Railway Dashboard:"
echo "   https://railway.app/dashboard"
echo ""
echo "2. View full logs:"
echo "   railway logs --follow"
echo ""
echo "3. Check environment variables:"
echo "   railway variables"
echo ""
echo "4. Restart service:"
echo "   railway restart"
echo ""
echo "5. Check if volume is attached:"
echo "   Go to Railway Dashboard → Your Service → Settings → Volumes"
echo ""

