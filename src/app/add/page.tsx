"use client";

import { useState } from "react";
import { usePortfolio, PortfolioType } from "@/store/PortfolioContext";

const PORT_TYPES: { id: PortfolioType; label: string; icon: string }[] = [
    { id: "th_stock", label: "Thai Stocks", icon: "trending_up" },
    { id: "foreign_stock", label: "Foreign Stocks", icon: "public" },
    { id: "fund", label: "Mutual Funds", icon: "pie_chart" },
    { id: "gold", label: "Gold", icon: "monetization_on" },
];

export default function ManagePortfoliosPage() {
    const { portfolios, addPortfolio, removePortfolio } = usePortfolio();
    const [newPort, setNewPort] = useState({ name: "", type: "th_stock" as PortfolioType });

    function submitPort(e: React.FormEvent) {
        e.preventDefault();
        if (!newPort.name.trim()) return alert("Please enter a portfolio name");
        addPortfolio(newPort.name.trim(), newPort.type);
        setNewPort({ name: "", type: "th_stock" });
        alert("Portfolio added successfully");
    }

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 w-full">
            <h1 className="text-3xl font-display font-light text-primary mb-8 tracking-tight">Manage Portfolios</h1>
            
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
                    <button type="submit" className="w-full bg-primary text-bg-main font-medium rounded-xl py-3 hover:opacity-90 transition-opacity">
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
                            <button onClick={() => { if (window.confirm('Delete this portfolio? (Warning: This will delete all assets and transactions in this portfolio)')) removePortfolio(p.id) }} className="text-danger hover:underline text-sm font-medium">
                                Delete
                            </button>
                        </div>
                    ))}
                    {portfolios.length === 0 && (
                        <p className="text-secondary text-sm">No portfolios found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
