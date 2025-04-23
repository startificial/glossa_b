#!/bin/bash

# Set optimized memory settings for Node.js
export NODE_OPTIONS="--max-old-space-size=3072 --optimize-for-size --gc-interval=100"

# Run the production server with optimized settings
NODE_ENV=production node dist/index.js

# Note: This script should be run instead of 'npm run start' directly 
# to ensure Node.js has proper memory settings