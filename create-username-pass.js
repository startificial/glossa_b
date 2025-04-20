/**
 * Create User Script
 *
 * This script takes a username and password as command-line arguments
 * and creates a new user in the database with the provided credentials.
 * The password is hashed using the application's scrypt implementation.
 *
 * Usage: node create-user.js <username> <password> [firstName] [lastName] [email] [company] [role]
 * Optional fields default to placeholders or 'user' role.
 */
import { sql } from './server/db'; // Assuming './server/db' exports your tagged template literal setup
import { hashPassword } from './server/utils/password-utils'; // Assuming this path is correct

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
    console.log('Usage: node create-user.js <username> <password> [firstName] [lastName] [email] [company] [role]');
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
      await sql`
        INSERT INTO users (
          username,
          password,
          first_name,
          last_name,
          email,
          company,
          role
        ) VALUES (
          ${username},
          ${hashedPassword},
          ${firstName},
          ${lastName},
          ${email},
          ${company},
          ${role}
        )
      `;

      console.log(`User '${username}' created successfully with specified details.`);
      console.log(`Role set to: '${role}'`);
    }
  } catch (error) {
    console.error('Error during user creation process:', error);
    exitCode = 1; // Set error exit code
  } finally {
    // --- 6. Exit ---
    // Close the database connection if necessary. Some libraries manage pools
    // automatically, but if your 'sql' object requires explicit closing, do it here.
    // e.g., await sql.end();
    console.log(`Script finished with exit code ${exitCode}.`);
    process.exit(exitCode); // Exit with success (0) or error (1)
  }
}

// Execute the function
createUser();