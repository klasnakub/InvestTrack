import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');
const sql = neon(DATABASE_URL);

const portfolioId = 'd60f0a9a-2572-4802-96d5-472516381384'; // Thai Stocks

const rawData = [
  { symbol: 'AOT', name: 'Airports of Thailand', date: '2026-01-11', price: 63.16, units: 1500 },
  { symbol: 'GULF', name: 'Gulf Energy Development', date: '2026-01-11', price: 41.79, units: 4300 },
  { symbol: 'SCB', name: 'SCB X PCL', date: '2026-01-11', price: 138.5, units: 400 },
  { symbol: 'KKP', name: 'Kiatnakin Phatra Bank', date: '2026-03-12', price: 73, units: 800 },
];

const remainingCash = 280019.51;

async function seed() {
  console.log('Clearing old Thai Stocks data...');
  await sql`DELETE FROM transactions WHERE portfolio_id = ${portfolioId}`;
  await sql`DELETE FROM assets WHERE portfolio_id = ${portfolioId}`;

  console.log('Creating assets and transactions...');
  let totalStockCost = 0;
  
  for (const item of rawData) {
    const amount = item.price * item.units;
    totalStockCost += amount;
    
    const [asset] = await sql`
      INSERT INTO assets (portfolio_id, symbol, name, category, price, units, cost_basis)
      VALUES (${portfolioId}, ${item.symbol}, ${item.name}, 'Thai Stock', ${item.price}, ${item.units}, ${amount})
      RETURNING id
    `;
    
    await sql`
      INSERT INTO transactions (portfolio_id, asset_id, type, amount, units, price_per_unit, current_value, note, date)
      VALUES (${portfolioId}, ${asset.id}, 'buy', ${amount}, ${item.units}, ${item.price}, ${amount}, 'Initial Import', ${item.date})
    `;
    console.log(`Added ${item.symbol}`);
  }

  const totalDepositAmount = totalStockCost + remainingCash;
  const depositUnits = totalDepositAmount / 10;
  
  console.log(`Adding initial deposit of ${totalDepositAmount} (@NAV 10)...`);
  await sql`
    INSERT INTO transactions (portfolio_id, type, amount, units, current_value, note, date)
    VALUES (${portfolioId}, 'deposit', ${totalDepositAmount}, ${depositUnits}, ${totalDepositAmount}, 'Initial Deposit for Import', '2026-01-10')
  `;

  console.log('Seed completed successfully.');
}

seed().catch(console.error);
