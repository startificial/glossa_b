/**
 * Test Password Hash Compatibility
 * 
 * This script tests the compatibility between the password hashing in create-username-pass.js
 * and the authentication system in auth.ts. It creates a hash using both methods and verifies
 * that they are compatible with each other.
 */
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Setup password hashing functions
const scryptAsync = promisify(scrypt);

// Create a hash using the method from create-username-pass.js
async function hashPasswordScript(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

// Compare password using the method from auth.ts
async function comparePasswordsAuth(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Test function
async function testPasswordHashing() {
  try {
    // Test password
    const testPassword = "TestPassword123";
    
    console.log("Creating hash using script method...");
    const scriptHash = await hashPasswordScript(testPassword);
    console.log(`Script hash: ${scriptHash}`);
    
    console.log("\nTesting verification using auth method...");
    const isValid = await comparePasswordsAuth(testPassword, scriptHash);
    console.log(`Password verification result: ${isValid ? 'Success' : 'Failed'}`);
    
    // Try to fetch a user from the database
    console.log("\nTrying to find the user you created:");
    const sql = neon(process.env.DATABASE_URL);
    const username = "glossa_admin"; // Replace with the username you created
    const user = await sql`SELECT * FROM users WHERE username = ${username}`;
    
    if (user && user.length > 0) {
      console.log(`Found user: ${user[0].username}`);
      console.log(`Stored password hash: ${user[0].password}`);
      
      console.log("\nTesting verification with database hash...");
      const dbIsValid = await comparePasswordsAuth("ckC^bpCek4PZw#@", user[0].password); // The password you provided
      console.log(`Database password verification result: ${dbIsValid ? 'Success' : 'Failed'}`);
    } else {
      console.log(`User not found: ${username}`);
    }
    
  } catch (error) {
    console.error("Error testing password hashing:", error);
  }
}

// Run the test
testPasswordHashing();