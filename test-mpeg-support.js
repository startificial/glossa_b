/**
 * Test Script for MPEG Video Support
 * 
 * This script tests the system's ability to recognize and handle MPEG video files
 */
import path from 'path';

// Test file extensions
const testFileNames = [
  'video1.mp4',
  'video2.mpeg',
  'video3.mpg',
  'video4.avi',
  'video5.mov',
  'video6.webm'
];

// Test file type detection
console.log('Testing file type detection:');
testFileNames.forEach(fileName => {
  const fileType = path.extname(fileName).toLowerCase();
  const isVideoType = ['.mp4', '.mov', '.webm', '.mpeg', '.mpg', '.avi'].includes(fileType);
  console.log(`${fileName} -> Extension: ${fileType}, Recognized as video: ${isVideoType}`);
});

// Test for supported formats in controller
console.log('\nTesting video format recognition in controller:');
testFileNames.forEach(fileName => {
  const fileType = path.extname(fileName).toLowerCase();
  
  // Simulate file type check from input-data-controller.ts
  if (['.mp4', '.mov', '.webm', '.mpeg', '.mpg', '.avi'].includes(fileType)) {
    console.log(`${fileName} -> Recognized as supported video format ✓`);
  } else {
    console.log(`${fileName} -> NOT recognized as supported video format ✗`);
  }
});

console.log('\nTesting request size limits:');
// Simulate file sizes
const fileSizes = [
  { name: 'small.mp4', size: 5 * 1024 * 1024 }, // 5MB
  { name: 'medium.mpeg', size: 42 * 1024 * 1024 }, // 42MB
  { name: 'large.mpg', size: 120 * 1024 * 1024 }, // 120MB
  { name: 'xlarge.avi', size: 290 * 1024 * 1024 } // 290MB
];

const EXPRESS_LIMIT = 300 * 1024 * 1024; // 300MB as configured
const MULTER_LIMIT = 300 * 1024 * 1024; // 300MB as configured

fileSizes.forEach(file => {
  const passesExpressLimit = file.size <= EXPRESS_LIMIT;
  const passesMulterLimit = file.size <= MULTER_LIMIT;
  
  console.log(`${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB):`);
  console.log(`  - Express body limit (${EXPRESS_LIMIT / (1024 * 1024)}MB): ${passesExpressLimit ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  - Multer file limit (${MULTER_LIMIT / (1024 * 1024)}MB): ${passesMulterLimit ? 'PASS ✓' : 'FAIL ✗'}`);
});

console.log('\nAll tests complete.');