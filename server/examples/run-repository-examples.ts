/**
 * Repository Examples Runner
 * 
 * This script demonstrates the repository pattern usage by running the examples.
 * Run this with `npx tsx server/examples/run-repository-examples.ts`
 */
import { 
  userRepositoryExample, 
  projectRepositoryExample, 
  requirementRepositoryExample,
  combinedRepositoryExample
} from './repository-example';

async function runExamples() {
  console.log('\n==== User Repository Example ====\n');
  await userRepositoryExample();
  
  console.log('\n==== Project Repository Example ====\n');
  await projectRepositoryExample();
  
  console.log('\n==== Requirement Repository Example ====\n');
  await requirementRepositoryExample();
  
  console.log('\n==== Combined Repository Example ====\n');
  await combinedRepositoryExample();
  
  console.log('\nAll examples completed');
}

// Run the examples
runExamples()
  .then(() => {
    console.log('Examples finished successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running examples:', error);
    process.exit(1);
  });