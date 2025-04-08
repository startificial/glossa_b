/**
 * Test file for the contradiction detection system
 * Run with: npx tsx server/test-contradiction.ts
 */

import { detectContradiction } from './hugging-face-service';
import { log } from './vite';

async function testContradictionDetection() {
  log('Starting contradiction detection test...', 'test');
  
  // Test cases with expected contradictions
  const contradictionCases = [
    {
      statement1: 'The system must store all user data encrypted at rest.',
      statement2: 'User data should be stored in plain text format for easier debugging.',
      description: 'Security contradiction (encryption vs plain text)'
    },
    {
      statement1: 'The application must be accessible only to authenticated users.',
      statement2: 'All users should be able to access the application without logging in.',
      description: 'Authentication contradiction'
    },
    {
      statement1: 'The system must deliver notifications in real-time with no more than 1 second delay.',
      statement2: 'Notifications can be batched and sent once per hour to reduce server load.',
      description: 'Performance contradiction (real-time vs batched)'
    }
  ];
  
  // Test cases with no expected contradictions
  const nonContradictionCases = [
    {
      statement1: 'The system should use a PostgreSQL database for data storage.',
      statement2: 'The system must implement proper database indexing for efficient queries.',
      description: 'Compatible database requirements'
    },
    {
      statement1: 'The UI must follow the company branding guidelines.',
      statement2: 'The application must be responsive and work on mobile devices.',
      description: 'Complementary UI requirements'
    },
    {
      statement1: 'User passwords must be hashed before storage.',
      statement2: 'The system should use bcrypt for password hashing.',
      description: 'Specific implementation of a general requirement'
    }
  ];
  
  // Process contradictory statements
  log('Testing statements that SHOULD contradict each other:', 'test');
  for (const testCase of contradictionCases) {
    const score = await detectContradiction(testCase.statement1, testCase.statement2);
    log(`${testCase.description}: Score = ${(score * 100).toFixed(1)}% contradiction`, 'test');
    log(`Statement 1: ${testCase.statement1}`, 'test');
    log(`Statement 2: ${testCase.statement2}`, 'test');
    log('---', 'test');
  }
  
  // Process non-contradictory statements
  log('Testing statements that should NOT contradict each other:', 'test');
  for (const testCase of nonContradictionCases) {
    const score = await detectContradiction(testCase.statement1, testCase.statement2);
    log(`${testCase.description}: Score = ${(score * 100).toFixed(1)}% contradiction`, 'test');
    log(`Statement 1: ${testCase.statement1}`, 'test');
    log(`Statement 2: ${testCase.statement2}`, 'test');
    log('---', 'test');
  }
  
  log('Contradiction detection test complete!', 'test');
}

// Run the test
testContradictionDetection().catch(err => {
  console.error('Error running contradiction test:', err);
});