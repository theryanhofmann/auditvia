#!/bin/bash

# Deployment script for Auditvia Scheduled Scans
# This script helps deploy the scheduled scanning functionality

set -e

echo "🚀 Deploying Auditvia Scheduled Scans"
echo "======================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ No Supabase project found"
    echo "Run 'supabase init' first or make sure you're in the project root"
    exit 1
fi

echo "✅ Supabase project detected"

# Step 1: Run database migrations
echo ""
echo "📊 Running database migrations..."
echo "================================="

if [ -f "supabase/migrations/0003_add_custom_domain.sql" ]; then
    echo "• Found custom domain migration (0003)"
else
    echo "⚠️  Custom domain migration not found - this may cause issues"
fi

if [ -f "supabase/migrations/0004_add_scheduled_scan_logs.sql" ]; then
    echo "• Found scheduled scan logs migration (0004)"
else
    echo "❌ Scheduled scan logs migration not found"
    echo "Expected: supabase/migrations/0004_add_scheduled_scan_logs.sql"
    exit 1
fi

echo ""
echo "Running migrations..."
supabase db reset --debug

echo "✅ Migrations completed"

# Step 2: Deploy Edge Function
echo ""
echo "⚡ Deploying Edge Function..."
echo "============================"

if [ ! -f "supabase/functions/runScheduledScans/index.ts" ]; then
    echo "❌ Edge function not found"
    echo "Expected: supabase/functions/runScheduledScans/index.ts"
    exit 1
fi

echo "• Deploying runScheduledScans function..."
supabase functions deploy runScheduledScans

echo "✅ Edge function deployed"

# Step 3: Set up cron schedule (if supported)
echo ""
echo "⏰ Setting up cron schedule..."
echo "============================="

# Note: Cron scheduling might not be available in all Supabase tiers
echo "• Attempting to set up cron schedule..."
echo "• Schedule: Every 12 hours (6 AM and 6 PM UTC)"

# Try to deploy with schedule - this might fail on some tiers
if supabase functions deploy runScheduledScans --schedule="0 6,18 * * *" 2>/dev/null; then
    echo "✅ Cron schedule configured successfully"
else
    echo "⚠️  Cron schedule configuration failed (may not be available in your tier)"
    echo "   You can manually trigger the function or upgrade your Supabase plan"
fi

# Step 4: Test the deployment
echo ""
echo "🧪 Testing deployment..."
echo "======================="

echo "• Running test script in simulation mode..."

if npm run test:scheduled-scans; then
    echo "✅ Test completed successfully"
else
    echo "❌ Test failed - check the error above"
    echo "   Common issues:"
    echo "   - Missing environment variables (.env.local)"
    echo "   - Database not properly migrated"
    echo "   - Edge function deployment issues"
    exit 1
fi

# Step 5: Final instructions
echo ""
echo "🎉 Deployment completed successfully!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. Enable monitoring for sites in your dashboard"
echo "2. Check function logs in Supabase Dashboard > Edge Functions"
echo "3. Monitor scheduled_scan_logs table for execution history"
echo ""
echo "Manual testing:"
echo "• Simulation: npm run test:scheduled-scans"
echo "• Real scans:  npm run test:scheduled-scans -- --run-scans"
echo ""
echo "Manual trigger:"
echo "curl -X POST \"https://your-project.supabase.co/functions/v1/runScheduledScans\" \\"
echo "  -H \"Authorization: Bearer YOUR_SERVICE_ROLE_KEY\""
echo ""
echo "Documentation: supabase/functions/README.md" 