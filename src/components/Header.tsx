import React from 'react';
import { Camera, Receipt, PlusCircle, Calendar, Sparkles, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'ocr' | 'slip' | 'builder' | 'upcoming';
  setActiveTab: (tab: 'ocr' | 'slip' | 'builder' | 'upcoming') => void;
  slipCount: number;
  detectedBookmaker: string;
  currency: string;
  setCurrency: (c: string) => void;
  onOpenSaaS: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  slipCount,
  detectedBookmaker,
  currency,
  setCurrency,
  onOpenSaaS,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0d1527]/95 backdrop-blur-md">
      {/* Top micro bar for status & currency */}
      <div className="border-b border-slate-800/80 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-400">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] truncate">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-300">Hollywoodbets & Universal OCR</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenSaaS}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden xs:inline">SaaS</span>
            </button>
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded bg-slate-900 border border-slate-700/80 px-1 py-0.5 text-[11px] font-semibold text-slate-200 outline-none focus:border-emerald-500"
              >
                <option value="R">R (ZAR)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 font-black text-base">
            ⚽
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-none truncate">
                Football Analyzer Pro
              </h1>
              <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 uppercase shrink-0">
                AI OCR
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <span>Bookmaker:</span>
              <span className="font-semibold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 text-[10px] truncate max-w-[120px] sm:max-w-none">
                {detectedBookmaker || 'Hollywoodbets'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab buttons (Desktop only, mobile uses fixed bottom navigation bar) */}
        <nav className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('ocr')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === 'ocr'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span>OCR Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Upcoming Matches</span>
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === 'builder'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Leg</span>
          </button>

          <button
            onClick={() => setActiveTab('slip')}
            className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === 'slip'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700/80'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Betslip</span>
            {slipCount > 0 && (
              <span
                className={`ml-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  activeTab === 'slip' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {slipCount}
              </span>
            )}
          </button>
        </nav>

        {/* Quick mobile betslip pill */}
        <button
          onClick={() => setActiveTab('slip')}
          className="flex sm:hidden items-center gap-1 rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-100"
        >
          <Receipt className="h-3.5 w-3.5 text-emerald-400" />
          <span>Slip</span>
          {slipCount > 0 && (
            <span className="rounded-full bg-emerald-500 px-1 text-[10px] font-black text-slate-950">
              {slipCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
