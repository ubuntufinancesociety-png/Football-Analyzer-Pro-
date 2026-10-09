/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OcrScanner } from './components/OcrScanner';
import { LegBuilder } from './components/LegBuilder';
import { UpcomingMatches } from './components/UpcomingMatches';
import { BetslipView } from './components/BetslipView';
import { SaaSHubModal } from './components/SaaSHubModal';
import { MatchLeg } from './types/betslip';
import { Camera, Calendar, PlusCircle, Receipt, Sparkles } from 'lucide-react';

const INITIAL_DEMO_LEGS: MatchLeg[] = [
  {
    id: 'demo_leg_1',
    league: 'Premier League',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    matchTitle: 'Arsenal vs Chelsea',
    market: '1X2',
    selection: 'Arsenal to Win (1)',
    odds: 1.88,
    kickoff: 'Today 20:00',
    source: 'ocr',
    active: true,
  },
  {
    id: 'demo_leg_2',
    league: 'DStv Premiership (PSL)',
    homeTeam: 'Mamelodi Sundowns',
    awayTeam: 'Orlando Pirates',
    matchTitle: 'Mamelodi Sundowns vs Orlando Pirates',
    market: '1X2',
    selection: 'Mamelodi Sundowns to Win (1)',
    odds: 1.75,
    kickoff: 'Today 19:30',
    source: 'ocr',
    active: true,
  },
  {
    id: 'demo_leg_3',
    league: 'UEFA Champions League',
    homeTeam: 'Real Madrid',
    awayTeam: 'Bayern Munich',
    matchTitle: 'Real Madrid vs Bayern Munich',
    market: 'Over/Under Goals',
    selection: 'Over 2.5 Goals',
    odds: 1.60,
    kickoff: 'Tomorrow 21:00',
    source: 'upcoming',
    active: true,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'ocr' | 'upcoming' | 'builder' | 'slip'>('ocr');
  const [legs, setLegs] = useState<MatchLeg[]>(() => {
    try {
      const saved = localStorage.getItem('fap_betslip_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  const [detectedBookmaker, setDetectedBookmaker] = useState<string>('Hollywoodbets');
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
    const leg: MatchLeg = {
      ...newLeg,
      id: `leg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      active: true,
    };

    setLegs((prev) => [leg, ...prev]);
    showToast(`Added: ${leg.selection} (@${leg.odds.toFixed(2)}) to Betslip!`);
  };

  const handleAddMultipleLegs = (newLegs: Array<Omit<MatchLeg, 'id' | 'active'>>) => {
    const formattedLegs: MatchLeg[] = newLegs.map((nl, idx) => ({
      ...nl,
      id: `leg_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      active: true,
    }));

    setLegs((prev) => [...formattedLegs, ...prev]);
    showToast(`Added ${formattedLegs.length} legs to your Betslip!`);
    setActiveTab('slip');
  };

  const handleToggleLeg = (id: string) => {
    setLegs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, active: !l.active } : l))
    );
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
        detectedBookmaker={detectedBookmaker}
        currency={currency}
        setCurrency={setCurrency}
        onOpenSaaS={() => setIsSaaSHubOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-2.5 py-4 sm:px-6 sm:py-6 overflow-x-hidden">
        {activeTab === 'ocr' && (
          <OcrScanner
            onAddLeg={handleAddLeg}
            onAddMultipleLegs={handleAddMultipleLegs}
            detectedBookmaker={detectedBookmaker}
            setDetectedBookmaker={setDetectedBookmaker}
            currency={currency}
          />
        )}

        {activeTab === 'upcoming' && (
          <UpcomingMatches
            onAddLeg={handleAddLeg}
            activeLegs={legs}
            onGoToSlip={() => setActiveTab('slip')}
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

        {activeTab === 'slip' && (
          <BetslipView
            legs={legs}
            onToggleLeg={handleToggleLeg}
            onRemoveLeg={handleRemoveLeg}
            onClearSlip={handleClearSlip}
            stake={stake}
            setStake={setStake}
            currency={currency}
            detectedBookmaker={detectedBookmaker}
            onGoToScanner={() => setActiveTab('ocr')}
            onGoToBuilder={() => setActiveTab('builder')}
          />
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-slate-900/95 px-5 py-2.5 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex sm:hidden border-t border-slate-800 bg-[#0d1527]/95 px-2 py-2 backdrop-blur-lg justify-around">
        <button
          onClick={() => setActiveTab('ocr')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'ocr' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Camera className="h-5 w-5" />
          <span>Scan OCR</span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'upcoming' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span>Matches</span>
        </button>

        <button
          onClick={() => setActiveTab('builder')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'builder' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <PlusCircle className="h-5 w-5" />
          <span>+ Leg</span>
        </button>

        <button
          onClick={() => setActiveTab('slip')}
          className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            activeTab === 'slip' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <Receipt className="h-5 w-5" />
          <span>Betslip</span>
          {activeLegCount > 0 && (
            <span className="absolute top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-slate-950">
              {activeLegCount}
            </span>
          )}
        </button>
      </div>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-4xl px-4 space-y-2">
          <p className="font-semibold text-slate-400">
            Football Analyzer Pro • Universal Bookmaker OCR & Slip Intelligence
          </p>
          <p className="text-slate-400 text-[11px]">
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
