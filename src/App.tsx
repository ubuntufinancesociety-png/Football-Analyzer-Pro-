/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, BottomNav, AppTab } from './components/Header';
import { Formula87Scanner } from './components/Formula87Scanner';
import { LegBuilder } from './components/LegBuilder';
import { UpcomingMatches } from './components/UpcomingMatches';
import { BetslipView } from './components/BetslipView';
import { SaaSHubModal } from './components/SaaSHubModal';
import { MatchLeg } from './types/betslip';

const INITIAL_DEMO_LEGS: MatchLeg[] = [
  {
    id: 'demo_leg_1',
    league: 'Premier League',
    homeTeam: 'Manchester City',
    awayTeam: 'Tottenham',
    matchTitle: 'Manchester City vs Tottenham',
    market: 'Over 1.5 Goals',
    selection: 'Over 1.5 Goals',
    odds: 1.25,
    kickoff: 'Today 20:00',
    source: 'upcoming',
    active: true,
    notes: '87% Formula qualifier (+7.0% EV Edge, Combined 3.45 G/M)',
  },
  {
    id: 'demo_leg_2',
    league: 'Spanish La Liga',
    homeTeam: 'Barcelona',
    awayTeam: 'Villarreal',
    matchTitle: 'Barcelona vs Villarreal',
    market: 'Over 1.5 Goals',
    selection: 'Over 1.5 Goals',
    odds: 1.28,
    kickoff: 'Today 21:00',
    source: 'upcoming',
    active: true,
    notes: '87% Formula qualifier (+8.9% EV Edge, Combined 3.20 G/M)',
  },
  {
    id: 'demo_leg_3',
    league: 'German Bundesliga',
    homeTeam: 'Bayern Munich',
    awayTeam: 'Eintracht Frankfurt',
    matchTitle: 'Bayern Munich vs Frankfurt',
    market: 'Over 1.5 Goals',
    selection: 'Over 1.5 Goals',
    odds: 1.22,
    kickoff: 'Tomorrow 18:30',
    source: 'upcoming',
    active: true,
    notes: '87% Formula qualifier (+5.1% EV Edge, Combined 3.80 G/M)',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('formula');
  const [legs, setLegs] = useState<MatchLeg[]>(() => {
    try {
      const saved = localStorage.getItem('fap_betslip_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((leg: any, idx: number) => {
            const parsedOdds = Number(leg?.odds);
            const validOdds = !isNaN(parsedOdds) && parsedOdds > 0 ? Number(parsedOdds.toFixed(2)) : 1.50;
            return {
              ...leg,
              id: leg?.id || `leg_${Date.now()}_${idx}`,
              matchTitle: leg?.matchTitle || `${leg?.homeTeam || 'Home'} vs ${leg?.awayTeam || 'Away'}`,
              selection: leg?.selection || 'Pick',
              league: leg?.league || 'League',
              market: leg?.market || '1X2',
              odds: validOdds,
              active: leg?.active !== undefined ? Boolean(leg.active) : true,
              source: leg?.source || 'upcoming',
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load betslip from localStorage:', e);
    }
    return INITIAL_DEMO_LEGS;
  });

  const [stake, setStake] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fap_stake_v2');
      if (saved) return Math.max(1, Number(saved) || 50);
    } catch {}
    return 50;
  });

  const [currency, setCurrency] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fap_currency_v2');
      if (saved) return saved;
    } catch {}
    return 'R';
  });

  const detectedBookmaker = 'Hollywoodbets';
  const [isSaaSHubOpen, setIsSaaSHubOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('fap_betslip_v2', JSON.stringify(legs));
    } catch {}
  }, [legs]);

  useEffect(() => {
    try {
      localStorage.setItem('fap_stake_v2', stake.toString());
    } catch {}
  }, [stake]);

  useEffect(() => {
    try {
      localStorage.setItem('fap_currency_v2', currency);
    } catch {}
  }, [currency]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleAddLeg = (newLeg: Omit<MatchLeg, 'id' | 'active'>) => {
    const rawOdds = Number(newLeg.odds);
    const validOdds = !isNaN(rawOdds) && rawOdds > 0 ? Number(rawOdds.toFixed(2)) : 1.50;
    const leg: MatchLeg = {
      ...newLeg,
      odds: validOdds,
      id: `leg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      active: true,
    };

    setLegs((prev) => [leg, ...prev]);
    showToast(`Added: ${leg.selection} (@${validOdds.toFixed(2)}) to Betslip!`);
  };

  const handleAddMultipleLegs = (newLegs: Array<Omit<MatchLeg, 'id' | 'active'>>) => {
    const formattedLegs: MatchLeg[] = newLegs.map((nl, idx) => {
      const rawOdds = Number(nl.odds);
      const validOdds = !isNaN(rawOdds) && rawOdds > 0 ? Number(rawOdds.toFixed(2)) : 1.50;
      return {
        ...nl,
        odds: validOdds,
        id: `leg_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        active: true,
      };
    });

    setLegs((prev) => [...formattedLegs, ...prev]);
    showToast(`Added ${formattedLegs.length} legs to your Betslip!`);
    setActiveTab('slip');
  };

  const handleToggleLeg = (id: string) => {
    setLegs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    );
  };

  const handleSetLegsActive = (activeIds: string[]) => {
    setLegs((prev) =>
      prev.map((l) => ({
        ...l,
        active: activeIds.includes(l.id),
      }))
    );
  };

  const handleSelectAllLegs = (shouldSelect: boolean) => {
    setLegs((prev) => prev.map((l) => ({ ...l, active: shouldSelect })));
  };

  const handleRemoveLeg = (id: string) => {
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleClearSlip = () => {
    if (confirm('Clear all legs from your active betslip?')) {
      setLegs([]);
      showToast('Betslip cleared.');
    }
  };

  const activeLegCount = legs.filter((l) => l.active).length;

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 flex flex-col font-sans pb-28 sm:pb-12 overflow-x-hidden w-full">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        slipCount={activeLegCount}
        onOpenSettings={() => setIsSaaSHubOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-2.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden">
        {activeTab === 'formula' && (
          <Formula87Scanner
            onAddLeg={handleAddLeg}
            onAddMultipleLegs={handleAddMultipleLegs}
            onGoToSlip={() => setActiveTab('slip')}
            currency={currency}
          />
        )}

        {activeTab === 'bankers' && (
          <UpcomingMatches
            onAddLeg={handleAddLeg}
            onAddMultipleLegs={handleAddMultipleLegs}
            activeLegs={legs}
            onGoToSlip={() => setActiveTab('slip')}
            onGoToFormula={() => setActiveTab('formula')}
            currency={currency}
          />
        )}

        {activeTab === 'slip' && (
          <BetslipView
            legs={legs}
            onToggleLeg={handleToggleLeg}
            onSetLegsActive={handleSetLegsActive}
            onSelectAllLegs={handleSelectAllLegs}
            onAddMultipleLegs={handleAddMultipleLegs}
            onRemoveLeg={handleRemoveLeg}
            onClearSlip={handleClearSlip}
            stake={stake}
            setStake={setStake}
            currency={currency}
            detectedBookmaker={detectedBookmaker}
            onGoToScanner={() => setActiveTab('formula')}
            onGoToBuilder={() => setActiveTab('builder')}
          />
        )}

        {activeTab === 'builder' && (
          <LegBuilder
            onAddLeg={handleAddLeg}
            onGoToSlip={() => setActiveTab('slip')}
            currency={currency}
            stake={stake}
          />
        )}

      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-slate-900/95 px-5 py-2.5 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} slipCount={activeLegCount} />

      {/* Footer & Independent Platform Disclaimer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-4xl px-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px]">
            <span className="font-bold text-slate-300">Football Analyzer Pro</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-medium">Gemini AI Sports Intelligence</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              ⚠️ Independent Analytics Platform (Not a Bookmaker)
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed max-w-2xl mx-auto">
            This application is an educational & statistical analysis tool. We are NOT a bookmaker, gambling operator, or sports betting service. We do not accept bets, stake money, or execute wagers. Banker conviction scores and formula outputs are statistical projections, not guarantees, and the 87% Formula name is not a verified success rate.
          </p>
          <p className="text-slate-400 text-[10px]">
            18+ Only. Gamble responsibly. South African Responsible Gambling Helpline: 0800 006 008. UK: 0808 8020 133.
          </p>
        </div>
      </footer>

      {/* SaaS & Monetization Modal */}
      <SaaSHubModal
        isOpen={isSaaSHubOpen}
        onClose={() => setIsSaaSHubOpen(false)}
        legs={legs}
        stake={stake}
        currency={currency}
      />
    </div>
  );
}
