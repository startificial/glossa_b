/**
 * Simple ES module test file for verifying Jest is working
 */

// A simple function to test
export const sum = (a, b) => {
  return a + b;
};

// Tests using ES module syntax
describe('sum function', () => {
  it('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('adds negative numbers correctly', () => {
    expect(sum(-1, -2)).toBe(-3);
  });
});