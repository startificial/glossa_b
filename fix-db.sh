#!/bin/bash

# DB fix script for consistent schema management
# Run before database operations to ensure schema consistency

echo "Ensuring database schema consistency..."
node scripts/ensure-db-schema.js

# Check if the schema verification was successful
if [ $? -eq 0 ]; then
  echo "Schema verification completed successfully."
  echo "You can now safely run: npm run db:push"
else
  echo "Schema verification failed. Check logs for details."
  exit 1
fi