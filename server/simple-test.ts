/**
 * Simple test for the contradiction detection with the custom endpoint
 */

import { detectContradiction } from './hugging-face-service';

async function testContradiction() {
  const statement1 = 'The system must store all user data encrypted at rest.';
  const statement2 = 'User data should be stored in plain text format for easier debugging.';
  
  console.log('Testing contradiction detection with the custom HuggingFace endpoint...');
  console.log(`Statement 1: ${statement1}`);
  console.log(`Statement 2: ${statement2}`);
  
  const score = await detectContradiction(statement1, statement2);
  console.log(`Contradiction score: ${(score * 100).toFixed(1)}%`);
  console.log('Test complete!');
}

testContradiction().catch(error => console.error('Test failed:', error));