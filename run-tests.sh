#!/bin/bash
set -e

echo "Running basic JS tests with ES modules..."
NODE_OPTIONS=--experimental-vm-modules npx jest sum.test.js

echo "Running TypeScript utility tests..."
NODE_OPTIONS=--experimental-vm-modules npx jest server/utils/string-utils.test.ts --config=ts-jest.config.cjs --testEnvironment=node

# Uncomment to run all TypeScript tests when ready
# echo "Running all TypeScript tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest --config=ts-jest.config.cjs "\.ts$"