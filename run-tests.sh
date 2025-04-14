#!/bin/bash

# Script to run Jest tests for the project

# Set the environment to test
export NODE_ENV=test

# Run Jest tests
echo "Running tests..."
npx jest "$@"

# Get the exit code of the tests
TEST_EXIT_CODE=$?

# Exit with the same code as the tests
exit $TEST_EXIT_CODE