/**
 * Test script to verify customer API and database access
 * Run this script with: node test-customer-api.js
 */
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testCustomerDb() {
  console.log('Testing direct database connection...');
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id LIMIT 5');
    console.log(`Found ${result.rows.length} customers in database:`);
    result.rows.forEach(customer => {
      console.log(`- ${customer.id}: ${customer.name}`);
    });
    return result.rows;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// Simple fetch with node-fetch if available
async function testApiEndpoint() {
  console.log('\nTesting API endpoint...');
  try {
    // Try to use native fetch if available (Node 18+)
    const response = await fetch('http://localhost:5000/api/test-customer-query');
    
    if (response.ok) {
      const data = await response.json();
      console.log('API test endpoint response:', data);
      return data;
    } else {
      console.error(`API error: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Error details:', text);
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('API fetch error:', error);
    console.log('Note: If fetch failed, the server might not be running on port 5000');
    throw error;
  }
}

async function run() {
  try {
    // Test database connection
    await testCustomerDb();
    
    // Test API endpoint
    await testApiEndpoint();
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up database connection
    await pool.end();
  }
}

// Run the tests
run();