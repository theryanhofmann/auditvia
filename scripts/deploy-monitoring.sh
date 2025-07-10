#!/bin/bash

# Deploy Scheduled Monitoring Edge Function
# This script deploys the scheduled-monitoring edge function to Supabase

set -e

echo "🚀 Deploying Scheduled Monitoring Edge Function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Run database migrations first
echo "📊 Running database migrations..."
supabase db push

# Deploy the edge function
echo "⚡ Deploying scheduled-monitoring edge function..."
supabase functions deploy scheduled-monitoring --no-verify-jwt

# Get function URL
PROJECT_REF=$(supabase projects list | grep -v "│ ID" | grep -v "├" | grep -v "└" | head -1 | awk '{print $3}')
if [ -n "$PROJECT_REF" ]; then
    FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/scheduled-monitoring"
    echo "✅ Function deployed successfully!"
    echo "📍 Function URL: $FUNCTION_URL"
else
    echo "⚠️ Could not determine function URL automatically"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Test the function manually:"
echo "   curl -X POST '$FUNCTION_URL' \\"
echo "        -H 'Authorization: Bearer <your-service-role-key>' \\"
echo "        -H 'Content-Type: application/json'"
echo ""
echo "2. The cron job is automatically set up to run every 6 hours"
echo "3. Monitor the function logs in your Supabase dashboard"
echo ""
echo "✨ Deployment complete!" 