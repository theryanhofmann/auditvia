#!/bin/bash

# Test Scheduled Monitoring Edge Function
# This script tests the scheduled-monitoring edge function locally

set -e

echo "🧪 Testing Scheduled Monitoring Edge Function..."

# Check if supabase is running locally
if ! curl -s http://localhost:54321/health &> /dev/null; then
    echo "❌ Supabase is not running locally. Please start it first:"
    echo "   supabase start"
    exit 1
fi

# Get the local service role key
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY supabase/.env 2>/dev/null | cut -d'=' -f2 || echo "")
if [ -z "$SERVICE_KEY" ]; then
    echo "⚠️ Could not find SUPABASE_SERVICE_ROLE_KEY in supabase/.env"
    echo "Using default local key..."
    SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"
fi

# Function URL
FUNCTION_URL="http://localhost:54321/functions/v1/scheduled-monitoring"

echo "📍 Testing function at: $FUNCTION_URL"

# Test the function
echo "🔄 Calling scheduled monitoring function..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -d '{}')

# Extract response body and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

echo ""
echo "📊 Response Status: $HTTP_STATUS"
echo "📋 Response Body:"
echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"

if [ "$HTTP_STATUS" = "200" ]; then
    echo ""
    echo "✅ Test completed successfully!"
    
    # Parse and display summary
    if command -v jq &> /dev/null; then
        echo ""
        echo "📈 Summary:"
        echo "$HTTP_BODY" | jq -r '"Sites monitored: " + (.total_sites_monitored | tostring)'
        echo "$HTTP_BODY" | jq -r '"Successful: " + (.total_successful | tostring)'
        echo "$HTTP_BODY" | jq -r '"Failed: " + (.total_failed | tostring)'
        echo "$HTTP_BODY" | jq -r '"Execution time: " + (.execution_time_seconds | tostring) + "s"'
        
        # Show individual results if any
        RESULTS_COUNT=$(echo "$HTTP_BODY" | jq '.results | length' 2>/dev/null || echo "0")
        if [ "$RESULTS_COUNT" -gt 0 ]; then
            echo ""
            echo "🔍 Individual Results:"
            echo "$HTTP_BODY" | jq -r '.results[] | "  • " + .site_url + " (" + .site_name + "): " + (if .success then "✅ Success (Score: " + (.score | tostring) + ")" else "❌ Failed: " + .message end)'
        fi
    fi
else
    echo ""
    echo "❌ Test failed with status $HTTP_STATUS"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Check the function logs in Supabase dashboard"
echo "2. Verify monitoring logs in the database:"
echo "   SELECT * FROM monitoring_logs ORDER BY created_at DESC LIMIT 5;"
echo "3. Check summary logs:"
echo "   SELECT * FROM monitoring_summary_logs ORDER BY created_at DESC LIMIT 5;" 