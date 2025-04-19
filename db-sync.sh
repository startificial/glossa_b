#!/bin/bash

# Database Schema Synchronization Command
# This script runs the database schema synchronization 
# and provides a nice user interface

# Display header
echo "============================================="
echo "  Database Schema Synchronization Utility   "
echo "============================================="
echo ""

# Run the synchronization script
echo "⏳ Running database schema synchronization..."
node scripts/sync-database-schema.js

# Check if successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS: Database schema has been synchronized!"
  echo ""
  echo "The following tables have been created and verified:"
  echo "  - users"
  echo "  - customers"
  echo "  - projects (with type and customer_id columns)"
  echo "  - activities (with type and description columns)"
  echo "  - input_data"
  echo "  - requirements"
  echo "  - implementation_tasks"
  echo ""
  echo "You can now safely run the application and use database features."
  echo ""
else
  echo ""
  echo "❌ ERROR: Schema synchronization failed."
  echo "Please check the error messages above and fix any issues."
  echo ""
  exit 1
fi