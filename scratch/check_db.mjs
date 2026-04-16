import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('--- Portfolios ---');
  const portfolios = await sql`SELECT * FROM portfolios`;
  console.log(JSON.stringify(portfolios, null, 2));

  console.log('--- Assets ---');
  const assets = await sql`SELECT * FROM assets`;
  console.log(JSON.stringify(assets, null, 2));

  console.log('--- Transactions ---');
  const transactions = await sql`SELECT * FROM transactions ORDER BY date DESC LIMIT 10`;
  console.log(JSON.stringify(transactions, null, 2));
}

main().catch(console.error);
