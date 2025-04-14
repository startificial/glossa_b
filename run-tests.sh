#!/bin/bash
set -e

echo "Running basic tests with Node environment..."
BABEL_CONFIG_FILE=babel.config.cjs npx jest basic-test.cjs --testEnvironment=node --config=jest.config.cjs

# Uncomment to run all tests when ready
# echo "Running all tests with Jest configuration (skipping coverage)..."
# BABEL_CONFIG_FILE=babel.config.cjs npx jest --config=jest.config.cjs --coverage=false