#!/bin/bash

# Database Deployment Fix Script
# This script helps automate the database configuration for production deployment

echo "🔧 MyNovelCraft Database Deployment Fix"
echo "======================================"

# Check current environment
echo "📊 Current Environment Check:"
echo "NODE_ENV: ${NODE_ENV:-'not set'}"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." 

# Expected Neon database URL (holy-river)
EXPECTED_DB_PREFIX="postgresql://neondb_owner"

if [[ "$DATABASE_URL" == "$EXPECTED_DB_PREFIX"* ]]; then
    echo "✅ Database URL looks correct (Neon holy-river)"
else
    echo "⚠️  Database URL may be incorrect"
    echo "Expected to start with: $EXPECTED_DB_PREFIX"
    echo "Current starts with: ${DATABASE_URL:0:30}"
fi

echo ""
echo "📋 Manual Steps Required:"
echo "1. Go to Replit project Secrets tab (🔒)"
echo "2. Verify DATABASE_URL secret points to holy-river Neon database"
echo "3. Check Database tab - delete any auto-provisioned PostgreSQL"
echo "4. Redeploy from Replit UI"

echo ""
echo "🔍 To verify after deployment:"
echo "curl -s https://my-novel-craft-campbellinoz.replit.app/api/monitor | grep userCount"

echo ""
echo "💡 The DATABASE_URL should contain your holy-river Neon database with:"
echo "   - 'English with a little leprechaun inside' (28,135 words)"
echo "   - 'Once upon a time in Kilburn' (1,161 words)" 
echo "   - 7 existing audiobooks"
echo "   - Premium subscription for campbellinoz@gmail.com"