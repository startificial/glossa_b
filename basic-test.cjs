/**
 * Basic test file to verify Jest is working properly.
 * 
 * @jest-environment node
 */

// A simple function to test
function sum(a, b) {
  return a + b;
}

// Basic test
test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});

// Export the function
module.exports = { sum };