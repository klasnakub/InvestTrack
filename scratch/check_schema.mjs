import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('--- Assets Columns ---');
  const assetCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'assets'
  `;
  console.log(JSON.stringify(assetCols, null, 2));

  console.log('--- Transactions Columns ---');
  const txCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'transactions'
  `;
  console.log(JSON.stringify(txCols, null, 2));
}

main().catch(console.error);
