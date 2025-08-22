#!/bin/bash

# Production Database Verification Script
# Checks if production is using the correct database

echo "🔍 Production Database Check"
echo "============================"

PROD_URL="https://my-novel-craft-campbellinoz.replit.app"

echo "📊 Checking production health..."
HEALTH=$(curl -s "$PROD_URL/api/health" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "✅ Production server is responding"
    echo "$HEALTH" | grep -o '"status":"[^"]*"' || echo "Health check response received"
else
    echo "❌ Production server not responding"
    exit 1
fi

echo ""
echo "👥 Checking user count..."
USER_COUNT=$(curl -s "$PROD_URL/api/monitor" 2>/dev/null | grep -o '"userCount":[^,}]*')
if [ -n "$USER_COUNT" ]; then
    echo "Production database $USER_COUNT"
    
    # Expected: userCount should be "1" (campbellinoz only)
    if [[ "$USER_COUNT" == *":1"* ]]; then
        echo "✅ User count matches expected (holy-river database)"
    else
        echo "⚠️  User count unexpected - may be wrong database"
        echo "    Current: $USER_COUNT, Expected: userCount:1"
    fi
else
    echo "⚠️  Could not get user count from production"
fi

echo ""
echo "🔐 Testing authentication endpoint..."
AUTH_RESPONSE=$(curl -s "$PROD_URL/api/auth/user" 2>/dev/null)
if [[ "$AUTH_RESPONSE" == *"Unauthorized"* ]]; then
    echo "✅ Auth endpoint responding correctly (not logged in)"
else
    echo "⚠️  Unexpected auth response: $AUTH_RESPONSE"
fi

echo ""
echo "💾 Expected production data:"
echo "   - User: campbellinoz@gmail.com (premium subscription)"
echo "   - Project: 'English with a little leprechaun inside' (28,135 words)"
echo "   - Project: 'Once upon a time in Kilburn' (1,161 words)"
echo "   - 7 audiobooks in database"
echo ""
echo "If production shows different projects (EL CARNICERO, empty projects),"
echo "then it's connecting to the wrong database."