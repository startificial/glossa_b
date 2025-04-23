#!/bin/bash

# Set optimized memory settings for Node.js
export NODE_OPTIONS="--max-old-space-size=3072 --optimize-for-size --gc-interval=100"

# Run the development server with optimized settings
npm run dev

# Note: This script should be run instead of 'npm run dev' directly
# to ensure Node.js has proper memory settings