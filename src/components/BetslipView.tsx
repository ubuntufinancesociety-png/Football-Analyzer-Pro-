import React, { useState } from 'react';
import {
  Share2,
  Copy,
  ExternalLink,
  Trash2,
  Check,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  FileCheck,
  Percent,
  Sparkles,
  Zap,
  CheckSquare,
  Square,
  Filter,
  Send,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  MatchLeg,
  BookmakerTransferTarget,
  BookingCodeResponse,
  MultiLegPreset,
  MultiLegStrategy,
} from '../types/betslip';
import { BOOKMAKERS, UPCOMING_MATCHES } from '../data/mockFixtures';

interface BetslipViewProps {
  legs: MatchLeg[];
  onToggleLeg: (id: string) => void;
  onSetLegsActive?: (activeIds: string[]) => void;
  onSelectAllLegs?: (shouldSelect: boolean) => void;
  onAddMultipleLegs?: (newLegs: Array<Omit<MatchLeg, 'id' | 'active'>>) => void;
  onRemoveLeg: (id: string) => void;
  onClearSlip: () => void;
  stake: number;
  setStake: (s: number) => void;
  currency: string;
  detectedBookmaker: string;
  onGoToScanner: () => void;
  onGoToBuilder: () => void;
}

const formatOdds = (val: unknown): string => {
  const num = Number(val);
  return !isNaN(num) && num > 0 ? num.toFixed(2) : '1.00';
};

const formatCurrencyVal = (val: unknown): string => {
  const num = Number(val);
  return !isNaN(num) && num >= 0 ? num.toFixed(2) : '0.00';
};

