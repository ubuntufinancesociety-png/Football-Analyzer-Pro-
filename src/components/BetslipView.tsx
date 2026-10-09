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
} from 'lucide-react';
import { MatchLeg, BookmakerTransferTarget } from '../types/betslip';
import { BOOKMAKERS } from '../data/mockFixtures';

interface BetslipViewProps {
  legs: MatchLeg[];
  onToggleLeg: (id: string) => void;
  onRemoveLeg: (id: string) => void;
  onClearSlip: () => void;
  stake: number;
  setStake: (s: number) => void;
  currency: string;
  detectedBookmaker: string;
  onGoToScanner: () => void;
  onGoToBuilder: () => void;
}

export const BetslipView: React.FC<BetslipViewProps> = ({
  legs,
  onToggleLeg,
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

  const activeLegs = legs.filter((l) => l.active);
  const totalOdds = activeLegs.reduce((acc, leg) => acc * leg.odds, 1);
  const potentialPayout = activeLegs.length > 0 ? totalOdds * stake : 0;
  const potentialProfit = potentialPayout > 0 ? potentialPayout - stake : 0;

  // Implied probability from decimal odds (1 / totalOdds)
  const impliedProbability =
    totalOdds > 1 ? Number(((1 / totalOdds) * 100).toFixed(1)) : 0;

  // Estimated average bookmaker margin for accumulator
  const estimatedMargin = activeLegs.length > 0 ? (activeLegs.length * 6.5).toFixed(1) : '0';

  // Format betslip text for copying and WhatsApp sharing
  const generateSlipText = () => {
    if (activeLegs.length === 0) return '';

    const lines = [
      `⚽ MY FOOTBALL BETSLIP (${activeLegs.length} LEGS)`,
      `----------------------------------------`,
      ...activeLegs.map(
        (leg, idx) =>
          `${idx + 1}. ${leg.matchTitle} (${leg.league})\n   👉 Pick: ${leg.selection} @ ${leg.odds.toFixed(2)}`
      ),
      `----------------------------------------`,
      `📊 Total Combined Odds: ${totalOdds.toFixed(2)}`,
      `💰 Stake: ${currency}${stake.toFixed(2)}`,
      `🎯 Potential Return: ${currency}${potentialPayout.toFixed(2)}`,
      `🔥 Est. Profit: ${currency}${potentialProfit.toFixed(2)}`,
      ``,
      `Shared via Football Analyzer Pro • 18+ Gamble Responsibly`,
    ];

    return lines.join('\n');
  };

  const handleCopyText = async () => {
    const text = generateSlipText();
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

  const handleShareWhatsApp = () => {
    const text = generateSlipText();
    if (!text) return;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = () => {
    const text = generateSlipText();
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

      {/* Main Grid: Left = Legs List, Right = Payout Card & Transfer Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Legs List (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Selections ({activeLegs.length})</span>
            <span>Tap checkbox to include/exclude</span>
          </div>

          <div className="space-y-2.5">
            {legs.map((leg, index) => (
              <div
                key={leg.id}
                className={`rounded-2xl border p-3.5 transition-all flex items-start justify-between gap-3 ${
                  leg.active
                    ? 'border-slate-800 bg-[#0f172a] shadow-md'
                    : 'border-slate-900 bg-slate-950/60 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={leg.active}
                    onChange={() => onToggleLeg(leg.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 accent-emerald-500 cursor-pointer"
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
                  <div className="rounded-xl border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-center font-mono text-sm font-black text-emerald-400">
                    {leg.odds.toFixed(2)}
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

          <div className="pt-2 flex justify-end">
            <button
              onClick={onGoToBuilder}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>+ Add another leg</span>
            </button>
          </div>
        </div>

        {/* Payout & Transfer Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Accumulator Payout Box */}
          <div className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-slate-400">Total Accumulator Odds</span>
              <span className="font-mono text-xl font-black text-emerald-400">
                {totalOdds.toFixed(2)}
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
                  {potentialPayout.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-emerald-500/10 pt-2">
                <span>Estimated Net Profit:</span>
                <span className="font-mono font-bold text-emerald-300">
                  +{currency}
                  {potentialProfit.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Compact Analysis Section (As requested: shouldn't take too much space) */}
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

                  {/* Compact progress bar */}
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
                    <span>Risk Level:</span>
                    <span
                      className={`font-semibold ${
                        activeLegs.length <= 3
                          ? 'text-emerald-400'
                          : activeLegs.length <= 6
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {activeLegs.length <= 3 ? 'Low Risk' : activeLegs.length <= 6 ? 'Moderate' : 'High Variance Multi'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Sharing buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleShareWhatsApp}
                className="rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleNativeShare}
                className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-white hover:bg-slate-750 flex items-center justify-center gap-1.5"
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
                  Bookmaker Transfer Hub
                </h4>
                <p className="text-[11px] text-slate-400">
                  Select destination bookmaker to transfer this slip:
                </p>
              </div>
            </div>

            {/* Bookmaker selection tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {BOOKMAKERS.map((bk) => (
                <button
                  key={bk.id}
                  onClick={() => setSelectedBookmaker(bk)}
                  className={`rounded-lg p-2 text-center text-xs font-bold transition-all border ${
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
                  onClick={handleCopyBookmakerSearchKeywords}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy Search Keywords</span>
                </button>

                <a
                  href={selectedBookmaker.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 flex items-center justify-center gap-1.5"
                >
                  <span>Open {selectedBookmaker.name}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
