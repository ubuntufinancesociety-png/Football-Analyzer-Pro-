import React from 'react';
import { Receipt, PlusCircle, Sparkles, Flame, Settings } from 'lucide-react';

export type AppTab = 'formula' | 'bankers' | 'slip' | 'builder';

export const NAV_ITEMS: Array<{ id: AppTab; label: string; desktopLabel: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'formula', label: '87% Formula', desktopLabel: '87% Formula', icon: Flame },
  { id: 'bankers', label: 'Bankers', desktopLabel: 'AI Bankers', icon: Sparkles },
  { id: 'slip', label: 'Betslip', desktopLabel: 'Betslip', icon: Receipt },
  { id: 'builder', label: '+ Leg', desktopLabel: '+ Leg', icon: PlusCircle },
];

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  slipCount: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, slipCount, onOpenSettings }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0d1527]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
        {/* Brand */}
        <button
          type="button"
          onClick={() => setActiveTab('formula')}
          className="flex items-center gap-2.5 min-w-0 text-left"
          aria-label="Football Analyzer Pro home"
        >
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 font-black text-base">
            ⚡
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-none truncate">
                Football Analyzer Pro
              </h1>
              <span className="rounded bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase shrink-0 leading-none">
                87% Formula
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Independent mathematical football analysis
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Desktop navigation (mobile uses the fixed bottom bar) */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="Main">
            {NAV_ITEMS.map(({ id, desktopLabel, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{desktopLabel}</span>
                  {id === 'slip' && slipCount > 0 && (
                    <span
                      className={`ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                        isActive ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {slipCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded-lg border border-slate-700/80 bg-slate-900 p-2 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            aria-label="Settings and export"
            title="Settings & export"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  slipCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, slipCount }) => (
  <nav
    aria-label="Main"
    className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 sm:hidden border-t border-slate-800 bg-[#0d1527]/95 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur-lg"
  >
    {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
      const isActive = activeTab === id;
      return (
        <button
          key={id}
          type="button"
          onClick={() => setActiveTab(id)}
          aria-current={isActive ? 'page' : undefined}
          className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-colors ${
            isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 font-semibold'
          }`}
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
          {id === 'slip' && slipCount > 0 && (
            <span className="absolute top-0 left-1/2 ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-slate-950">
              {slipCount}
            </span>
          )}
          {isActive && <span className="absolute -top-1.5 h-0.5 w-8 rounded-full bg-emerald-400" />}
        </button>
      );
    })}
  </nav>
);
