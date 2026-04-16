import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Find the portfolio
    const [portfolio] = await sql`SELECT * FROM portfolios WHERE name = 'US Tech Stocks' OR name = 'US Stocks' LIMIT 1`;
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }

    // 2. Rename it
    await sql`UPDATE portfolios SET name = 'US Stocks' WHERE id = ${portfolio.id}`;

    // 3. Clear existing data for this demo (Optional, but safer for consistency if re-running)
    // await sql`DELETE FROM transactions WHERE portfolio_id = ${portfolio.id}`;
    // await sql`DELETE FROM assets WHERE portfolio_id = ${portfolio.id}`;

    const transactions = [
      { sym: "NVDA", date: "2026-01-09", price: 185.268, units: 0.8572986, fx: 31.31 },
      { sym: "NVDA", date: "2026-01-20", price: 181.91, units: 0.528558, fx: 31.15 },
      { sym: "QQQM", date: "2026-01-20", price: 252.36, units: 0.1912396, fx: 31.15 },
      { sym: "PLTR", date: "2026-01-20", price: 167.58, units: 0.1912519, fx: 31.15 },
      { sym: "NLR", date: "2026-01-20", price: 147.76, units: 0.1083513, fx: 31.16 },
      { sym: "TSLA", date: "2026-01-20", price: 429.19, units: 0.111955, fx: 31.16 },
      { sym: "CIBR", date: "2026-01-20", price: 70.85, units: 0.452223, fx: 31.16 },
      { sym: "COIN", date: "2026-01-20", price: 233.08, units: 0.0686888, fx: 31.16 },
      { sym: "NLR", date: "2026-01-26", price: 155.19, units: 0.0824795, fx: 31.18 },
      { sym: "IWM", date: "2026-01-26", price: 265.1, units: 0.0603545, fx: 31.17 }
    ];

    const currentPrices: Record<string, number> = {
      NVDA: 198.87,
      QQQM: 262.48,
      PLTR: 142.15,
      NLR: 145.01,
      TSLA: 391.95,
      CIBR: 64.52,
      COIN: 195.90,
      IWM: 269.39
    };

    let totalThbCost = 0;
    for (const tx of transactions) {
      totalThbCost += tx.price * tx.units * tx.fx;
    }

    // Add Deposit to cover costs
    await sql`
      INSERT INTO transactions (portfolio_id, type, amount, current_value, note, date)
      VALUES (${portfolio.id}, 'deposit', ${totalThbCost}, ${totalThbCost}, 'Initial deposit for purchases', '2026-01-01')
    `;

    // Map to keep track of assets
    const assetsMap: Record<string, { units: number; costBasis: number }> = {};

    for (const tx of transactions) {
      const amountThb = tx.price * tx.units * tx.fx;
      
      // We need asset ID, so check if exists or create
      let [asset] = await sql`SELECT id FROM assets WHERE portfolio_id = ${portfolio.id} AND symbol = ${tx.sym}`;
      if (!asset) {
        [asset] = await sql`
          INSERT INTO assets (portfolio_id, symbol, name, category, price, units, cost_basis)
          VALUES (${portfolio.id}, ${tx.sym}, ${tx.sym}, 'Stock', ${currentPrices[tx.sym]}, 0, 0)
          RETURNING id
        `;
      }

      await sql`
        INSERT INTO transactions (portfolio_id, asset_id, type, amount, units, price_per_unit, exchange_rate, current_value, note, date)
        VALUES (${portfolio.id}, ${asset.id}, 'buy', ${amountThb}, ${tx.units}, ${tx.price}, ${tx.fx}, 0, 'Bulk data entry', ${tx.date})
      `;

      if (!assetsMap[tx.sym]) assetsMap[tx.sym] = { units: 0, costBasis: 0 };
      assetsMap[tx.sym].units += tx.units;
      assetsMap[tx.sym].costBasis += amountThb;
    }

    // Update Asset totals
    for (const sym in assetsMap) {
      await sql`
        UPDATE assets 
        SET units = ${assetsMap[sym].units}, 
            cost_basis = ${assetsMap[sym].costBasis},
            price = ${currentPrices[sym]}
        WHERE portfolio_id = ${portfolio.id} AND symbol = ${sym}
      `;
    }

    return NextResponse.json({ message: "Data entry successful", totalCostThb: totalThbCost });
  } catch (error: any) {
    console.error('Error in data entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
