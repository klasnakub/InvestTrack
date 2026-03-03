"use client";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
    return (
        <header className="sticky top-0 z-30 bg-bg-main/80 backdrop-blur-md border-b border-border-subtle">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-2xl text-primary">token</span>
                        <span className="font-display font-bold text-lg tracking-tight">InvestTrack</span>
                    </Link>
                    <nav className="hidden md:flex gap-8">
                        <Link className="text-sm font-medium text-primary border-b-2 border-primary py-1" href="/">Dashboard</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </header>
    );
}
