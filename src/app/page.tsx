"use client";

import { usePortfolio } from "@/store/PortfolioContext";
import { computePortStats, fmt, fmt4, fmtPct } from "@/lib/utils";
import Link from "next/link";

export default function Dashboard() {
  const { portfolios, transactions, assets, resetData } = usePortfolio();

  const portStats = portfolios.map(p => ({ ...p, ...computePortStats(p.id, transactions, assets, p.type === 'foreign_stock' ? (p.currentExchangeRate || 35) : undefined) }));
  const totalNAV = portStats.reduce((s, p) => s + p.currentValue, 0);
  const totalCost = portStats.reduce((s, p) => s + p.costBasis, 0);
  const totalGain = totalNAV - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const referenceWealth = 1179741;
  const growthAmount = totalNAV - referenceWealth;
  const growthPct = (growthAmount / referenceWealth) * 100;

  const depositStartDate = new Date("2026-04-16T00:00:00");
  const cumulativeDeposits = transactions
    .filter(t => t.type === "deposit" && new Date(t.date + "T00:00:00") >= depositStartDate)
    .reduce((sum, t) => sum + t.amount, 0);

  const portIcons: Record<string, string> = {
    th_stock: "trending_up",
    foreign_stock: "public",
    fund: "pie_chart",
    gold: "monetization_on",
  };

  const getPercentage = (value: number) => totalNAV > 0 ? (value / totalNAV) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <section className="mb-16">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-8 mb-8">
          <div>
            <p className="text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Total Net Worth</p>
            <h1 className="text-5xl md:text-6xl font-display font-light text-primary tracking-tight">
              ฿{Math.floor(totalNAV).toLocaleString("th-TH")}
              <span className="text-2xl text-gray-300 font-light">
                .{Math.floor((totalNAV % 1) * 100).toString().padStart(2, '0')}
              </span>
            </h1>

            <div className="flex items-center gap-3 mt-6">
              <span className={`text-sm font-medium px-2 py-0.5 rounded flex items-center gap-1 ${totalGain >= 0 ? "text-accent bg-[rgba(16,185,129,0.1)]" : "text-danger bg-[rgba(239,68,68,0.1)]"}`}>
                <span className="material-symbols-outlined text-sm">
                  {totalGain >= 0 ? "arrow_upward" : "arrow_downward"}
                </span>
                {fmtPct(Math.abs(totalGainPct))}
              </span>
              <span className="text-secondary text-sm">All time return</span>
            </div>
          </div>

          <div className="w-full md:w-1/2 h-24">
            {/* Simple decorative chart */}
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 100">
              <path className="opacity-80" d="M0,80 C50,75 100,60 150,65 C200,70 250,30 300,25 C350,20 380,10 400,5" fill="none" stroke="#10b981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              <defs>
                <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.1"></stop>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              <path d="M0,80 C50,75 100,60 150,65 C200,70 250,30 300,25 C350,20 380,10 400,5 V100 H0 Z" fill="url(#trendGradient)"></path>
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-6 border-t border-b border-border-subtle">
          <div>
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">Invested Capital</p>
            <p className="text-lg font-medium text-primary">฿{fmt(totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">Total Profit</p>
            <p className={`text-lg font-medium ${totalGain >= 0 ? "text-accent" : "text-danger"}`}>
              {totalGain >= 0 ? "+" : "-"}฿{fmt(Math.abs(totalGain))}
            </p>
          </div>
          <div>
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">Portfolios</p>
            <p className="text-lg font-medium text-primary">{portfolios.length}</p>
          </div>
          <div>
            <p className="text-xs text-secondary uppercase tracking-wider mb-1">All Time Return</p>
            <p className={`text-lg font-medium ${totalGainPct >= 0 ? "text-accent" : "text-danger"}`}>
              {fmtPct(totalGainPct)}
            </p>
          </div>
        </div>
      </section>
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-medium text-primary">Portfolio Breakdown</h2>
            <Link href="/add" className="text-sm font-medium text-bg-main bg-primary px-3 py-1.5 rounded-md hover:opacity-80">
              Manage
            </Link>
          </div>
          <div className="space-y-1">
            {portStats.map(p => (
              <Link href={`/asset/${p.id}`} key={p.id}>
                <div className="group flex items-center justify-between p-4 rounded-xl hover:bg-bg-subtle transition-colors cursor-pointer border border-transparent hover:border-border-subtle">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-border-subtle flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined">{portIcons[p.type] || "account_balance_wallet"}</span>
                    </div>
                    <div>
                      <p className="font-medium text-primary">{p.name}</p>
                      <p className="text-xs text-secondary">
                        {fmt(p.totalUnits)} Units @ ฿{fmt4(p.navPerUnit)}
                        <span className="mx-1.5 opacity-50">•</span>
                        {getPercentage(p.currentValue).toFixed(1)}% of portfolio
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">฿{fmt(p.currentValue)}</p>
                    <p className={`text-xs font-medium ${p.gainPct >= 0 ? "text-accent" : "text-danger"}`}>
                      {p.gain >= 0 ? "+" : "-"}฿{fmt(Math.abs(p.gain))} ({fmtPct(p.gainPct)})
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-bg-subtle rounded-2xl p-6">
            <h3 className="text-sm font-medium text-secondary uppercase mb-6 tracking-wide">Allocation</h3>
            <div className="space-y-4">
              {portStats.map((p, idx) => {
                const colors = ["bg-[var(--color-primary)]", "bg-[var(--color-secondary)]", "bg-gray-400", "bg-gray-300"];
                const color = colors[idx % colors.length];
                const pct = getPercentage(p.currentValue);
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-primary font-medium">{p.name}</span>
                      <span className="text-secondary">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-border-subtle rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-secondary uppercase mb-4 tracking-wide">Recent Transactions</h3>
            <div className="border-l border-border-subtle pl-4 space-y-4">
              {transactions.filter(t => t.type !== "nav_update").slice(0, 4).map((t, idx) => {
                const isPos = !["sell", "withdraw"].includes(t.type);
                const isNav = t.type === "nav_update";
                const p = portfolios.find(x => x.id === t.portfolioId);
                const color = isNav ? "bg-gray-300" : isPos ? "bg-accent" : "bg-danger";

                const asset = assets.find(a => a.id === t.assetId);

                return (
                  <div key={t.id} className="relative">
                    <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ${color} border-2 border-bg-main`}></div>
                    <p className="text-sm font-medium text-primary capitalize">
                      {t.type} {asset ? <span className="text-accent">{asset.symbol}</span> : p?.name}
                    </p>
                    <p className="text-xs text-secondary mt-0.5">
                      {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })},{" "}
                      <span className={isPos && !isNav ? "text-accent" : isNav ? "text-secondary" : "text-danger"}>
                        {isNav ? "" : isPos ? "+" : "-"}฿{fmt(isNav ? t.currentValue : t.amount)}
                      </span>
                    </p>
                  </div>
                );
              })}
              {transactions.length === 0 && (
                <div className="text-sm text-secondary">No transactions yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Wealth Growth Section */}
      <section className="mt-16 bg-bg-subtle border border-border-subtle rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] -mr-32 -mt-32 rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <span className="material-symbols-outlined text-accent text-xl">insights</span>
            <h2 className="text-xl font-display font-medium text-primary">Growth of Money</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <p className="text-xs text-secondary uppercase tracking-wider mb-2">Growth Since Jan 11, 2026</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-display text-primary">
                  ฿{Math.floor(growthAmount).toLocaleString("th-TH")}
                  <span className="text-base text-gray-300">.{Math.floor((Math.abs(growthAmount) % 1) * 100).toString().padStart(2, '0')}</span>
                </p>
                <p className={`text-sm font-medium ${growthAmount >= 0 ? "text-accent" : "text-danger"}`}>
                  ({fmtPct(growthPct)})
                </p>
              </div>
              <p className="text-xs text-secondary mt-1 italic">Compared to baseline ฿1,179,741</p>
            </div>

            <div className="md:border-l md:border-border-subtle md:pl-12">
              <p className="text-xs text-secondary uppercase tracking-wider mb-2">Cumulative Deposits</p>
              <p className="text-3xl font-display text-primary">
                ฿{Math.floor(cumulativeDeposits).toLocaleString("th-TH")}
                <span className="text-base text-gray-300">.{Math.floor((cumulativeDeposits % 1) * 100).toString().padStart(2, '0')}</span>
              </p>
              <p className="text-xs text-secondary mt-1">Investments added since Apr 16, 2026</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
