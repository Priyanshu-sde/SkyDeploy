#!/bin/bash

echo "=== SkyDeploy Service Diagnostics ==="
echo ""

echo "1. Checking if upload-service is running on port 3001..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Upload service is responding on localhost:3001"
    curl -s http://localhost:3001/health | jq .
else
    echo "❌ Upload service is NOT responding on localhost:3001"
fi

echo ""
echo "2. Checking if request-handler is running on port 3002..."
if curl -s http://localhost:3002 > /dev/null; then
    echo "✅ Request handler is responding on localhost:3002"
else
    echo "❌ Request handler is NOT responding on localhost:3002"
fi

echo ""
echo "3. Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running and responding"
else
    echo "❌ Redis is NOT responding"
fi

echo ""
echo "4. Checking environment variables..."
echo "ACCESS_KEY_ID: ${ACCESS_KEY_ID:+SET}"
echo "SECRET_ACCESS_KEY: ${SECRET_ACCESS_KEY:+SET}"
echo "ENDPOINT: ${ENDPOINT:+SET}"
echo "GITHUB_TOKEN: ${GITHUB_TOKEN:+SET}"

echo ""
echo "5. Checking PM2 processes..."
pm2 list

echo ""
echo "6. Testing nginx proxy..."
curl -s https://api-skydeploy.priyanshu.online/health || echo "❌ Nginx proxy test failed"

echo ""
echo "=== Diagnostics Complete ===" 