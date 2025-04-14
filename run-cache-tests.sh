#!/bin/bash

# Run the string utils tests first to verify our test environment works
echo "Running string utils tests..."
NODE_OPTIONS=--experimental-vm-modules npx jest server/utils/string-utils.test.ts --testEnvironment=node

# Then run the cache service tests
echo "Running cache service tests..."
NODE_OPTIONS=--experimental-vm-modules npx jest server/services/cache-service.test.ts --testEnvironment=node