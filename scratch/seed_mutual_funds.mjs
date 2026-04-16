import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(DATABASE_URL);

const portfolioId = 'd501f1c8-1ecc-4fd7-a3cd-86a238d3e163'; // Mutual Funds portfolio

const rawData = [
  { symbol: 'K-US500X-A', date: '2026-01-11', price: 13.8481, units: 11048.48 },
  { symbol: 'K-VIETNAM', date: '2026-01-11', price: 15.3992, units: 1623.47 },
  { symbol: 'K-US500X-A', date: '2026-02-10', price: 14.4502, units: 692.0319 },
  { symbol: 'ONE-RAREEARTH', date: '2026-02-11', price: 11.6517, units: 1716.4877 },
  { symbol: 'A-GRID', date: '2026-02-24', price: 10.1762, units: 3439.3978 },
  { symbol: 'A-GRID', date: '2026-02-24', price: 9.7045, units: 3091.3493 },
  { symbol: 'A-GRID', date: '2026-02-24', price: 9.6301, units: 3115.2324 },
  { symbol: 'KT-AGRIANDFOOD', date: '2026-03-13', price: 8.2342, units: 3643.3411 },
];

async function seed() {
  console.log('Clearing old Mutual Funds data...');
  await sql`DELETE FROM transactions WHERE portfolio_id = ${portfolioId}`;
  await sql`DELETE FROM assets WHERE portfolio_id = ${portfolioId}`;

  console.log('Creating assets...');
  const assetsMap = new Map();
  for (const item of rawData) {
    if (!assetsMap.has(item.symbol)) {
      const [newAsset] = await sql`
        INSERT INTO assets (portfolio_id, symbol, name, category, price, units, cost_basis)
        VALUES (${portfolioId}, ${item.symbol}, ${item.symbol}, 'Mutual Fund', ${item.price}, 0, 0)
        RETURNING id
      `;
      assetsMap.set(item.symbol, { id: newAsset.id, units: 0, totalCost: 0, latestPrice: item.price });
      console.log(`Created asset ${item.symbol}`);
    }
    const asset = assetsMap.get(item.symbol);
    asset.units += item.units;
    asset.totalCost += item.price * item.units;
    asset.latestPrice = item.price;
  }

  console.log('Inserting transactions...');
  let totalInvested = 0;
  for (const item of rawData) {
    const asset = assetsMap.get(item.symbol);
    const amount = item.price * item.units;
    totalInvested += amount;
    await sql`
      INSERT INTO transactions (portfolio_id, asset_id, type, amount, units, price_per_unit, current_value, note, date)
      VALUES (${portfolioId}, ${asset.id}, 'buy', ${amount}, ${item.units}, ${item.price}, ${amount}, 'Imported Mutual Fund', ${item.date})
    `;
    console.log(`Inserted transaction for ${item.symbol} on ${item.date}`);
  }

  console.log('Updating assets totals...');
  for (const [symbol, data] of assetsMap) {
    const costBasis = data.totalCost / data.units;
    await sql`
      UPDATE assets 
      SET units = ${data.units}, cost_basis = ${data.totalCost}, price = ${data.latestPrice}
      WHERE id = ${data.id}
    `;
    console.log(`Updated totals for ${symbol} (Setting cost_basis = price as requested earlier)`);
  }

  console.log('Adding deposit transaction...');
  await sql`
    INSERT INTO transactions (portfolio_id, type, amount, current_value, note, date)
    VALUES (${portfolioId}, 'deposit', ${totalInvested}, ${totalInvested}, 'Initial Deposit for Import', CURRENT_DATE)
  `;

  console.log('Seed completed successfully.');
}

seed().catch(console.error);
