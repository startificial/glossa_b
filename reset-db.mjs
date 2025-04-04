#!/usr/bin/env node

/**
 * Reset Database Script Runner
 * 
 * This script provides a user-friendly CLI interface to run the database reset
 * with confirmation prompts and proper error handling.
 * 
 * === WHAT THIS TOOL DOES ===
 * 
 * This tool will:
 * 1. PRESERVE: Demo user account (for login)
 * 2. REMOVE: All customers, projects, input data, requirements, activities, tasks, and invites
 * 3. RESET: All ID sequences to start from 1
 * 
 * === USAGE ===
 * 
 * To reset the database, run:
 *   node reset-db.mjs
 * 
 * Type 'yes' when prompted to confirm.
 * 
 * After reset completes, restart the application with the "Start application" workflow.
 */

import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Display header
console.log('\n🗑️  Database Reset Tool 🗑️');
console.log('--------------------------------------');
console.log('This will clear all application data while preserving the demo user account.');
console.log('The following data will be removed:');
console.log('  - All customers');
console.log('  - All projects');
console.log('  - All input data (PDF uploads, etc.)');
console.log('  - All requirements');
console.log('  - All activities');
console.log('  - All implementation tasks');
console.log('  - All invites');
console.log('\nThe demo user account will be preserved for login.');

// Ask for confirmation
rl.question('\n⚠️  Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    console.log('\n--------------------------------------');
    console.log('🔄 Running database reset script...\n');
    
    // Run the actual reset script
    const resetScriptPath = join(__dirname, 'reset-database.js');
    const resetProcess = spawn('node', ['--experimental-specifier-resolution=node', resetScriptPath], {
      stdio: 'inherit'
    });
    
    resetProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('\n--------------------------------------');
        console.log('✅ Reset complete! You can now restart your application.');
        console.log('To restart, run the "Start application" workflow.');
      } else {
        console.error('\n--------------------------------------');
        console.error(`❌ Reset failed with exit code ${code}`);
        console.error('Check the logs above for details on what went wrong.');
      }
      rl.close();
    });
    
    resetProcess.on('error', (err) => {
      console.error('\n--------------------------------------');
      console.error('❌ Failed to run reset script:', err.message);
      rl.close();
    });
  } else {
    console.log('\n❌ Reset cancelled.');
    rl.close();
  }
});