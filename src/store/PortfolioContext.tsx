"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as actions from "@/lib/actions";

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
    assetId?: string;
    type: "buy" | "sell" | "nav_update" | "deposit" | "withdraw";
    amount: number;
    units?: number;
    pricePerUnit?: number;
    currentValue: number;
    note: string;
    date: string;
    createdAt: number;
}

interface PortfolioContextType {
    portfolios: Portfolio[];
    transactions: Transaction[];
    assets: Asset[];
    addPortfolio: (name: string, type: PortfolioType) => Promise<void>;
    removePortfolio: (id: string) => Promise<void>;
    addTransaction: (tx: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
    removeTransaction: (id: string) => Promise<void>;
    addAsset: (asset: Omit<Asset, "id" | "createdAt">) => Promise<Asset>;
    updateAsset: (asset: Asset) => Promise<void>;
    removeAsset: (id: string) => Promise<void>;
    updateAssetPrice: (id: string, price: number) => Promise<void>;
    resetData: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const data = await actions.getInitialData();
            setPortfolios(data.portfolios);
            setTransactions(data.transactions);
            setAssets(data.assets);
            setMounted(true);
        };
        loadData();
    }, []);

    const addPortfolio = useCallback(async (name: string, type: PortfolioType) => {
        const newPort = await actions.addPortfolioDb(name, type);
        setPortfolios(prev => [...prev, newPort]);
    }, []);

    const removePortfolio = useCallback(async (id: string) => {
        await actions.removePortfolioDb(id);
        setPortfolios(prev => prev.filter(p => p.id !== id));
        setTransactions(prev => prev.filter(t => t.portfolioId !== id));
        setAssets(prev => prev.filter(a => a.portfolioId !== id));
    }, []);

    const addTransaction = useCallback(async (tx: Omit<Transaction, "id" | "createdAt">) => {
        const newTx = await actions.addTransactionDb(tx);
        setTransactions(prev => [newTx, ...prev]);
    }, []);

    const removeTransaction = useCallback(async (id: string) => {
        await actions.removeTransactionDb(id);
        setTransactions(prev => prev.filter(t => t.id !== id));
    }, []);

    const addAsset = useCallback(async (asset: Omit<Asset, "id" | "createdAt">) => {
        const newAsset = await actions.addAssetDb(asset);
        setAssets(prev => [...prev, newAsset]);
        return newAsset;
    }, []);

    const updateAsset = useCallback(async (asset: Asset) => {
        await actions.updateAssetDb(asset);
        setAssets(prev => prev.map(a => a.id === asset.id ? asset : a));
    }, []);

    const removeAsset = useCallback(async (id: string) => {
        await actions.removeAssetDb(id);
        setAssets(prev => prev.filter(a => a.id !== id));
    }, []);

    const updateAssetPrice = useCallback(async (id: string, price: number) => {
        await actions.updateAssetPriceDb(id, price);
        setAssets(prev => prev.map(a => a.id === id ? { ...a, price } : a));
    }, []);

    const resetData = useCallback(async () => {
        if (window.confirm("Are you sure you want to delete all portfolios, assets, and transactions from the database? This cannot be undone.")) {
            await actions.resetAllDataDb();
            setPortfolios([]);
            setTransactions([]);
            setAssets([]);
        }
    }, []);

    if (!mounted) return <div className="min-h-screen flex items-center justify-center text-secondary">Loading...</div>;

    return (
        <PortfolioContext.Provider value={{ 
            portfolios, 
            transactions, 
            assets, 
            addPortfolio, 
            removePortfolio, 
            addTransaction, 
            removeTransaction, 
            addAsset, 
            updateAsset, 
            removeAsset, 
            updateAssetPrice, 
            resetData 
        }}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (!context) throw new Error("usePortfolio must be used within a PortfolioProvider");
    return context;
}
