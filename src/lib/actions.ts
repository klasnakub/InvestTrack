"use server";

import { sql } from "./db";
import { Portfolio, Asset, Transaction } from "@/store/PortfolioContext";

// Fetch All Data
export async function getInitialData() {
  try {
    const portfoliosRaw = await sql`SELECT * FROM portfolios ORDER BY created_at ASC`;
    const assetsRaw = await sql`SELECT * FROM assets ORDER BY created_at ASC`;
    const transactionsRaw = await sql`SELECT * FROM transactions ORDER BY created_at DESC`;

    return {
      portfolios: portfoliosRaw.map(p => ({
        ...p,
        createdAt: new Date(p.created_at).getTime(),
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
        currentValue: Number(t.current_value),
        date: new Date(t.date).toISOString().split('T')[0],
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
    INSERT INTO portfolios (name, type) 
    VALUES (${name}, ${type}) 
    RETURNING id, name, type, created_at
  `;
  return {
    ...result,
    createdAt: new Date(result.created_at).getTime(),
  } as Portfolio;
}

export async function removePortfolioDb(id: string) {
  await sql`DELETE FROM portfolios WHERE id = ${id}`;
}

// Transaction Actions
export async function addTransactionDb(tx: Omit<Transaction, "id" | "createdAt" | "portfolioId"> & { portfolioId: string }) {
  const [result] = await sql`
    INSERT INTO transactions (portfolio_id, asset_id, type, amount, units, price_per_unit, current_value, note, date)
    VALUES (${tx.portfolioId}, ${tx.assetId}, ${tx.type}, ${tx.amount}, ${tx.units}, ${tx.pricePerUnit}, ${tx.currentValue}, ${tx.note}, ${tx.date})
    RETURNING id, portfolio_id as "portfolioId", asset_id as "assetId", type, amount, units, price_per_unit as "pricePerUnit", current_value as "currentValue", note, date, created_at as "createdAt"
  `;
  return {
    ...result,
    createdAt: new Date(result.createdAt).getTime(),
    amount: Number(result.amount),
    units: result.units ? Number(result.units) : undefined,
    currentValue: Number(result.currentValue),
    date: new Date(result.date).toISOString().split('T')[0],
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
