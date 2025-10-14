#!/bin/bash
# Run Analytics Tables Migration
# This script creates all the analytics tracking tables

echo "📊 Running Analytics Migration..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable not set"
    echo "Please run: export DATABASE_URL='your-database-url'"
    exit 1
fi

# Get the migration file path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/../migrations/007_analytics_tables.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ ERROR: Migration file not found at: $MIGRATION_FILE"
    exit 1
fi

echo "✅ Found migration file"
echo "📁 Path: $MIGRATION_FILE"
echo ""

# Run the migration using psql
echo "🔄 Executing migration..."

if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo ""
    echo "✅ Analytics migration completed successfully!"
    echo ""
    echo "📋 Created tables:"
    echo "  • ai_usage_logs"
    echo "  • api_request_logs"
    echo "  • user_activity_logs"
    echo "  • document_analytics"
    echo "  • system_metrics"
    echo "  • job_execution_logs"
    echo "  • daily_statistics"
    echo ""
    echo "📊 Materialized views:"
    echo "  • mv_provider_performance"
    echo "  • mv_model_performance"
    echo ""
    echo "🎉 Analytics tracking is now ready!"
    echo "   Restart your backend to start collecting data."
else
    echo ""
    echo "❌ Migration failed"
    exit 1
fi