export const BetslipView: React.FC<BetslipViewProps> = ({
  legs,
  onToggleLeg,
  onSetLegsActive,
  onSelectAllLegs,
  onAddMultipleLegs,
  onRemoveLeg,
  onClearSlip,
  stake,
  setStake,
  currency,
  detectedBookmaker,
  onGoToScanner,
  onGoToBuilder,
}) => {
  const [selectedBookmaker, setSelectedBookmaker] = useState<BookmakerTransferTarget>(
    BOOKMAKERS[0]
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showCompactAnalysis, setShowCompactAnalysis] = useState<boolean>(true);

  // Multi-leg selection strategy & active preset tracking
  const [selectedStrategy, setSelectedStrategy] = useState<MultiLegStrategy>('confidence');
  const [activePreset, setActivePreset] = useState<MultiLegPreset | null>(null);

  // Booking code backend transfer state
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [bookingResult, setBookingResult] = useState<BookingCodeResponse | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const activeLegs = (legs || []).filter((l) => l && l.active);
  const totalOdds = activeLegs.reduce((acc, leg) => {
    const o = Number(leg?.odds);
    return acc * (!isNaN(o) && o > 0 ? o : 1.0);
  }, 1);
  const stakeNum = Math.max(0, Number(stake) || 0);
  const potentialPayout = activeLegs.length > 0 ? totalOdds * stakeNum : 0;
  const potentialProfit = potentialPayout > 0 ? Math.max(0, potentialPayout - stakeNum) : 0;

  // Implied probability from decimal odds (1 / totalOdds)
  const impliedProbability =
    totalOdds > 1 && !isNaN(totalOdds) ? Number(((1 / totalOdds) * 100).toFixed(1)) : 0;

  // Estimated average bookmaker margin for accumulator
  const estimatedMargin = activeLegs.length > 0 ? (activeLegs.length * 6.5).toFixed(1) : '0';

  // Apply multi-leg selection preset (3, 7, 9, or 12 legs)
  const handleApplyPreset = (count: MultiLegPreset) => {
    setActivePreset(count);

    if (!legs || legs.length === 0) return;

    // Clone and sort legs according to selected strategy
    const sorted = [...legs].sort((a, b) => {
      const oddsA = Number(a?.odds) || 1.5;
      const oddsB = Number(b?.odds) || 1.5;
      if (selectedStrategy === 'confidence') {
        // Lower odds = higher statistical probability
        return oddsA - oddsB;
      } else if (selectedStrategy === 'value') {
        // Higher odds = bigger multiplier return
        return oddsB - oddsA;
      } else {
        // Balanced: distance to 1.75 sweet spot
        return Math.abs(oddsA - 1.75) - Math.abs(oddsB - 1.75);
      }
    });

    const targetIds = sorted.slice(0, count).map((l) => l.id);

    if (onSetLegsActive) {
      onSetLegsActive(targetIds);
    } else {
      legs.forEach((l) => {
        const shouldBeActive = targetIds.includes(l.id);
        if (l.active !== shouldBeActive) {
          onToggleLeg(l.id);
        }
      });
    }

    setCopyFeedback(
      `Selected Top ${Math.min(count, legs.length)} Legs (${selectedStrategy === 'confidence' ? 'Highest Confidence' : selectedStrategy === 'value' ? 'High Value' : 'Balanced'})`
    );
    setTimeout(() => setCopyFeedback(null), 3200);
  };

  // Helper to auto-fill missing legs from UPCOMING_MATCHES if slip has fewer than 3, 7, 9, or 12
  const handleAutoFillRemainingLegs = (targetCount: number) => {
    if (!onAddMultipleLegs) return;
    const needed = targetCount - legs.length;
    if (needed <= 0) return;

    // Find matches not already in the slip
    const available = UPCOMING_MATCHES.filter(
      (um) => !legs.some((l) => l.homeTeam === um.homeTeam && l.awayTeam === um.awayTeam)
    );

    const newSelections = available.slice(0, needed).map((um) => {
      // Pick best statistical option
      const homeOdds = um.odds.home;
      const awayOdds = um.odds.away;
      let pick = 'Home Win (1)';
      let odds = homeOdds;

      if (awayOdds < homeOdds) {
        pick = 'Away Win (2)';
        odds = awayOdds;
      }

      return {
        league: um.league,
        homeTeam: um.homeTeam,
        awayTeam: um.awayTeam,
        matchTitle: `${um.homeTeam} vs ${um.awayTeam}`,
        market: '1X2',
        selection: pick,
        odds,
        kickoff: um.kickoff,
        source: 'upcoming' as const,
      };
    });

    onAddMultipleLegs(newSelections);
    setCopyFeedback(`Added ${newSelections.length} top fixtures to complete your ${targetCount}-leg accumulator!`);
    setTimeout(() => setCopyFeedback(null), 3200);
  };

  // Backend Booking Code Integration: Calls POST /api/betslip/generate-code
  const handleTransferToBookmaker = async () => {
    if (activeLegs.length === 0) {
      setCopyFeedback('Please select at least 1 leg to transfer.');
      setTimeout(() => setCopyFeedback(null), 3000);
      return;
    }

    setIsTransferring(true);
    setTransferError(null);

    try {
      const response = await fetch('/api/betslip/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legs: activeLegs,
          bookmaker: selectedBookmaker.name,
          stake,
          currency,
        }),
      });

      const data: BookingCodeResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate booking code from backend service.');
      }

      setBookingResult(data);

      // 1-Tap Clipboard Copy: automatically copy booking code to clipboard
      try {
        await navigator.clipboard.writeText(data.bookingCode);
        setCopyFeedback(`Booking code ${data.bookingCode} copied to clipboard!`);
        setTimeout(() => setCopyFeedback(null), 3500);
      } catch {
        // Fallback copy
        try {
          const textarea = document.createElement('textarea');
          textarea.value = data.bookingCode;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {}
      }

      // 1-Tap Redirection: launch bookmaker deep link in a new window/tab
      if (data.deepLinkUrl) {
        window.open(data.deepLinkUrl, '_blank', 'noopener,noreferrer');
      }

      setIsTransferModalOpen(true);
    } catch (err: any) {
      console.error('Booking Code Transfer Error:', err);
      setTransferError(err.message || 'Error communicating with booking code integration service.');
    } finally {
      setIsTransferring(false);
    }
  };

  // Format betslip text for copying and WhatsApp sharing
  const generateSlipText = () => {
    if (activeLegs.length === 0) return '';

    const lines = [
      `⚽ MY FOOTBALL BETSLIP (${activeLegs.length} LEGS)`,
      `----------------------------------------`,
      ...activeLegs.map(
        (leg, idx) =>
          `${idx + 1}. ${leg.matchTitle || 'Match'} (${leg.league || 'League'})\n   👉 Pick: ${leg.selection || 'Pick'} @ ${formatOdds(leg.odds)}`
      ),
      `----------------------------------------`,
      `📊 Total Combined Odds: ${formatOdds(totalOdds)}`,
      `💰 Stake: ${currency}${formatCurrencyVal(stake)}`,
      `🎯 Potential Return: ${currency}${formatCurrencyVal(potentialPayout)}`,
      `🔥 Est. Profit: ${currency}${formatCurrencyVal(potentialProfit)}`,
      ``,
      `Shared via Football Analyzer Pro • 18+ Gamble Responsibly`,
    ];

    return lines.join('\n');
  };

  const handleCopyText = async () => {
    const text = bookingResult?.formattedSlipText || generateSlipText();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback('Betslip copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyFeedback('Betslip copied to clipboard!');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const handleCopyBookingCodeOnly = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback(`Booking Code "${code}" copied to clipboard!`);
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch {}
  };

  const handleShareWhatsApp = () => {
    const text = bookingResult?.formattedSlipText || generateSlipText();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = () => {
    const text = bookingResult?.formattedSlipText || generateSlipText();
    if (navigator.share) {
      navigator
        .share({
          title: `Football Betslip (${activeLegs.length} Legs)`,
          text,
        })
        .catch(() => {});
    } else {
      handleCopyText();
    }
  };

  const handleCopyBookmakerSearchKeywords = () => {
    const keywords = activeLegs.map((l) => `${l.homeTeam} ${l.awayTeam}`).join(' | ');
    navigator.clipboard.writeText(keywords);
    setCopyFeedback(`Copied match search keywords for ${selectedBookmaker.name}!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  if (legs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-10 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
          🧾
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Your betslip is currently empty</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            Scan a screenshot from any bookmaker, pick from daily upcoming matches, or manually add your custom legs.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            onClick={onGoToScanner}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            Scan Screenshot
          </button>
          <button
            onClick={onGoToBuilder}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            + Create Leg
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Slip Header */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Active Betslip</h2>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-400">
              {activeLegs.length} of {legs.length} Legs Active
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Transfer selections to your chosen bookmaker or share accumulator with friends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>WhatsApp Share</span>
          </button>
          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Text</span>
          </button>
          <button
            onClick={onClearSlip}
            className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-rose-400 hover:border-rose-900 transition-colors"
            title="Clear all legs"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Copy notification toast */}
      {copyFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-300">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Main Grid: Left = Legs List & Multi-Leg Controls, Right = Payout Card & Transfer Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Legs List & Selection Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Multi-Leg Acca Preset Selector Bar (3, 7, 9, 12 Legs) */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-bold text-white tracking-tight uppercase">
                  Multi-Leg Quick Presets
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                  Auto-Select
                </span>
              </div>

              {/* Strategy Selector Pills */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 mr-1 text-[10px] uppercase font-semibold">Criteria:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStrategy('confidence');
                    if (activePreset) handleApplyPreset(activePreset);
                  }}
                  className={`rounded-lg px-2 py-0.5 font-semibold transition-all ${
                    selectedStrategy === 'confidence'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Prioritize highest win probability / lowest decimal odds"
                >
                  🟢 High Confidence
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStrategy('balanced');
                    if (activePreset) handleApplyPreset(activePreset);
                  }}
                  className={`rounded-lg px-2 py-0.5 font-semibold transition-all ${
                    selectedStrategy === 'balanced'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Balance probability and profit (~1.60-2.10 odds)"
                >
                  ⚖️ Balanced
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStrategy('value');
                    if (activePreset) handleApplyPreset(activePreset);
                  }}
                  className={`rounded-lg px-2 py-0.5 font-semibold transition-all ${
                    selectedStrategy === 'value'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Higher odds for maximum accumulator multiplier"
                >
                  🚀 High Value
                </button>
              </div>
            </div>

            {/* Preset Buttons for 3, 7, 9, or 12 Legs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { count: 3 as MultiLegPreset, label: '3 Legs', desc: 'Tri-Acca', icon: '⚡' },
                { count: 7 as MultiLegPreset, label: '7 Legs', desc: 'Lucky 7', icon: '🎯' },
                { count: 9 as MultiLegPreset, label: '9 Legs', desc: 'Power 9', icon: '🔥' },
                { count: 12 as MultiLegPreset, label: '12 Legs', desc: 'Mega Multi', icon: '👑' },
              ].map(({ count, label, desc, icon }) => {
                const isCurrent = activePreset === count && activeLegs.length === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => handleApplyPreset(count)}
                    className={`rounded-xl p-2.5 text-center transition-all border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isCurrent
                        ? 'border-emerald-400 bg-emerald-950/50 text-white shadow-md shadow-emerald-500/20'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{icon}</span>
                      <span className="font-bold text-xs">{label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Helper if fewer legs in slip than requested preset */}
            {activePreset && legs.length < activePreset && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                <span className="text-amber-200 text-[11px]">
                  Slip has <strong>{legs.length}</strong> legs. Need <strong>{activePreset - legs.length}</strong> more for a {activePreset}-leg ticket.
                </span>
                <button
                  type="button"
                  onClick={() => handleAutoFillRemainingLegs(activePreset)}
                  className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-slate-950 hover:bg-amber-400 text-[11px] shrink-0"
                >
                  + Auto-Fill Remaining {activePreset - legs.length} Legs
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Summary Counter & Checkbox Control Strip */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Master Checkbox Toggle */}
              <button
                type="button"
                onClick={() => {
                  const allActive = legs.every((l) => l.active);
                  if (onSelectAllLegs) {
                    onSelectAllLegs(!allActive);
                  } else {
                    legs.forEach((l) => {
                      if (l.active === allActive) onToggleLeg(l.id);
                    });
                  }
                  setActivePreset(null);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                {legs.every((l) => l.active) ? (
                  <CheckSquare className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Square className="h-4 w-4 text-slate-500" />
                )}
                <span>
                  {legs.every((l) => l.active) ? 'Deselect All' : 'Select All'}
                </span>
              </button>

              <div className="h-4 w-px bg-slate-800" />

              {/* Dynamic Leg Counter */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <span className="text-emerald-400 font-mono text-sm">{activeLegs.length}</span>
                <span className="text-slate-400 font-normal">of</span>
                <span className="text-slate-300">{legs.length} Legs Active</span>
              </div>
            </div>

            {/* Dynamic Cumulative Odds Counter & Quick Transfer Action */}
            <div className="flex items-center gap-2.5">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block uppercase font-semibold">Cumulative Odds</span>
                <span className="font-mono text-sm font-black text-emerald-400">
                  {formatOdds(totalOdds)}x
                </span>
              </div>

              <button
                type="button"
                onClick={handleTransferToBookmaker}
                disabled={activeLegs.length === 0 || isTransferring}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isTransferring ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Packaging...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Transfer to {selectedBookmaker.name}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Transfer error notice if any */}
          {transferError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center justify-between">
              <span>{transferError}</span>
              <button
                type="button"
                onClick={() => setTransferError(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Legs List */}
          <div className="space-y-2.5">
            {legs.map((leg, index) => (
              <div
                key={leg.id}
                className={`rounded-2xl border p-3.5 transition-all flex items-start justify-between gap-3 ${
                  leg.active
                    ? 'border-emerald-500/30 bg-[#0f172a] shadow-md'
                    : 'border-slate-900 bg-slate-950/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Interactive Checkbox Next to Each Analyzed Leg */}
                  <input
                    type="checkbox"
                    checked={leg.active}
                    onChange={() => {
                      onToggleLeg(leg.id);
                      setActivePreset(null);
                    }}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer"
                    title={leg.active ? 'Uncheck to exclude from accumulator' : 'Check to include in accumulator'}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-bold text-slate-300">{index + 1}.</span>
                      <span className="truncate">{leg.league}</span>
                      {leg.kickoff && (
                        <>
                          <span>·</span>
                          <span className="font-mono">{leg.kickoff}</span>
                        </>
                      )}
                      {!leg.active && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-800/80 px-1.5 py-0.2 rounded">
                          Excluded
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-sm text-white truncate mt-0.5">
                      {leg.matchTitle}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {leg.selection}
                      </span>
                      <span className="text-[11px] text-slate-500">{leg.market}</span>
                    </div>

                    {leg.notes && (
                      <div className="mt-1 text-[11px] text-amber-400/90 italic">
                        Note: {leg.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={`rounded-xl border px-2.5 py-1 text-center font-mono text-sm font-black ${
                    leg.active
                      ? 'border-emerald-500/40 bg-slate-900 text-emerald-400'
                      : 'border-slate-800 bg-slate-950 text-slate-500'
                  }`}>
                    {formatOdds(leg.odds)}
                  </div>
                  <button
                    onClick={() => onRemoveLeg(leg.id)}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Remove leg"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-500">
              Showing all {legs.length} analyzed legs. Selected: {activeLegs.length}.
            </span>
            <button
              onClick={onGoToBuilder}
              className="font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>+ Add custom leg</span>
            </button>
          </div>
        </div>

        {/* Payout & Transfer Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Accumulator Payout Box */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Total Accumulator Odds</span>
                <span className="text-[11px] text-emerald-400">
                  {activeLegs.length} Active {activeLegs.length === 1 ? 'Leg' : 'Legs'}
                </span>
              </div>
              <span className="font-mono text-2xl font-black text-emerald-400">
                {formatOdds(totalOdds)}x
              </span>
            </div>

            {/* Stake Input & Presets */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Stake ({currency})</label>
                <span className="text-[11px] text-slate-500">Min {currency}1</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-base font-bold text-white focus:border-emerald-500 outline-none"
                />
                <span className="absolute right-3.5 top-2.5 font-bold text-slate-500 text-xs">
                  {currency}
                </span>
              </div>

              {/* Quick stake buttons */}
              <div className="mt-2 flex gap-1.5">
                {[20, 50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStake(amt)}
                    className={`flex-1 rounded-lg py-1 text-xs font-semibold transition-colors ${
                      stake === amt
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Potential Payout */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Potential Payout:</span>
                <span className="font-mono text-lg font-black text-emerald-400">
                  {currency}
                  {formatCurrencyVal(potentialPayout)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-emerald-500/10 pt-2">
                <span>Estimated Net Profit:</span>
                <span className="font-mono font-bold text-emerald-300">
                  +{currency}
                  {formatCurrencyVal(potentialProfit)}
                </span>
              </div>
            </div>

            {/* Primary Action Button: Transfer to Bookmaker */}
            <button
              type="button"
              onClick={handleTransferToBookmaker}
              disabled={activeLegs.length === 0 || isTransferring}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-black text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isTransferring ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Generating Booking Code...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Transfer to {selectedBookmaker.name}</span>
                </>
              )}
            </button>

            {/* Compact Analysis Section */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs">
              <div
                onClick={() => setShowCompactAnalysis(!showCompactAnalysis)}
                className="flex items-center justify-between cursor-pointer text-slate-300 font-semibold"
              >
                <div className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Compact Slip Insights</span>
                </div>
                {showCompactAnalysis ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                )}
              </div>

              {showCompactAnalysis && (
                <div className="mt-3 space-y-2 border-t border-slate-800 pt-2.5 text-slate-400 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>Implied Win Probability:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {impliedProbability}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, impliedProbability))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span>Accumulator Vig / Margin:</span>
                    <span className="font-mono text-amber-400">~{estimatedMargin}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Risk Profile:</span>
                    <span
                      className={`font-semibold ${
                        activeLegs.length <= 3
                          ? 'text-emerald-400'
                          : activeLegs.length <= 7
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {activeLegs.length <= 3 ? 'Tri-Acca (Low Risk)' : activeLegs.length <= 7 ? 'Moderate Multi' : 'High Multiplier Accumulator'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Sharing buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleShareWhatsApp}
                className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleNativeShare}
                className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share Slip</span>
              </button>
            </div>
          </div>

          {/* Bookmaker Transfer Hub */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-white tracking-tight uppercase">
                  Destination Bookmaker
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select target bookmaker for booking code generation:
                </p>
              </div>
            </div>

            {/* Bookmaker selection tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {BOOKMAKERS.map((bk) => (
                <button
                  key={bk.id}
                  onClick={() => setSelectedBookmaker(bk)}
                  className={`rounded-lg p-2 text-center text-xs font-bold transition-all border cursor-pointer ${
                    selectedBookmaker.id === bk.id
                      ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-sm'
                      : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {bk.name}
                </button>
              ))}
            </div>

            {/* Transfer Instructions & Link for Selected Bookmaker */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">
                  Transfer to {selectedBookmaker.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedBookmaker.region}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedBookmaker.instructions}
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={handleTransferToBookmaker}
                  disabled={isTransferring}
                  className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="h-3 w-3" />
                  <span>Generate Code & Transfer</span>
                </button>

                <button
                  onClick={handleCopyBookmakerSearchKeywords}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy Keywords</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Booking Code Integration & Transfer Action Modal */}
      {isTransferModalOpen && bookingResult && (
        <div
          onClick={() => setIsTransferModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] max-w-lg w-full rounded-3xl border border-slate-800 bg-[#0f172a] p-5 sm:p-6 shadow-2xl flex flex-col space-y-4 overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Booking Code Generated
                  </h3>
                  <span className="text-xs text-slate-400">
                    Target: {bookingResult.bookmaker}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Large Booking Code Card */}
            <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 p-4 text-center space-y-2 shadow-inner">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block">
                Official Booking Code
              </span>

              <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider py-1">
                {bookingResult.bookingCode}
              </div>

              {/^\d+$/.test(bookingResult.bookingCode) && (
                <div className="inline-flex items-center gap-1 rounded-full bg-purple-950/80 border border-purple-500/40 px-2.5 py-0.5 text-[10px] font-bold text-purple-300">
                  <span>🔢 Numbers Only (Hollywoodbets Numeric Format)</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleCopyBookingCodeOnly(bookingResult.bookingCode)}
                className="mx-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Booking Code</span>
              </button>
            </div>

            {/* Quick summary grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase block">Total Legs</span>
                <span className="font-mono font-bold text-white text-sm">{bookingResult.totalLegs}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase block">Total Odds</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatOdds(bookingResult.totalOdds)}x</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                <span className="text-[10px] text-slate-500 uppercase block">Est. Return</span>
                <span className="font-mono font-bold text-white text-sm">
                  {bookingResult.currency || 'R'}{formatCurrencyVal(bookingResult.potentialPayout)}
                </span>
              </div>
            </div>

            {/* Primary Action Button: Open Bookmaker with Deep Link */}
            <div className="space-y-2 pt-1">
              <a
                href={bookingResult.deepLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <span>Open {bookingResult.bookmaker} & Load Slip</span>
                <ExternalLink className="h-4 w-4" />
              </a>

              {/* Fallback Option: Copy as Plain Text */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Fallback: Copy Selections as Plain Text</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full rounded-xl border border-emerald-900/50 bg-emerald-950/40 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Share Code on WhatsApp</span>
              </button>
            </div>

            {/* Mandatory Non-Bookmaker Disclaimer */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Analytical Platform Notice</span>
              </div>
              <p>
                Football Analyzer Pro is an independent analytical research and statistical forecasting platform, not a bookmaker. We do not accept bets or handle gambling funds. 18+ Gamble responsibly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
