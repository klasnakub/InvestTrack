"use client";

import { usePortfolio } from "@/store/PortfolioContext";
import { computePortStats, fmt, fmtPct, txIcons, txLabels, uid, today } from "@/lib/utils";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AssetDetail() {
    const router = useRouter();
    const params = useParams();
    const resolvedParams = Array.isArray(params.id) ? params.id[0] : params.id;

    const { portfolios, transactions, removeTransaction, addTransaction, assets, addAsset, removeAsset, updateAssetPrice } = usePortfolio();

    const [isAddingAsset, setIsAddingAsset] = useState(false);
    const [assetForm, setAssetForm] = useState({ symbol: "", name: "", category: "", price: "", units: "", costBasis: "" });

    // Modal state
    const [txModalParams, setTxModalParams] = useState<{ isOpen: boolean; type: "deposit" | "withdraw" }>({ isOpen: false, type: "deposit" });
    const [txAmount, setTxAmount] = useState("");
    const [txDate, setTxDate] = useState("");
    const [txNote, setTxNote] = useState("");

    useEffect(() => {
        setTxDate(today());
    }, []);

    const portfolio = portfolios.find(p => p.id === resolvedParams);
    if (!portfolio) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-display font-medium text-primary">Portfolio Not Found</h2>
                    <button onClick={() => router.push("/")} className="mt-4 text-accent hover:underline">Back to Dashboard</button>
                </div>
            </div>
        );
    }

    const stats = computePortStats(portfolio.id, transactions, assets);
    const portTxs = transactions.filter(t => t.portfolioId === portfolio.id).sort((a, b) => b.createdAt - a.createdAt);
    const portAssets = assets.filter(a => a.portfolioId === portfolio.id);

    const handleAddAsset = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetForm.symbol || !assetForm.price || !assetForm.units) return alert('Please fill in required fields');

        addAsset({
            id: uid(),
            portfolioId: portfolio.id,
            symbol: assetForm.symbol.toUpperCase(),
            name: assetForm.name || assetForm.symbol,
            category: assetForm.category || 'Other',
            price: parseFloat(assetForm.price) || 0,
            units: parseFloat(assetForm.units) || 0,
            costBasis: parseFloat(assetForm.costBasis) || (parseFloat(assetForm.price) * parseFloat(assetForm.units)),
            createdAt: Date.now()
        });
        setAssetForm({ symbol: "", name: "", category: "", price: "", units: "", costBasis: "" });
        setIsAddingAsset(false);
    };

    const handleTxSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(txAmount);
        if (!amount || amount <= 0) return alert("Please enter a valid amount");

        let units = 0;
        let currentValue = stats.currentValue;

        if (txModalParams.type === "deposit") {
            units = stats.navPerUnit > 0 ? amount / stats.navPerUnit : 0;
            currentValue += amount;
        } else {
            units = stats.navPerUnit > 0 ? amount / stats.navPerUnit : 0;
            if (amount > stats.cashBalance) {
                if (!window.confirm(`You are withdrawing more cash than your available balance (฿${fmt(stats.cashBalance)}). Proceed anyway?`)) {
                    return;
                }
            }
            currentValue -= amount;
        }

        addTransaction({
            id: uid(),
            portfolioId: portfolio.id,
            type: txModalParams.type,
            amount: amount,
            units: units,
            currentValue: currentValue,
            note: txNote,
            date: txDate,
            createdAt: Date.now()
        });

        setTxModalParams({ ...txModalParams, isOpen: false });
        setTxAmount("");
        setTxNote("");
    };

    return (
        <div className="flex-1 flex justify-center px-6 md:px-12 py-8">
            <div className="w-full max-w-6xl flex flex-col gap-12">
                <Link href="/" className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity cursor-pointer w-fit">
                    <span className="material-symbols-outlined text-2xl text-secondary">arrow_back</span>
                    <span className="text-sm font-medium tracking-wide text-secondary">Back to Dashboard</span>
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 border-b border-border-subtle pb-12">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-primary text-5xl md:text-6xl font-light tracking-tight">{portfolio.name}</h1>
                        <p className="text-secondary text-sm font-medium tracking-widest uppercase mt-2">Asset Class Portfolio</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <p className="text-primary text-4xl md:text-5xl font-light">
                            ฿{fmt(Math.floor(stats.currentValue))}
                            <span className="text-secondary text-2xl">.{Math.floor((stats.currentValue % 1) * 100).toString().padStart(2, '0')}</span>
                        </p>
                        <div className="flex gap-4 mt-3 text-sm flex-wrap justify-end">
                            <div className="bg-bg-subtle px-3 py-1.5 rounded border border-border-subtle text-secondary">
                                Units: <span className="text-primary font-medium">{fmt(stats.totalUnits)}</span>
                            </div>
                            <div className="bg-bg-subtle px-3 py-1.5 rounded border border-border-subtle text-secondary">
                                NAV: <span className="text-primary font-medium">฿{fmt(stats.navPerUnit)}</span>
                            </div>
                            <div className="bg-bg-subtle px-3 py-1.5 rounded border border-border-subtle text-secondary">
                                Cash: <span className="text-primary font-medium">฿{fmt(stats.cashBalance)}</span>
                            </div>
                        </div>
                        {stats.costBasis > 0 && (
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`text-sm font-medium px-2 py-0.5 rounded ${stats.gain >= 0 ? "text-accent bg-[rgba(16,185,129,0.1)]" : "text-danger bg-[rgba(239,68,68,0.1)]"}`}>
                                    {stats.gain >= 0 ? "+" : "-"}฿{fmt(Math.abs(stats.gain))} ({fmtPct(stats.gainPct)})
                                </span>
                            </div>
                        )}
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setTxModalParams({ isOpen: true, type: "deposit" })} className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm shadow-[rgba(16,185,129,0.2)]">
                                <span className="material-symbols-outlined text-lg">add_circle</span> Deposit
                            </button>
                            <button onClick={() => setTxModalParams({ isOpen: true, type: "withdraw" })} className="flex items-center gap-2 px-6 py-2.5 bg-bg-main border border-border-subtle text-primary rounded-lg text-sm font-medium hover:bg-bg-subtle transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-lg">remove_circle</span> Withdraw
                            </button>
                        </div>
                    </div>
                </div>

                {/* Asset Class Portfolio Table */}
                <div className="w-full mt-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-display font-medium text-primary">Holdings</h2>
                        <button onClick={() => setIsAddingAsset(!isAddingAsset)} className="text-sm font-medium text-bg-main bg-primary px-3 py-1.5 rounded-md hover:opacity-80">
                            {isAddingAsset ? "Cancel" : "+ Add Asset"}
                        </button>
                    </div>

                    {isAddingAsset && (
                        <form onSubmit={handleAddAsset} className="bg-bg-subtle border border-border-subtle p-6 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Symbol *</label><input required value={assetForm.symbol} onChange={e => setAssetForm({ ...assetForm, symbol: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="e.g. PTT" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Name</label><input value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="e.g. PTT PCL" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Category</label><input value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="e.g. Energy" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Current Price *</label><input required type="number" step="0.01" value={assetForm.price} onChange={e => setAssetForm({ ...assetForm, price: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="0.00" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Units *</label><input required type="number" step="0.01" value={assetForm.units} onChange={e => setAssetForm({ ...assetForm, units: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="0.00" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Total Cost Basis</label><input type="number" step="0.01" value={assetForm.costBasis} onChange={e => setAssetForm({ ...assetForm, costBasis: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="Leave blank to auto-calc" /></div>
                            <div className="md:col-span-3 flex justify-end mt-2"><button type="submit" className="bg-accent text-white px-4 py-2 rounded-md text-sm font-medium">Save Asset</button></div>
                        </form>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="border-b border-border-subtle">
                                    <th className="py-4 pr-4 pl-2 text-xs font-semibold tracking-widest text-secondary uppercase">Asset</th>
                                    <th className="py-4 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right">Price</th>
                                    <th className="py-4 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right">Units</th>
                                    <th className="py-4 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right">Value</th>
                                    <th className="py-4 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right">Return</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle text-sm md:text-base">
                                {portAssets.map(a => {
                                    const value = a.price * a.units;
                                    const gain = value - a.costBasis;
                                    const gainPct = a.costBasis > 0 ? (gain / a.costBasis) * 100 : 0;
                                    const isPos = gain >= 0;

                                    return (
                                        <tr key={a.id} className="group hover:bg-bg-subtle transition-colors">
                                            <td className="py-4 pr-4 pl-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-8 rounded-full bg-[rgba(59,130,246,0.1)] text-blue-500 flex items-center justify-center font-bold text-[10px] tracking-wider">{a.symbol.slice(0, 3)}</div>
                                                    <div>
                                                        <p className="text-primary font-medium text-lg">{a.name}</p>
                                                        <p className="text-secondary text-xs font-light">{a.category}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right font-light text-primary">฿{fmt(a.price)}</td>
                                            <td className="py-4 px-4 text-right font-light text-primary">{fmt(a.units)}</td>
                                            <td className="py-4 px-4 text-right font-medium text-primary">฿{fmt(value)}</td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-medium ${isPos ? "text-accent" : "text-danger"}`}>
                                                    {isPos ? "+" : ""}{fmtPct(gainPct)}
                                                    <br />
                                                    <span className="text-xs opacity-70">({isPos ? "+" : "-"}฿{fmt(Math.abs(gain))})</span>
                                                </span>
                                            </td>
                                            <td className="py-4 pl-2 text-right">
                                                <button onClick={() => { if (window.confirm('Remove asset?')) removeAsset(a.id) }} className="opacity-0 group-hover:opacity-100 text-danger text-xs hover:underline">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {portAssets.length === 0 && !isAddingAsset && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-secondary text-sm">No assets added to this portfolio yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-4 pt-12 border-t border-border-subtle">
                    <div className="flex items-center gap-3 w-fit text-primary font-medium tracking-wide uppercase mb-8">
                        <span className="material-symbols-outlined text-xl">history_edu</span>
                        <span>Transaction History</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {portTxs.map(t => {
                            const isPos = !["sell", "withdraw"].includes(t.type);
                            const isNav = t.type === "nav_update";
                            const iconColor = isNav ? "text-primary" : isPos ? "text-accent" : "text-danger";
                            const amountField = isNav ? t.currentValue : t.amount;

                            return (
                                <div key={t.id} className="p-6 bg-bg-main rounded-none border border-border-subtle relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`material-symbols-outlined ${iconColor} text-xl`}>{txIcons[t.type as keyof typeof txIcons]}</span>
                                        <span className="text-xs text-secondary">{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                    </div>
                                    <p className="text-primary font-medium">{txLabels[t.type as keyof typeof txLabels]}</p>
                                    <p className="text-secondary text-sm mt-1">{isNav ? "" : isPos ? "+" : "-"}฿{fmt(amountField)}</p>
                                    {t.units ? <p className="text-xs text-accent mt-0.5">{t.type === 'deposit' ? '+' : '-'}{fmt(t.units)} Units</p> : null}
                                    {t.note && <p className="text-secondary text-xs mt-2 italic">"{t.note}"</p>}

                                    <button
                                        onClick={() => { if (window.confirm('Delete transaction?')) removeTransaction(t.id) }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-danger text-xs hover:underline"
                                    >
                                        Delete
                                    </button>
                                </div>
                            );
                        })}

                        {portTxs.length === 0 && (
                            <div className="col-span-12 text-secondary text-sm">No transactions found for this portfolio.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Modal for Deposit/Withdraw */}
            {txModalParams.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setTxModalParams({ ...txModalParams, isOpen: false })}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative w-full max-w-md bg-bg-main border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txModalParams.type === 'deposit' ? 'bg-[rgba(16,185,129,0.1)] text-accent' : 'bg-[rgba(239,68,68,0.1)] text-danger'}`}>
                                    <span className="material-symbols-outlined">
                                        {txModalParams.type === 'deposit' ? 'account_balance' : 'money_off'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-primary capitalize">{txModalParams.type} Funds</h3>
                                    <p className="text-xs text-secondary mt-0.5">{portfolio.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setTxModalParams({ ...txModalParams, isOpen: false })}
                                className="text-secondary hover:text-primary transition-colors cursor-pointer"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleTxSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Amount (฿)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-xl font-light">฿</span>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        min="0.01"
                                        value={txAmount}
                                        onChange={e => setTxAmount(e.target.value)}
                                        className="w-full bg-bg-subtle border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-lg font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                                {txModalParams.type === 'deposit' ? (
                                    <p className="text-xs text-secondary mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">info</span>
                                        Est. Units: ~{txAmount ? fmt(parseFloat(txAmount) / stats.navPerUnit) : '0.00'}
                                    </p>
                                ) : (
                                    <p className="text-xs text-secondary mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                                        Available Cash: ฿{fmt(stats.cashBalance)}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={txDate}
                                        onChange={e => setTxDate(e.target.value)}
                                        className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Note (Optional)</label>
                                    <input
                                        type="text"
                                        value={txNote}
                                        onChange={e => setTxNote(e.target.value)}
                                        className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                                        placeholder="E.g. Monthly top-up"
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className={`w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity ${txModalParams.type === 'deposit' ? 'bg-accent hover:bg-opacity-90' : 'bg-danger hover:bg-opacity-90'}`}
                                >
                                    Confirm {txModalParams.type}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
