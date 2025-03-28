import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

// Enable fetch connection cache for better performance
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create SQL client
export const sql = neon(process.env.DATABASE_URL);

// Create a Neon database connection with Drizzle ORM
export const db = drizzle(sql, { schema });
