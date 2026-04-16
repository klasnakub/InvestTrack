import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const portfolioId = 'd501f1c8-1ecc-4fd7-a3cd-86a238d3e163'; // Mutual Funds

  console.log('Updating assets: setting cost_basis = price...');
  await sql`
    UPDATE assets 
    SET cost_basis = price 
    WHERE portfolio_id = ${portfolioId}
  `;

  console.log('Calculated total invested for Mutual Funds...');
  const result = await sql`
    SELECT SUM(amount) as total 
    FROM transactions 
    WHERE portfolio_id = ${portfolioId} AND type = 'buy'
  `;
  const totalInvested = result[0].total || 0;

  console.log(`Total Invested: ${totalInvested}. Adding deposit transaction...`);
  
  const existingDeposit = await sql`
    SELECT id FROM transactions 
    WHERE portfolio_id = ${portfolioId} AND type = 'deposit' AND note = 'Initial Deposit for Import'
  `;

  if (existingDeposit.length === 0) {
    await sql`
      INSERT INTO transactions (portfolio_id, type, amount, current_value, note, date)
      VALUES (${portfolioId}, 'deposit', ${totalInvested}, ${totalInvested}, 'Initial Deposit for Import', CURRENT_DATE)
    `;
    console.log('Added deposit transaction.');
  } else {
    await sql`
      UPDATE transactions 
      SET amount = ${totalInvested}, current_value = ${totalInvested}
      WHERE id = ${existingDeposit[0].id}
    `;
    console.log('Updated existing deposit transaction.');
  }

  console.log('Finished.');
}

main().catch(console.error);
