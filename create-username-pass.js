/**
 * Create User Script
 *
 * This script takes a username and password as command-line arguments
 * and creates a new user in the database with the provided credentials.
 * The password is hashed using the application's scrypt implementation.
 * 
 * This is a command-line utility for administrators to create new users directly,
 * bypassing the need for registration through the application interface.
 * It's especially useful for creating the initial admin user or for bulk user creation.
 *
 * Usage: node create-username-pass.js <username> <password> [firstName] [lastName] [email] [company] [role]
 * 
 * Parameters:
 * - username: Required. The unique username for the new user
 * - password: Required. The password for the new user (will be hashed)
 * - firstName: Optional. The user's first name (defaults to 'New')
 * - lastName: Optional. The user's last name (defaults to 'User')
 * - email: Optional. The user's email address (defaults to username@example.com)
 * - company: Optional. The user's company (defaults to 'Default Company')
 * - role: Optional. The user's role, either 'user' or 'admin' (defaults to 'user')
 * 
 * Examples:
 * - Basic user: node create-username-pass.js johndoe password123
 * - Full details: node create-username-pass.js janedoe securepass Jane Doe jane@example.com "Acme Inc" admin
 * 
 * The script will check if the username already exists before creating a new user.
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Load environment variables
dotenv.config();

// Create SQL client
const sql = neon(process.env.DATABASE_URL);

// Setup password hashing functions
const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with a random salt
 * @param password The password to hash
 * @returns The hashed password with salt in the format hash.salt
 */
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function createUser() {
  // --- 1. Get Input Arguments ---
  const args = process.argv.slice(2); // Get arguments after 'node' and script name
  const username = args[0];
  const password = args[1];
  // Optional arguments with defaults
  const firstName = args[2] || 'New';
  const lastName = args[3] || 'User';
  const email = args[4] || `${username}@example.com`; // Default email based on username
  const company = args[5] || 'Default Company';
  const role = args[6] || 'user'; // Default role

  // --- 2. Validate Input ---
  if (!username || !password) {
    console.error('Error: Username and password are required.');
    console.log('Usage: node create-username-pass.js <username> <password> [firstName] [lastName] [email] [company] [role]');
    process.exit(1); // Exit with an error code
  }

  // Validate role
  if (role !== 'user' && role !== 'admin') {
    console.error('Error: Role must be either "user" or "admin".');
    process.exit(1); // Exit with an error code
  }

  let exitCode = 0; // Default to success exit code

  try {
    console.log(`Attempting to create user: '${username}'...`);

    // --- 3. Check if User Exists ---
    const existingUser = await sql`SELECT id FROM users WHERE username = ${username}`;

    if (existingUser && existingUser.length > 0) {
      console.error(`Error: User '${username}' already exists.`);
      exitCode = 1; // Set error exit code
    } else {
      // --- 4. Hash Password ---
      console.log('Hashing password...');
      const hashedPassword = await hashPassword(password);
      console.log('Password hashed.');

      // --- 5. Create User in Database ---
      console.log('Inserting user into database...');
      const now = new Date();
      
      const result = await sql`
        INSERT INTO users (
          username,
          password,
          first_name,
          last_name,
          email,
          company,
          role,
          created_at,
          updated_at
        ) VALUES (
          ${username},
          ${hashedPassword},
          ${firstName},
          ${lastName},
          ${email},
          ${company},
          ${role},
          ${now},
          ${now}
        ) RETURNING id, username, role
      `;

      console.log(`User '${username}' created successfully with ID: ${result[0].id}`);
      console.log(`Role set to: '${role}'`);
    }
  } catch (error) {
    console.error('Error during user creation process:', error);
    exitCode = 1; // Set error exit code
  } finally {
    // --- 6. Exit ---
    console.log(`Script finished with exit code ${exitCode}.`);
    process.exit(exitCode); // Exit with success (0) or error (1)
  }
}

// Execute the function
createUser();