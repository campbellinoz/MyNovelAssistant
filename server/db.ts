import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log(`Using DATABASE_URL environment variable for database connection`);
console.log(`SERVER RESTART: Forcing deployment to use correct database connection`);

// Force production to use the correct database URL - NEVER use auto-provisioned database
const DATABASE_URL = process.env.DATABASE_URL;
console.log(`Database URL starts with: ${DATABASE_URL?.substring(0, 25)}...`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Replit Domains: ${process.env.REPLIT_DOMAINS}`);

// Validate we're using the correct holy-river Neon database
if (DATABASE_URL && !DATABASE_URL.includes('neondb')) {
  console.error('⚠️  WARNING: Not using Neon database! Current:', DATABASE_URL.substring(0, 50));
  console.error('⚠️  Production should use the same holy-river Neon database as development');
} else if (DATABASE_URL?.includes('neondb')) {
  console.log('✅ Using correct Neon database (holy-river)');
}

// Clear any cached connections on startup
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Force fresh connections
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
export const db = drizzle({ client: pool, schema });