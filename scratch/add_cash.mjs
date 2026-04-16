import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is not defined');
const sql = neon(DATABASE_URL);

const portfolioId = 'd501f1c8-1ecc-4fd7-a3cd-86a238d3e163';
const amount = 210664;
const pricePerUnit = 10;
const units = amount / pricePerUnit;

async function addCash() {
  console.log(`Adding ${amount} Baht to portfolio ${portfolioId}...`);
  
  // Calculate current total value for current_value field in transaction
  // (In our app, currentValue in transactions usually represents the total portfolio value AFTER the transaction)
  const assets = await sql`SELECT price, units FROM assets WHERE portfolio_id = ${portfolioId}`;
  const txs = await sql`SELECT amount, type FROM transactions WHERE portfolio_id = ${portfolioId}`;
  
  let cashBalance = 0;
  txs.forEach(t => {
    if (t.type === 'deposit') cashBalance += Number(t.amount);
    if (t.type === 'withdraw') cashBalance -= Number(t.amount);
    if (t.type === 'buy') cashBalance -= Number(t.amount);
    if (t.type === 'sell') cashBalance += Number(t.amount);
  });
  
  const assetValue = assets.reduce((sum, a) => sum + (Number(a.price) * Number(a.units)), 0);
  const totalValueBefore = cashBalance + assetValue;
  const totalValueAfter = totalValueBefore + amount;

  await sql`
    INSERT INTO transactions (portfolio_id, type, amount, units, current_value, note, date)
    VALUES (${portfolioId}, 'deposit', ${amount}, ${units}, ${totalValueAfter}, 'Additional Cash Injection @ ฿10', CURRENT_DATE)
  `;
  
  console.log('Done.');
}

addCash().catch(console.error);
