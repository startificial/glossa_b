#!/bin/bash
set -e

echo "Running basic JS tests with ES modules..."
NODE_OPTIONS=--experimental-vm-modules npx jest sum.test.js

echo "Running TypeScript utility tests..."
NODE_OPTIONS=--experimental-vm-modules npx jest server/utils/string-utils.test.ts --testEnvironment=node

# Uncomment to run additional TypeScript tests when ready
# echo "Running repository tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest server/repositories/base-repository.test.ts --testEnvironment=node

# echo "Running controller tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest server/controllers/base-controller.test.ts --testEnvironment=node

# echo "Running service tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest server/services/base-service.test.ts --testEnvironment=node

# echo "Running cache service tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest server/services/cache-service.test.ts --testEnvironment=node

# echo "Running logger tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest server/utils/logger.test.ts --testEnvironment=node

# echo "Running all TypeScript tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest --config=ts-jest.config.cjs "\.ts$" --testEnvironment=node