"use client";

import { useState } from "react";
import { usePortfolio, PortfolioType } from "@/store/PortfolioContext";
import { uid, today, computePortStats, fmt } from "@/lib/utils";
import { useRouter } from "next/navigation";

const PORT_TYPES: { id: PortfolioType; label: string; icon: string }[] = [
    { id: "th_stock", label: "Thai Stocks", icon: "trending_up" },
    { id: "foreign_stock", label: "Foreign Stocks", icon: "public" },
    { id: "fund", label: "Mutual Funds", icon: "pie_chart" },
    { id: "gold", label: "Gold", icon: "monetization_on" },
];

export default function AddTransactionPage() {
    const router = useRouter();
    const { portfolios, addTransaction, addPortfolio, removePortfolio, transactions, assets } = usePortfolio();
    const [tab, setTab] = useState<"tx" | "port">("tx");

    const [txForm, setTxForm] = useState({ portfolioId: "", type: "nav_update", amount: "", currentValue: "", note: "", date: today() });
    const [newPort, setNewPort] = useState({ name: "", type: "th_stock" as PortfolioType });

    const selectedPortStats = txForm.portfolioId ? computePortStats(txForm.portfolioId, transactions, assets) : null;
    const computedUnits = (txForm.type === "deposit" || txForm.type === "withdraw") && selectedPortStats && parseFloat(txForm.amount) > 0
        ? parseFloat(txForm.amount) / selectedPortStats.navPerUnit
        : 0;

    function submitTx(e: React.FormEvent) {
        e.preventDefault();
        if (!txForm.portfolioId) return alert("Please select a portfolio");
        const valField = txForm.type === "nav_update" ? parseFloat(txForm.currentValue) : parseFloat(txForm.amount);
        if (!valField || valField <= 0) return alert("Please enter a valid amount");

        addTransaction({
            portfolioId: txForm.portfolioId,
            type: txForm.type as any,
            amount: parseFloat(txForm.amount) || 0,
            currentValue: parseFloat(txForm.currentValue) || parseFloat(txForm.amount) || 0,
            units: computedUnits > 0 ? computedUnits : undefined,
            note: txForm.note,
            date: txForm.date,
        });
        router.push("/");
    }

    function submitPort(e: React.FormEvent) {
        e.preventDefault();
        if (!newPort.name.trim()) return alert("Please enter a portfolio name");
        addPortfolio(newPort.name.trim(), newPort.type);
        setNewPort({ name: "", type: "th_stock" });
        alert("Portfolio added successfully");
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full">
            <div className="flex gap-4 mb-8">
                <button onClick={() => setTab("tx")} className={`pb-2 font-medium ${tab === "tx" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-primary"}`}>Record Transaction</button>
                <button onClick={() => setTab("port")} className={`pb-2 font-medium ${tab === "port" ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-primary"}`}>Manage Portfolios</button>
            </div>

            {tab === "tx" && (
                <form onSubmit={submitTx} className="bg-bg-subtle border border-border-subtle rounded-2xl p-6 md:p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Select Portfolio</label>
                        <select value={txForm.portfolioId} onChange={e => setTxForm({ ...txForm, portfolioId: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                            <option value="">-- Select Portfolio --</option>
                            {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Transaction Type</label>
                        <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                            <option value="nav_update">📈 Update Current NAV</option>
                            <option value="buy">💰 Buy / Invest</option>
                            <option value="sell">💸 Sell / Redeem</option>
                            <option value="deposit">🏦 Deposit Cash</option>
                            <option value="withdraw">🏧 Withdraw Cash</option>
                        </select>
                    </div>

                    {txForm.type === "nav_update" ? (
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Current Value (NAV Total) ฿</label>
                            <input type="number" step="0.01" value={txForm.currentValue} onChange={e => setTxForm({ ...txForm, currentValue: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="0.00" />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Amount ฿</label>
                            <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="0.00" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Date</label>
                            <input type="date" value={txForm.date} onChange={e => setTxForm({ ...txForm, date: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Note (Optional)</label>
                            <input type="text" value={txForm.note} onChange={e => setTxForm({ ...txForm, note: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="e.g. Bought AAPL" />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-[var(--color-primary-base)] text-bg-main font-medium rounded-xl py-3 hover:opacity-90 transition-opacity">
                        Save Transaction
                    </button>
                </form>
            )}

            {tab === "port" && (
                <div className="space-y-8">
                    <form onSubmit={submitPort} className="bg-bg-subtle border border-border-subtle rounded-2xl p-6 md:p-8 space-y-6">
                        <h3 className="text-xl font-display font-medium text-primary">Add New Portfolio</h3>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Portfolio Name</label>
                            <input type="text" value={newPort.name} onChange={e => setNewPort({ ...newPort, name: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent" placeholder="e.g. US Tech Growth" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2 uppercase tracking-wide">Type</label>
                            <select value={newPort.type} onChange={e => setNewPort({ ...newPort, type: e.target.value as PortfolioType })} className="w-full bg-bg-main border border-border-subtle rounded-xl px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                                {PORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-[var(--color-primary-base)] text-bg-main font-medium rounded-xl py-3 hover:opacity-90 transition-opacity">
                            Add Portfolio
                        </button>
                    </form>

                    <div className="space-y-4">
                        <h3 className="text-xl font-display font-medium text-primary">Existing Portfolios</h3>
                        {portfolios.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-bg-main border border-border-subtle p-4 rounded-xl">
                                <div>
                                    <p className="font-medium text-primary">{p.name}</p>
                                    <p className="text-xs text-secondary">{PORT_TYPES.find(t => t.id === p.type)?.label}</p>
                                </div>
                                <button onClick={() => { if (window.confirm('Delete this portfolio?')) removePortfolio(p.id) }} className="text-danger hover:underline text-sm font-medium">
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
