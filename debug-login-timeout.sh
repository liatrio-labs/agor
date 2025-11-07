#!/bin/bash
# Debug login timeout issues

echo "🔍 Debugging Login Timeout Issues"
echo "=================================="
echo ""

# Get Railway URL
echo "Getting Railway URL..."
RAILWAY_URL=$(railway status 2>/dev/null | grep "URL" | awk '{print $2}')

if [ -z "$RAILWAY_URL" ]; then
    echo "⚠️  Could not get Railway URL from CLI"
    echo "   Please provide it manually"
    read -p "Enter your Railway URL (e.g., https://your-app.railway.app): " RAILWAY_URL
fi

echo "Railway URL: $RAILWAY_URL"
echo ""

# Test health endpoint first
echo "1️⃣ Testing health endpoint..."
echo "-----------------------------"
if curl -f -s -w "\nResponse time: %{time_total}s\n" "$RAILWAY_URL/health"; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint failed - daemon may not be running"
    exit 1
fi
echo ""

# Test authentication endpoint
echo "2️⃣ Testing authentication endpoint..."
echo "--------------------------------------"
echo "Attempting login with timing..."

# Use default admin credentials
START_TIME=$(date +%s)
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}\nTIME:%{time_total}" \
  -X POST "$RAILWAY_URL/authentication" \
  -H "Content-Type: application/json" \
  -d '{"strategy":"local","username":"admin@agor.live","password":"admin"}')
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
TIME_TAKEN=$(echo "$RESPONSE" | grep "TIME:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d' | sed '/TIME:/d')

echo "HTTP Status: $HTTP_CODE"
echo "Time taken: ${TIME_TAKEN}s"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Authentication successful!"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ Authentication failed - wrong credentials"
    echo "   Make sure you created the admin user"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "❌ Connection failed - timeout or no response"
    echo "   This is likely the issue!"
else
    echo "⚠️  Unexpected status code: $HTTP_CODE"
fi
echo ""

# Check Railway logs for errors
echo "3️⃣ Checking Railway logs for errors..."
echo "---------------------------------------"
railway logs --tail 20 | grep -i "error\|timeout\|failed" || echo "No obvious errors in recent logs"
echo ""

# Memory check
echo "4️⃣ Checking for memory issues..."
echo "---------------------------------"
if railway logs | grep -i "out of memory\|oom\|heap"; then
    echo "❌ Memory issues detected!"
    echo "   Your dyno may be out of memory"
    echo "   Recommendation: Upgrade Railway plan to get more RAM"
else
    echo "✅ No memory issues detected"
fi
echo ""

# Summary
echo "=================================="
echo "Summary & Next Steps"
echo "=================================="
echo ""

if [ "$HTTP_CODE" = "000" ] || [ -z "$HTTP_CODE" ]; then
    echo "Issue: Authentication endpoint is timing out"
    echo ""
    echo "Likely causes:"
    echo "1. Database is slow or locked"
    echo "2. Out of memory"
    echo "3. Password hashing is timing out"
    echo ""
    echo "Try these fixes:"
    echo "1. Restart Railway service:"
    echo "   railway restart"
    echo ""
    echo "2. Check Railway memory usage in dashboard"
    echo "3. Upgrade to a plan with more RAM if needed"
    echo ""
    echo "4. Check for database locks:"
    echo "   railway run bash"
    echo "   ls -lh /home/agor/.agor/agor.db"
fi

