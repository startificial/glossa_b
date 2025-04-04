#!/bin/bash

# Reset Database Script
# This script serves as a wrapper to run the database reset functionality

echo "🗑️  Database Reset Tool 🗑️"
echo "--------------------------------------"
echo "This will clear all application data while preserving the demo user account."
echo "Are you sure you want to continue? (y/n)"
read -r confirmation

if [[ $confirmation =~ ^[Yy]$ ]]; then
  echo "--------------------------------------"
  echo "🔄 Running database reset script..."
  node --experimental-specifier-resolution=node reset-database.js
  echo "--------------------------------------"
  echo "✅ Reset complete! You can now restart your application."
else
  echo "❌ Reset cancelled."
  exit 0
fi