"use server";

import { sql } from "./db";
import { Portfolio, Asset, Transaction } from "@/store/PortfolioContext";

// Fetch All Data
export async function getInitialData() {
  try {
    const portfoliosRaw = await sql`SELECT * FROM portfolios ORDER BY created_at ASC`;
    const assetsRaw = await sql`SELECT * FROM assets ORDER BY created_at ASC`;
    const transactionsRaw = await sql`SELECT *, date::text AS date_text FROM transactions ORDER BY created_at DESC`;

    return {
      portfolios: portfoliosRaw.map(p => ({
        ...p,
        createdAt: new Date(p.created_at).getTime(),
        currentExchangeRate: p.current_exchange_rate ? Number(p.current_exchange_rate) : undefined,
      })) as Portfolio[],
      assets: assetsRaw.map(a => ({
        ...a,
        portfolioId: a.portfolio_id,
        createdAt: new Date(a.created_at).getTime(),
        price: Number(a.price),
        units: Number(a.units),
        costBasis: Number(a.cost_basis),
      })) as Asset[],
      transactions: transactionsRaw.map(t => ({
        ...t,
        portfolioId: t.portfolio_id,
        createdAt: new Date(t.created_at).getTime(),
        amount: Number(t.amount),
        units: t.units ? Number(t.units) : undefined,
        assetId: t.asset_id,
        pricePerUnit: t.price_per_unit ? Number(t.price_per_unit) : undefined,
        exchangeRate: t.exchange_rate ? Number(t.exchange_rate) : undefined,
        currentValue: Number(t.current_value),
        date: t.date_text,
      })) as Transaction[],
    };
  } catch (error) {
    console.error("Failed to fetch initial data:", error);
    return { portfolios: [], assets: [], transactions: [] };
  }
}

// Portfolio Actions
export async function addPortfolioDb(name: string, type: string) {
  const [result] = await sql`
    INSERT INTO portfolios (name, type, current_exchange_rate) 
    VALUES (${name}, ${type}, 1.0) 
    RETURNING id, name, type, current_exchange_rate, created_at
  `;
  return {
    ...result,
    createdAt: new Date(result.created_at).getTime(),
    currentExchangeRate: Number(result.current_exchange_rate),
  } as Portfolio;
}

export async function updatePortfolioDb(portfolio: Portfolio) {
  await sql`
    UPDATE portfolios 
    SET name = ${portfolio.name}, type = ${portfolio.type}, current_exchange_rate = ${portfolio.currentExchangeRate}
    WHERE id = ${portfolio.id}
  `;
}

export async function removePortfolioDb(id: string) {
  await sql`DELETE FROM portfolios WHERE id = ${id}`;
}

// Transaction Actions
export async function addTransactionDb(tx: Omit<Transaction, "id" | "createdAt" | "portfolioId"> & { portfolioId: string }) {
  const [result] = await sql`
    INSERT INTO transactions (portfolio_id, asset_id, type, amount, units, price_per_unit, exchange_rate, current_value, note, date)
    VALUES (${tx.portfolioId}, ${tx.assetId}, ${tx.type}, ${tx.amount}, ${tx.units}, ${tx.pricePerUnit}, ${tx.exchangeRate}, ${tx.currentValue}, ${tx.note}, ${tx.date})
    RETURNING id, portfolio_id as "portfolioId", asset_id as "assetId", type, amount, units, price_per_unit as "pricePerUnit", exchange_rate as "exchangeRate", current_value as "currentValue", note, date::text as date, created_at as "createdAt"
  `;
  return {
    ...result,
    createdAt: new Date(result.createdAt).getTime(),
    amount: Number(result.amount),
    units: result.units ? Number(result.units) : undefined,
    pricePerUnit: result.pricePerUnit ? Number(result.pricePerUnit) : undefined,
    exchangeRate: result.exchangeRate ? Number(result.exchangeRate) : undefined,
    currentValue: Number(result.currentValue),
    date: result.date,
  } as Transaction;
}

export async function removeTransactionDb(id: string) {
  await sql`DELETE FROM transactions WHERE id = ${id}`;
}

// Asset Actions
export async function addAssetDb(asset: Omit<Asset, "id" | "createdAt" | "portfolioId"> & { portfolioId: string }) {
  const [result] = await sql`
    INSERT INTO assets (portfolio_id, symbol, name, category, price, units, cost_basis)
    VALUES (${asset.portfolioId}, ${asset.symbol}, ${asset.name}, ${asset.category}, ${asset.price}, ${asset.units}, ${asset.costBasis})
    RETURNING id, portfolio_id as "portfolioId", symbol, name, category, price, units, cost_basis as "costBasis", created_at as "createdAt"
  `;
  return {
    ...result,
    createdAt: new Date(result.createdAt).getTime(),
    price: Number(result.price),
    units: Number(result.units),
    costBasis: Number(result.costBasis),
  } as Asset;
}

export async function updateAssetDb(asset: Asset) {
  await sql`
    UPDATE assets 
    SET symbol = ${asset.symbol}, name = ${asset.name}, category = ${asset.category}, 
        price = ${asset.price}, units = ${asset.units}, cost_basis = ${asset.costBasis}
    WHERE id = ${asset.id}
  `;
}

export async function updateAssetPriceDb(id: string, price: number) {
  await sql`UPDATE assets SET price = ${price} WHERE id = ${id}`;
}

export async function removeAssetDb(id: string) {
  await sql`DELETE FROM assets WHERE id = ${id}`;
}


export async function resetAllDataDb() {
  await sql`TRUNCATE portfolios, assets, transactions CASCADE`;
}

// Price Fetching Actions
export async function fetchStockPrice(symbol: string) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const data = await res.json();
    const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price === undefined) throw new Error("Price not found");
    return { success: true, price: Number(price) };
  } catch (error) {
    console.error(`Failed to fetch stock price for ${symbol}:`, error);
    return { success: false, error: "Failed to fetch price" };
  }
}

export async function fetchGoldPrice() {
  try {
    const res = await fetch("https://api.chnwt.dev/thai-gold-api/latest");
    const data = await res.json();
    if (data.status === "success") {
      // We'll use gold bar sell price as it's the most common benchmark
      const sellPrice = parseFloat(data.response.price.gold_bar.sell.replace(/,/g, ''));
      const buyPrice = parseFloat(data.response.price.gold_bar.buy.replace(/,/g, ''));
      return { success: true, sellPrice, buyPrice };
    }
    throw new Error("Invalid response from gold API");
  } catch (error) {
    console.error("Failed to fetch gold price:", error);
    return { success: false, error: "Failed to fetch gold price" };
  }
}
