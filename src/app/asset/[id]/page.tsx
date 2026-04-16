"use client";

import { usePortfolio } from "@/store/PortfolioContext";
import { computePortStats, fmt, fmt4, fmtPct, txIcons, txLabels, uid, today } from "@/lib/utils";
import * as actions from "@/lib/actions";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function AssetDetail() {
    const router = useRouter();
    const params = useParams();
    const resolvedParams = Array.isArray(params.id) ? params.id[0] : params.id;

    const { portfolios, transactions, removeTransaction, addTransaction, assets, addAsset, updateAsset, removeAsset, updatePortfolio } = usePortfolio();

    const [isAddingAsset, setIsAddingAsset] = useState(false);
    const [assetForm, setAssetForm] = useState({ symbol: "", name: "", category: "", currentPrice: "", costPrice: "", units: "", exchangeRate: "" });
    const [currentFxRate, setCurrentFxRate] = useState("35.00");

    // Modal state
    const [txModalParams, setTxModalParams] = useState<{ isOpen: boolean; type: "deposit" | "withdraw" }>({ isOpen: false, type: "deposit" });
    const [txAmount, setTxAmount] = useState("");
    const [txDate, setTxDate] = useState("");
    const [txNote, setTxNote] = useState("");

    const [errorModal, setErrorModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: "", message: "" });

    const [assetTxParams, setAssetTxParams] = useState<{ isOpen: boolean; type: "buy" | "sell"; asset: typeof assets[0] | null }>({ isOpen: false, type: "buy", asset: null });
    const [assetTxUnits, setAssetTxUnits] = useState("");
    const [assetTxPrice, setAssetTxPrice] = useState("");
    const [assetTxExchangeRate, setAssetTxExchangeRate] = useState("");
    const [assetTxDate, setAssetTxDate] = useState("");
    const [priceUpdateParams, setPriceUpdateParams] = useState<{ isOpen: boolean; asset: typeof assets[0] | null }>({ isOpen: false, asset: null });
    const [newPriceInput, setNewPriceInput] = useState("");
    const [priceUpdateDate, setPriceUpdateDate] = useState("");

    const [isUpdatingAll, setIsUpdatingAll] = useState(false);
    const [autoUpdateResults, setAutoUpdateResults] = useState<{ symbol: string; oldPrice: number; newPrice: number; assetId: string }[]>([]);
    const [isAutoUpdateModalOpen, setIsAutoUpdateModalOpen] = useState(false);

    const portfolio = portfolios.find(p => p.id === resolvedParams);

    useEffect(() => {
        setTxDate(today());
        setAssetTxDate(today());
        setPriceUpdateDate(today());
        if (portfolio?.currentExchangeRate) {
            setCurrentFxRate(portfolio.currentExchangeRate.toString());
            setAssetForm(f => ({ ...f, exchangeRate: portfolio.currentExchangeRate!.toString() }));
            setAssetTxExchangeRate(portfolio.currentExchangeRate!.toString());
        } else {
            setAssetForm(f => ({ ...f, exchangeRate: "35.00" }));
            setAssetTxExchangeRate("35.00");
        }
    }, [portfolio]);

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

    const stats = computePortStats(portfolio.id, transactions, assets, portfolio.type === 'foreign_stock' ? parseFloat(currentFxRate) : undefined);
    const portTxs = transactions
        .filter(t => t.portfolioId === portfolio.id && t.type !== "nav_update")
        .sort((a, b) => b.createdAt - a.createdAt);
    const portAssets = assets.filter(a => a.portfolioId === portfolio.id);

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetForm.symbol || !assetForm.currentPrice || !assetForm.costPrice || !assetForm.units) return setErrorModal({ isOpen: true, title: "Missing Fields", message: "Please fill in all required fields." });

        const isForeign = portfolio.type === "foreign_stock";
        const currentPrice = parseFloat(assetForm.currentPrice) || 0;
        const costPrice = parseFloat(assetForm.costPrice) || 0;
        const units = parseFloat(assetForm.units) || 0;
        const exRate = isForeign ? (parseFloat(assetForm.exchangeRate) || 35) : 1;
        
        const totalCostUnits = costPrice * units;
        const totalCost = totalCostUnits * exRate; // In THB
        const symbol = assetForm.symbol.toUpperCase();

        if (totalCost > stats.cashBalance) {
            setErrorModal({
                isOpen: true,
                title: "Insufficient Cash",
                message: `You do not have enough cash to complete this transaction. Available cash: ฿${fmt(stats.cashBalance)}. Required: ฿${fmt(totalCost)}.`
            });
            return;
        }

        const existingAsset = portAssets.find(a => a.symbol === symbol);

        if (existingAsset) {
            // Update existing asset with weighted average
            const newUnits = existingAsset.units + units;
            const newCostBasis = existingAsset.costBasis + totalCost;
            
            await updateAsset({
                ...existingAsset,
                units: newUnits,
                costBasis: newCostBasis,
                price: currentPrice
            });

            await addTransaction({
                portfolioId: portfolio.id,
                assetId: existingAsset.id,
                type: "buy",
                amount: totalCost,
                units: units,
                pricePerUnit: costPrice,
                exchangeRate: isForeign ? exRate : undefined,
                currentValue: stats.currentValue,
                note: `Bought ${fmt(units)} units of ${symbol} ${isForeign ? `@ $${fmt(costPrice)} (FX: ${exRate})` : `(Update existing)`}`,
                date: today(),
            });
        } else {
            // Create new asset
            const newAsset = await addAsset({
                portfolioId: portfolio.id,
                symbol: symbol,
                name: assetForm.name || symbol,
                category: assetForm.category || 'Other',
                price: currentPrice,
                units: units,
                costBasis: totalCost,
            });

            await addTransaction({
                portfolioId: portfolio.id,
                assetId: (newAsset as any)?.id,
                type: "buy",
                amount: totalCost,
                units: units,
                pricePerUnit: costPrice,
                exchangeRate: isForeign ? exRate : undefined,
                currentValue: stats.currentValue,
                note: `Bought ${fmt(units)} units of ${symbol} ${isForeign ? `@ $${fmt(costPrice)} (FX: ${exRate})` : ""}`,
                date: today(),
            });
        }

        setAssetForm({ symbol: "", name: "", category: "", currentPrice: "", costPrice: "", units: "", exchangeRate: isForeign ? currentFxRate : "" });
        setIsAddingAsset(false);
    };

    const handleTxSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(txAmount);
        if (!amount || amount <= 0) return setErrorModal({ isOpen: true, title: "Invalid Amount", message: "Please enter a valid amount greater than 0." });

        let units = 0;
        let currentValue = stats.currentValue;

        if (txModalParams.type === "deposit") {
            units = stats.navPerUnit > 0 ? amount / stats.navPerUnit : 0;
            currentValue += amount;
        } else {
            units = stats.navPerUnit > 0 ? amount / stats.navPerUnit : 0;
            if (amount > stats.cashBalance) {
                setErrorModal({
                    isOpen: true,
                    title: "Insufficient Balance",
                    message: `You are withdrawing more than your available cash balance (฿${fmt(stats.cashBalance)}).`
                });
                return;
            }
            currentValue -= amount;
        }

        addTransaction({
            portfolioId: portfolio.id,
            type: txModalParams.type,
            amount: amount,
            units: units,
            currentValue: currentValue,
            note: txNote,
            date: txDate,
        });

        setTxModalParams({ ...txModalParams, isOpen: false });
        setTxAmount("");
        setTxNote("");
    };

    const handleAssetTxSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const units = parseFloat(assetTxUnits);
        const price = parseFloat(assetTxPrice);
        if (!units || units <= 0 || !price || price <= 0) return setErrorModal({ isOpen: true, title: "Invalid Input", message: "Please enter valid units and price greater than 0." });
        if (!assetTxParams.asset) return;

        const isForeign = portfolio.type === "foreign_stock";
        const exRate = isForeign ? (parseFloat(assetTxExchangeRate) || 35) : 1;
        
        const asset = assetTxParams.asset;
        const totalValue = units * price * exRate; // In THB

        let newUnits = asset.units;
        let newCostBasis = asset.costBasis;

        if (assetTxParams.type === "buy") {
            if (totalValue > stats.cashBalance) {
                setErrorModal({
                    isOpen: true,
                    title: "Insufficient Cash",
                    message: `This will cost ฿${fmt(totalValue)} which is more than your available cash (฿${fmt(stats.cashBalance)}).`
                });
                return;
            }
            newUnits += units;
            newCostBasis += totalValue;

            addTransaction({
                portfolioId: portfolio.id,
                assetId: asset.id,
                type: "buy",
                amount: totalValue,
                units: units,
                pricePerUnit: price,
                exchangeRate: isForeign ? exRate : undefined,
                currentValue: stats.currentValue,
                note: `Bought ${fmt(units)} units of ${asset.symbol} @ ${isForeign ? '$' : '฿'}${fmt(price)} ${isForeign ? `(FX: ${exRate})` : ""}`,
                date: assetTxDate,
            });
            updateAsset({ ...asset, units: newUnits, costBasis: newCostBasis, price });
        } else {
            if (units > asset.units) {
                setErrorModal({ isOpen: true, title: "Invalid Amount", message: "Cannot sell more units than you own." });
                return;
            }

            const costBasisReduction = (units / asset.units) * asset.costBasis;
            newUnits -= units;
            newCostBasis -= costBasisReduction;

            addTransaction({
                portfolioId: portfolio.id,
                assetId: asset.id,
                type: "sell",
                amount: totalValue,
                units: units,
                pricePerUnit: price,
                exchangeRate: isForeign ? exRate : undefined,
                currentValue: stats.currentValue,
                note: `Sold ${fmt(units)} units of ${asset.symbol} @ ${isForeign ? '$' : '฿'}${fmt(price)} ${isForeign ? `(FX: ${exRate})` : ""}`,
                date: assetTxDate,
            });

            if (newUnits <= 0) {
                removeAsset(asset.id);
            } else {
                updateAsset({ ...asset, units: newUnits, costBasis: newCostBasis, price });
            }
        }

        setAssetTxParams({ ...assetTxParams, isOpen: false });
        setAssetTxUnits("");
        setAssetTxPrice("");
        setAssetTxExchangeRate(isForeign ? currentFxRate : "");
    };

    const handlePriceUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const price = parseFloat(newPriceInput);
        if (!price || price <= 0) return setErrorModal({ isOpen: true, title: "Invalid Price", message: "Please enter a valid price." });
        if (!priceUpdateParams.asset) return;

        const asset = priceUpdateParams.asset;
        const diffValue = (price - asset.price) * asset.units;
        const newTotalValue = stats.currentValue + diffValue;

        updateAsset({ ...asset, price });
        addTransaction({
            portfolioId: portfolio.id,
            type: "nav_update",
            amount: 0,
            currentValue: newTotalValue,
            note: `Updated price of ${asset.symbol} to ฿${fmt(price)}`,
            date: priceUpdateDate,
        });

        setPriceUpdateParams({ isOpen: false, asset: null });
        setNewPriceInput("");
    };

    const handleAutoUpdatePrices = async () => {
        if (!portfolio) return;
        setIsUpdatingAll(true);
        const results: { symbol: string; oldPrice: number; newPrice: number; assetId: string }[] = [];
        let errorOccurred = false;

        try {
            if (portfolio.type === "th_stock" || portfolio.type === "foreign_stock") {
                for (const asset of portAssets) {
                    // Small delay to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 200));

                    let searchSymbol = asset.symbol;
                    if (portfolio.type === "th_stock" && !searchSymbol.toUpperCase().endsWith(".BK")) {
                        searchSymbol = searchSymbol + ".BK";
                    }
                    
                    const res = await actions.fetchStockPrice(searchSymbol);
                    if (res.success && res.price) {
                        results.push({ symbol: asset.symbol, oldPrice: asset.price, newPrice: res.price, assetId: asset.id });
                    } else {
                        errorOccurred = true;
                    }
                }
            } else if (portfolio.type === "gold") {
                const res = await actions.fetchGoldPrice();
                if (res.success && res.sellPrice) {
                    for (const asset of portAssets) {
                        results.push({ symbol: asset.symbol, oldPrice: asset.price, newPrice: res.sellPrice, assetId: asset.id });
                    }
                } else {
                    errorOccurred = true;
                }
            }

            if (results.length > 0) {
                setAutoUpdateResults(results);
                setIsAutoUpdateModalOpen(true);
            } else if (errorOccurred) {
                setErrorModal({ isOpen: true, title: "Update Failed", message: "Failed to fetch prices for assets. Please check your symbols and connection." });
            }
        } catch (err) {
            setErrorModal({ isOpen: true, title: "Error", message: "An unexpected error occurred during the update." });
        } finally {
            setIsUpdatingAll(false);
        }
    };

    const confirmAutoUpdate = async () => {
        const newTotalValueBase = stats.currentValue;
        let cumulativeDiff = 0;

        for (const item of autoUpdateResults) {
            const asset = assets.find(a => a.id === item.assetId);
            if (asset) {
                const isForeign = portfolio?.type === "foreign_stock";
                const fx = isForeign ? (portfolio.currentExchangeRate || 35) : 1;
                const diffValue = (item.newPrice - item.oldPrice) * asset.units * fx;
                cumulativeDiff += diffValue;

                await actions.updateAssetPriceDb(item.assetId, item.newPrice);
            }
        }

        const finalTotalValue = newTotalValueBase + cumulativeDiff;
        
        // Add one summary transaction for the update
        await actions.addTransactionDb({
            portfolioId: portfolio!.id,
            type: "nav_update",
            amount: 0,
            currentValue: finalTotalValue,
            note: `Auto-updated prices for ${autoUpdateResults.length} assets`,
            date: today(),
        });

        // Refresh Data
        window.location.reload(); 
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
                            {portfolio.type === "foreign_stock" && (
                                <span className="text-secondary text-xl md:text-2xl ml-3">
                                    (${fmt(stats.currentValue / (parseFloat(currentFxRate) || 35))})
                                </span>
                            )}
                        </p>
                        <div className="flex gap-4 mt-3 text-sm flex-wrap justify-end">
                            <div className="bg-bg-subtle px-3 py-1.5 rounded border border-border-subtle text-secondary">
                                Units: <span className="text-primary font-medium">{fmt(stats.totalUnits)}</span>
                            </div>
                            <div className="bg-bg-subtle px-3 py-1.5 rounded border border-border-subtle text-secondary">
                                NAV: <span className="text-primary font-medium">฿{fmt4(stats.navPerUnit)}
                                {portfolio.type === "foreign_stock" && (
                                    <span className="ml-1 text-[11px] opacity-70">
                                        (${fmt4(stats.navPerUnit / (parseFloat(currentFxRate) || 35))})
                                    </span>
                                )}
                                </span>
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
                        <div className="flex items-center gap-6">
                            <h2 className="text-xl font-display font-medium text-primary">Holdings</h2>
                            {portfolio.type === "foreign_stock" && (
                                <div className="flex items-center gap-3 bg-bg-subtle px-3 py-1.5 rounded-lg border border-border-subtle">
                                    <span className="text-xs font-semibold text-secondary uppercase tracking-widest">USD/THB</span>
                                    <div className="flex items-center gap-1.5">
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            value={currentFxRate} 
                                            onChange={(e) => {
                                                setCurrentFxRate(e.target.value);
                                            }}
                                            onBlur={() => {
                                                const rate = parseFloat(currentFxRate);
                                                if (rate > 0) {
                                                    updatePortfolio({ ...portfolio, currentExchangeRate: rate });
                                                }
                                            }}
                                            className="w-16 bg-bg-main border border-border-subtle rounded px-1.5 py-0.5 text-sm text-primary font-medium focus:outline-none focus:ring-1 focus:ring-accent"
                                        />
                                        <span className="text-xs text-secondary italic">Now</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            { (portfolio.type === "th_stock" || portfolio.type === "foreign_stock" || portfolio.type === "gold") && (
                                <button 
                                    onClick={handleAutoUpdatePrices} 
                                    disabled={isUpdatingAll || portAssets.length === 0}
                                    className="flex items-center gap-2 text-sm font-medium text-primary bg-bg-subtle border border-border-subtle px-3 py-1.5 rounded-md hover:bg-bg-main transition-colors disabled:opacity-50"
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${isUpdatingAll ? 'animate-spin' : ''}`}>
                                        {isUpdatingAll ? 'sync' : 'magic_button'}
                                    </span>
                                    {isUpdatingAll ? "Updating..." : "Auto Update"}
                                </button>
                            )}
                            <button onClick={() => setIsAddingAsset(!isAddingAsset)} className="text-sm font-medium text-bg-main bg-primary px-3 py-1.5 rounded-md hover:opacity-80">
                                {isAddingAsset ? "Cancel" : "+ Add Asset"}
                            </button>
                        </div>
                    </div>

                    {isAddingAsset && (
                        <form onSubmit={handleAddAsset} className="bg-bg-subtle border border-border-subtle p-6 rounded-xl mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Symbol *</label><input required value={assetForm.symbol} onChange={e => setAssetForm({ ...assetForm, symbol: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="e.g. AAPL" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Name</label><input value={assetForm.name} onChange={e => setAssetForm({ ...assetForm, name: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="e.g. Apple Inc." /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Category</label><input value={assetForm.category} onChange={e => setAssetForm({ ...assetForm, category: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="e.g. Technology" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Units *</label><input required type="number" step="0.0001" value={assetForm.units} onChange={e => setAssetForm({ ...assetForm, units: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="0.0000" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Cost Price ({portfolio.type === 'foreign_stock' ? '$' : '฿'}) *</label><input required type="number" step="0.0001" value={assetForm.costPrice} onChange={e => setAssetForm({ ...assetForm, costPrice: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="0.0000" /></div>
                            <div><label className="text-xs text-secondary uppercase mb-1 block">Current Price ({portfolio.type === 'foreign_stock' ? '$' : '฿'}) *</label><input required type="number" step="0.0001" value={assetForm.currentPrice} onChange={e => setAssetForm({ ...assetForm, currentPrice: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="0.0000" /></div>
                            {portfolio.type === "foreign_stock" && (
                                <div><label className="text-xs text-secondary uppercase mb-1 block">FX Rate (1$ = ฿) *</label><input required type="number" step="0.01" value={assetForm.exchangeRate} onChange={e => setAssetForm({ ...assetForm, exchangeRate: e.target.value })} className="w-full bg-bg-main border border-border-subtle rounded-md px-3 py-2 text-sm" placeholder="35.00" /></div>
                            )}
                            <div className={`md:col-span-2 ${portfolio.type === 'foreign_stock' ? 'lg:col-span-1' : 'lg:col-span-1'} flex justify-end items-end`}><button type="submit" className="w-full bg-accent text-white px-4 py-2 rounded-md text-sm font-medium h-[38px]">Save Asset</button></div>
                        </form>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="border-b border-border-subtle">
                                    <th className="py-4 pr-4 pl-2 text-xs font-semibold tracking-widest text-secondary uppercase">Asset</th>
                                    <th className="py-2 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right leading-tight">Price In {portfolio.type === 'foreign_stock' ? 'USD' : 'THB'}<br /><span className="text-[10px] opacity-70 font-medium normal-case">Cost / Current</span></th>
                                    <th className="py-4 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right">Units</th>
                                    <th className="py-4 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right">Value (THB)</th>
                                    <th className="py-4 px-4 text-xs font-semibold tracking-widest text-secondary uppercase text-right">Return (THB)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle text-sm md:text-base">
                                {portAssets.map(a => {
                                    const isForeign = portfolio.type === "foreign_stock";
                                    const fx = isForeign ? parseFloat(currentFxRate) : 1;
                                    const value = a.price * a.units * fx;
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
                                            <td className="py-4 px-4 text-right">
                                                <div className="text-xs text-secondary mb-0.5" title="Average Cost">{isForeign ? '$' : '฿'}{fmt4(a.costBasis / (a.units || 1) / fx)}</div>
                                                <div className="font-light text-primary flex justify-end items-center gap-1.5 group/price" title="Current Price">
                                                    <button onClick={() => {
                                                        setPriceUpdateParams({ isOpen: true, asset: a });
                                                        setNewPriceInput(a.price.toString());
                                                    }} className="material-symbols-outlined text-[14px] opacity-0 group-hover/price:opacity-100 text-secondary hover:text-accent transition-opacity cursor-pointer">
                                                        edit
                                                    </button>
                                                    {isForeign ? '$' : '฿'}{fmt4(a.price)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right font-light text-primary">{fmt(a.units)}</td>
                                            <td className="py-4 px-4 text-right font-medium text-primary">฿{fmt(value)}</td>
                                            <td className="py-4 px-4 text-right">
                                                <span className={`font-medium ${isPos ? "text-accent" : "text-danger"}`}>
                                                    {fmtPct(gainPct)}
                                                    <br />
                                                    <span className="text-xs opacity-70">({isPos ? "+" : "-"}฿{fmt(Math.abs(gain))})</span>
                                                </span>
                                            </td>
                                            <td className="py-4 pl-2 text-right">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => {
                                                        setAssetTxParams({ isOpen: true, type: "buy", asset: a });
                                                        setAssetTxPrice(a.price.toString());
                                                    }} className="w-6 h-6 rounded bg-bg-main border border-border-subtle hover:bg-bg-subtle text-accent flex items-center justify-center font-medium" title="Buy more">
                                                        +
                                                    </button>
                                                    <button onClick={() => {
                                                        setAssetTxParams({ isOpen: true, type: "sell", asset: a });
                                                        setAssetTxPrice(a.price.toString());
                                                    }} className="w-6 h-6 rounded bg-bg-main border border-border-subtle hover:bg-bg-subtle text-danger flex items-center justify-center font-medium" title="Sell units">
                                                        -
                                                    </button>
                                                </div>
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
                            const asset = assets.find(a => a.id === t.assetId);
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
                                    <p className="text-primary font-medium">
                                        {txLabels[t.type as keyof typeof txLabels]}
                                        {asset && <span className="ml-2 text-accent">({asset.symbol})</span>}
                                    </p>
                                    <div className="mt-2 text-sm">
                                      <p className="text-primary font-medium">{isNav ? "" : isPos ? "+" : "-"}฿{fmt(amountField)}</p>
                                      {t.pricePerUnit && <p className="text-[11px] text-secondary mt-0.5">@ {portfolio.type === 'foreign_stock' ? '$' : '฿'}{fmt4(t.pricePerUnit)} per unit</p>}
                                      {t.exchangeRate && <p className="text-[10px] text-accent mt-0.5 italic">FX: {t.exchangeRate}</p>}
                                    </div>
                                    {t.units ? <p className="text-[11px] text-accent mt-0.5">{isPos ? '+' : '-'}{fmt(t.units)} Units</p> : null}
                                    {t.note && <p className="text-secondary text-[10px] mt-2 italic px-2 py-1 bg-bg-subtle border-l-2 border-border-subtle">"{t.note}"</p>}
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
                                        step="0.0001"
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
            {/* Custom Modal for Buy/Sell Asset */}
            {assetTxParams.isOpen && assetTxParams.asset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setAssetTxParams({ ...assetTxParams, isOpen: false })}></div>
                    <div className="relative w-full max-w-md bg-bg-main border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${assetTxParams.type === 'buy' ? 'bg-[rgba(16,185,129,0.1)] text-accent' : 'bg-[rgba(239,68,68,0.1)] text-danger'}`}>
                                    <span className="material-symbols-outlined">
                                        {assetTxParams.type === 'buy' ? 'add_shopping_cart' : 'shopping_cart_checkout'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-primary capitalize">{assetTxParams.type} {assetTxParams.asset.symbol}</h3>
                                    <p className="text-xs text-secondary mt-0.5">Current Price: ฿{fmt(assetTxParams.asset.price)}</p>
                                </div>
                            </div>
                            <button onClick={() => setAssetTxParams({ ...assetTxParams, isOpen: false })} className="text-secondary hover:text-primary transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAssetTxSubmit} className="p-6 space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Units</label>
                                    <input type="number" required step="0.0001" min="0.0001" value={assetTxUnits} onChange={e => setAssetTxUnits(e.target.value)} className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-3 text-lg font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow" placeholder="0.0000" autoFocus />
                                    {assetTxParams.type === 'sell' && (
                                        <p className="text-xs text-secondary mt-2">Max: {fmt(assetTxParams.asset.units)} units</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Unit Price ({portfolio.type === 'foreign_stock' ? '$' : '฿'})</label>
                                    <input type="number" required step="0.0001" min="0.0001" value={assetTxPrice} onChange={e => setAssetTxPrice(e.target.value)} className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-3 text-lg font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow" placeholder="0.0000" />
                                </div>
                                {portfolio.type === "foreign_stock" && (
                                    <div>
                                        <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Exchange Rate</label>
                                        <input type="number" required step="0.01" value={assetTxExchangeRate} onChange={e => setAssetTxExchangeRate(e.target.value)} className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-3 text-lg font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow" placeholder="35.00" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-secondary">Estimated Total:</span>
                                    <span className="text-primary font-medium">฿{fmt((parseFloat(assetTxUnits) || 0) * (parseFloat(assetTxPrice) || 0) * (portfolio.type === 'foreign_stock' ? (parseFloat(assetTxExchangeRate) || 35) : 1))}</span>
                                </div>
                                {assetTxParams.type === 'buy' && (
                                    <p className="text-xs text-secondary flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                                        Available Cash: ฿{fmt(stats.cashBalance)}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Date</label>
                                    <input type="date" required value={assetTxDate} onChange={e => setAssetTxDate(e.target.value)} className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow" />
                                </div>
                            </div>

                            <div className="pt-2">
                                <button type="submit" className={`w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity ${assetTxParams.type === 'buy' ? 'bg-accent hover:bg-opacity-90' : 'bg-danger hover:bg-opacity-90'}`}>
                                    Confirm {assetTxParams.type}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Modal for Price Update */}
            {priceUpdateParams.isOpen && priceUpdateParams.asset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setPriceUpdateParams({ ...priceUpdateParams, isOpen: false })}></div>
                    <div className="relative w-full max-w-md bg-bg-main border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(59,130,246,0.1)] text-blue-500">
                                    <span className="material-symbols-outlined">sync</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-primary">Update Price</h3>
                                    <p className="text-xs text-secondary mt-0.5">{priceUpdateParams.asset.symbol}</p>
                                </div>
                            </div>
                            <button onClick={() => setPriceUpdateParams({ ...priceUpdateParams, isOpen: false })} className="text-secondary hover:text-primary transition-colors cursor-pointer">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handlePriceUpdateSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">New Current Price ({portfolio.type === 'foreign_stock' ? '$' : '฿'})</label>
                                <input type="number" required step="0.0001" min="0.0001" value={newPriceInput} onChange={e => setNewPriceInput(e.target.value)} className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-3 text-lg font-medium text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow" placeholder="0.0000" autoFocus />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-secondary uppercase tracking-widest mb-2 block">Date Recorded</label>
                                <input type="date" required value={priceUpdateDate} onChange={e => setPriceUpdateDate(e.target.value)} className="w-full bg-bg-subtle border border-border-subtle rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent transition-shadow" />
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity bg-accent hover:bg-opacity-90">
                                    Save Price
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Modal for Errors/Warnings */}
            {errorModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setErrorModal({ ...errorModal, isOpen: false })}></div>
                    <div className="relative w-full max-w-sm bg-bg-main border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-border-subtle flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[rgba(239,68,68,0.1)] text-danger">
                                <span className="material-symbols-outlined text-xl">error</span>
                            </div>
                            <h3 className="text-lg font-medium text-primary text-danger">{errorModal.title}</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-secondary text-sm leading-relaxed">{errorModal.message}</p>
                            <button onClick={() => setErrorModal({ ...errorModal, isOpen: false })} className="mt-6 w-full py-2.5 rounded-xl text-sm font-medium bg-bg-subtle text-primary border border-border-subtle hover:bg-bg-subtle/80 transition-colors">
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto Update Confirmation Modal */}
            {isAutoUpdateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsAutoUpdateModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-bg-main border border-border-subtle rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-border-subtle flex items-center justify-between bg-bg-subtle/30">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-inner">
                                    <span className="material-symbols-outlined text-2xl">update</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-display font-medium text-primary">Confirm Price Update</h3>
                                    <p className="text-xs text-secondary mt-0.5 tracking-wide uppercase">Review market data before saving</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAutoUpdateModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-bg-subtle flex items-center justify-center text-secondary transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-4">
                                {autoUpdateResults.map((item, idx) => {
                                    const diff = item.newPrice - item.oldPrice;
                                    const diffPct = (diff / item.oldPrice) * 100;
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-bg-subtle/50 border border-border-subtle hover:border-accent/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-bg-main border border-border-subtle flex items-center justify-center font-bold text-accent text-xs">
                                                    {item.symbol.slice(0, 3)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-primary">{item.symbol}</p>
                                                    <p className="text-[10px] text-secondary uppercase tracking-tighter">Market Ticker</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className="text-xs text-secondary line-through opacity-50">{fmt(item.oldPrice)}</span>
                                                    <span className="material-symbols-outlined text-xs text-secondary opacity-30">arrow_forward</span>
                                                    <span className="text-lg font-display font-medium text-primary">{fmt(item.newPrice)}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${diff >= 0 ? 'text-accent bg-accent/10' : 'text-danger bg-danger/10'}`}>
                                                    {diff >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-bg-subtle/30 border-t border-border-subtle flex gap-4">
                            <button 
                                onClick={() => setIsAutoUpdateModalOpen(false)}
                                className="flex-1 py-3.5 rounded-2xl text-sm font-medium text-secondary hover:bg-bg-subtle transition-colors border border-border-subtle"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmAutoUpdate}
                                className="flex-1 py-3.5 rounded-2xl text-sm font-medium text-white bg-accent hover:opacity-90 shadow-lg shadow-accent/20 transition-all active:scale-[0.98]"
                            >
                                Save All Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
