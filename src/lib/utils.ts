import { Transaction, Asset } from "@/store/PortfolioContext";

export function computePortStats(portfolioId: string, txs: Transaction[], assets: Asset[] = []) {
    const portTxs = txs.filter(t => t.portfolioId === portfolioId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const portAssets = assets.filter(a => a.portfolioId === portfolioId);

    let cashBasis = 0;
    let cashBalance = 0;
    let totalUnits = 0;

    portTxs.forEach(t => {
        if (t.type === "deposit") {
            cashBasis += t.amount;
            cashBalance += t.amount;
            totalUnits += (t.units || 0);
        } else if (t.type === "withdraw") {
            cashBasis -= t.amount;
            cashBalance -= t.amount;
            totalUnits -= (t.units || 0);
        } else if (t.type === "buy") {
            cashBalance -= t.amount;
        } else if (t.type === "sell") {
            // amount is the total returned cash from sell
            cashBalance += t.amount;
        }
    });

    const totalAssetValue = portAssets.reduce((sum, a) => sum + (a.units * a.price), 0);
    const totalAssetCost = portAssets.reduce((sum, a) => sum + a.costBasis, 0);

    const currentValue = cashBalance + totalAssetValue;
    const costBasis = cashBasis;

    const gain = currentValue - costBasis;
    const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0;
    const navPerUnit = totalUnits > 0 ? currentValue / totalUnits : 10;

    return {
        currentValue,
        costBasis,
        gain,
        gainPct,
        cashBalance,
        totalAssetValue,
        totalAssetCost,
        totalUnits,
        navPerUnit
    };
}

export function fmt(n: number) { return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function fmtPct(n: number) { return (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }
export function uid() { return Math.random().toString(36).slice(2, 10); }
export function today() { return new Date().toISOString().split("T")[0]; }

export const txLabels = { buy: "Buy / Invest", sell: "Sell / Withdraw", nav_update: "Update NAV", deposit: "Deposit", withdraw: "Withdraw" };
export const txIcons = { buy: "add", sell: "remove", nav_update: "sync", deposit: "account_balance", withdraw: "money_off" };
