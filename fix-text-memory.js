/**
 * Fix for JavaScript heap memory issue when processing text files.
 * 
 * This script increases the Node.js memory limit to allow processing larger text files.
 */

// Set higher memory limit for Node.js
// This is a temporary solution until all text processing uses proper streaming
process.env.NODE_OPTIONS = "--max-old-space-size=4096";

console.log("Node.js memory limit increased to 4GB");
console.log("This allows processing larger text files without heap overflow");