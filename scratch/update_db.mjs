import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL!);

async function updateSchema() {
  try {
    console.log('Adding exchange_rate to transactions...');
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(15, 6)`;
    
    console.log('Adding current_exchange_rate to portfolios...');
    await sql`ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS current_exchange_rate NUMERIC(15, 6) DEFAULT 1.0`;
    
    console.log('Schema updated successfully');
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

updateSchema();
