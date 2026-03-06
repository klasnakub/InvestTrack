"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type PortfolioType = "th_stock" | "foreign_stock" | "fund" | "gold";

export interface Portfolio {
    id: string;
    name: string;
    type: PortfolioType;
    createdAt: number;
}

export interface Asset {
    id: string;
    portfolioId: string;
    symbol: string;
    name: string;
    category: string;
    price: number;
    units: number;
    costBasis: number;
    createdAt: number;
}

export interface Transaction {
    id: string;
    portfolioId: string;
    type: "buy" | "sell" | "nav_update" | "deposit" | "withdraw";
    amount: number;
    units?: number;
    currentValue: number;
    note: string;
    date: string;
    createdAt: number;
}

interface PortfolioContextType {
    portfolios: Portfolio[];
    transactions: Transaction[];
    assets: Asset[];
    addPortfolio: (port: Portfolio) => void;
    removePortfolio: (id: string) => void;
    addTransaction: (tx: Transaction) => void;
    removeTransaction: (id: string) => void;
    addAsset: (asset: Asset) => void;
    updateAsset: (asset: Asset) => void;
    removeAsset: (id: string) => void;
    updateAssetPrice: (id: string, price: number) => void;
    resetData: () => void;
}

const STORAGE_KEYS = { portfolios: "port-portfolios", transactions: "port-transactions", assets: "port-assets" };

const DEFAULT_PORTFOLIOS: Portfolio[] = [
    { id: "p1", name: "Thai Stocks", type: "th_stock", createdAt: Date.now() },
    { id: "p2", name: "Foreign Stocks", type: "foreign_stock", createdAt: Date.now() },
    { id: "p3", name: "Mutual Funds", type: "fund", createdAt: Date.now() },
    { id: "p4", name: "Gold", type: "gold", createdAt: Date.now() },
];

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        try {
            const p = localStorage.getItem(STORAGE_KEYS.portfolios);
            const t = localStorage.getItem(STORAGE_KEYS.transactions);
            const a = localStorage.getItem(STORAGE_KEYS.assets);
            setPortfolios(p ? JSON.parse(p) : DEFAULT_PORTFOLIOS);
            setTransactions(t ? JSON.parse(t) : []);
            setAssets(a ? JSON.parse(a) : []);
        } catch {
            setPortfolios(DEFAULT_PORTFOLIOS);
        }
        setMounted(true);
    }, []);

    const persistPortfolios = useCallback((p: Portfolio[]) => {
        setPortfolios(p);
        localStorage.setItem(STORAGE_KEYS.portfolios, JSON.stringify(p));
    }, []);

    const persistTransactions = useCallback((t: Transaction[]) => {
        setTransactions(t);
        localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(t));
    }, []);

    const persistAssets = useCallback((a: Asset[]) => {
        setAssets(a);
        localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(a));
    }, []);

    const addPortfolio = useCallback((port: Portfolio) => persistPortfolios([...portfolios, port]), [portfolios, persistPortfolios]);
    const removePortfolio = useCallback((id: string) => {
        persistPortfolios(portfolios.filter(p => p.id !== id));
        persistTransactions(transactions.filter(t => t.portfolioId !== id));
    }, [portfolios, transactions, persistPortfolios, persistTransactions]);

    const addTransaction = useCallback((tx: Transaction) => persistTransactions([tx, ...transactions]), [transactions, persistTransactions]);
    const removeTransaction = useCallback((id: string) => persistTransactions(transactions.filter(t => t.id !== id)), [transactions, persistTransactions]);

    const addAsset = useCallback((asset: Asset) => persistAssets([...assets, asset]), [assets, persistAssets]);
    const updateAsset = useCallback((asset: Asset) => persistAssets(assets.map(a => a.id === asset.id ? asset : a)), [assets, persistAssets]);
    const removeAsset = useCallback((id: string) => persistAssets(assets.filter(a => a.id !== id)), [assets, persistAssets]);
    const updateAssetPrice = useCallback((id: string, price: number) => {
        persistAssets(assets.map(a => a.id === id ? { ...a, price } : a));
    }, [assets, persistAssets]);

    const resetData = useCallback(() => {
        if (window.confirm("Are you sure you want to delete all portfolios, assets, and transactions? This cannot be undone.")) {
            localStorage.removeItem(STORAGE_KEYS.portfolios);
            localStorage.removeItem(STORAGE_KEYS.transactions);
            localStorage.removeItem(STORAGE_KEYS.assets);
            window.location.reload();
        }
    }, []);

    if (!mounted) return <div className="min-h-screen flex items-center justify-center text-secondary">Loading...</div>;

    return (
        <PortfolioContext.Provider value={{ portfolios, transactions, assets, addPortfolio, removePortfolio, addTransaction, removeTransaction, addAsset, updateAsset, removeAsset, updateAssetPrice, resetData }}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (!context) throw new Error("usePortfolio must be used within a PortfolioProvider");
    return context;
}
