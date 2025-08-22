#!/bin/bash

echo "🔍 Quick Production Database Verification"
echo "========================================"

echo "1. Login to production and check projects:"
echo "   https://my-novel-craft-campbellinoz.replit.app/api/auth/google"
echo ""
echo "2. Expected projects after login:"
echo "   ✅ 'English with a little leprechaun inside' (28,135 words)"
echo "   ✅ 'Once upon a time in Kilburn' (1,161 words)"
echo ""
echo "3. Wrong database shows:"
echo "   ❌ 'EL CARNICERO' (0 words)"
echo "   ❌ 'Once upon a time in Kilburn' (0 words)"
echo ""
echo "4. Check audiobook access:"
echo "   ✅ Should see existing audiobooks or generation options"
echo "   ✅ Should show premium subscription features"