#!/bin/bash

# Test script for verifying the /api/auth/login endpoint fix on Vercel

BASE_URL="https://ai-riview.vercel.app"
ENDPOINT="/api/auth/login"

echo "========================================="
echo "Testing Vercel Login Endpoint Fix"
echo "========================================="
echo ""

# Test 1: OPTIONS request (CORS preflight)
echo "Test 1: OPTIONS Request (CORS Preflight)"
echo "-----------------------------------------"
curl -X OPTIONS "${BASE_URL}${ENDPOINT}" \
  -H "Origin: https://ai-riview.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v 2>&1 | grep -E "(< HTTP|< Access-Control|< Allow)"
echo ""
echo ""

# Test 2: POST request with missing credentials
echo "Test 2: POST Request (Missing Credentials)"
echo "-----------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 3: POST request with invalid credentials
echo "Test 3: POST Request (Invalid Credentials)"
echo "-----------------------------------------"
curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'
echo ""
echo ""

# Test 4: Check if endpoint returns 405
echo "Test 4: Verify Not Getting 405 Error"
echo "-----------------------------------------"
STATUS=$(curl -X POST "${BASE_URL}${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -w "%{http_code}" \
  -s -o /dev/null)

if [ "$STATUS" == "405" ]; then
  echo "FAILED: Still getting 405 Method Not Allowed"
  exit 1
elif [ "$STATUS" == "400" ] || [ "$STATUS" == "401" ]; then
  echo "SUCCESS: Endpoint is working (Got expected $STATUS status)"
  echo "The 405 error is FIXED!"
  exit 0
else
  echo "Got status: $STATUS"
  echo "Endpoint may be working, verify manually"
fi

echo ""
echo "========================================="
echo "Testing Complete"
echo "========================================="
