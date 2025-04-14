#!/bin/bash
set -e

echo "Running basic tests with ES modules..."
NODE_OPTIONS=--experimental-vm-modules npx jest sum.test.js

# Uncomment to run all tests when ready
# echo "Running all TypeScript tests..."
# NODE_OPTIONS=--experimental-vm-modules npx jest