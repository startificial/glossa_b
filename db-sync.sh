#!/bin/bash
echo "Syncing database schema..."
npx drizzle-kit generate:pg
echo "Database schema synced successfully!"