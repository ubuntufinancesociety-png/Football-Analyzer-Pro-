import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Download,
  Share2,
  Code2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MatchLeg } from '../types/betslip';
import { BOOKMAKERS } from '../data/mockFixtures';

interface SaaSHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  legs: MatchLeg[];
  stake: number;
  currency: string;
}

export const SaaSHubModal: React.FC<SaaSHubModalProps> = ({
  isOpen,
  onClose,
  legs,
  stake,
  currency,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeLegs = legs.filter((l) => l.active);
  const totalOdds = activeLegs.reduce((acc, l) => acc * l.odds, 1);
  const potentialPayout = totalOdds * stake;

  // Comparison of estimated payouts across bookmakers based on margin factors
  const bookmakerPayoutComparison = [
    { name: 'Betway', boost: '1.02x', payout: potentialPayout * 1.02, best: true },
    { name: 'Hollywoodbets', boost: '1.00x', payout: potentialPayout, best: false },
    { name: 'Supabets', boost: '0.98x', payout: potentialPayout * 0.98, best: false },
    { name: 'Betexchange', boost: '1.05x (Exchange)', payout: potentialPayout * 1.05, best: true },
    { name: 'Sportingbet', boost: '0.99x', payout: potentialPayout * 0.99, best: false },
  ];

  const handleExportJSON = () => {
    const payload = {
      app: 'Football Analyzer Pro SaaS',
      exportDate: new Date().toISOString(),
      stake,
      currency,
      totalOdds: Number(totalOdds.toFixed(2)),
      potentialPayout: Number(potentialPayout.toFixed(2)),
      legs: activeLegs,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betslip_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess('Betslip JSON exported successfully!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleExportCSV = () => {
    const headers = 'Index,Match,League,Market,Selection,Odds\n';
    const rows = activeLegs
      .map(
        (l, i) =>
          `"${i + 1}","${l.matchTitle}","${l.league}","${l.market}","${l.selection}","${l.odds}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betslip_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess('Betslip CSV exported successfully!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#0b1120] p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full bg-slate-800/80 p-1.5 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                SaaS & Monetization Platform
              </h3>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-300 uppercase">
                Pro Suite
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Turn your betslip OCR tool into a high-converting sports betting SaaS product.
            </p>
          </div>
        </div>

        {downloadSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        <div className="mt-5 space-y-5">
          {/* Feature 1: Multi-Bookmaker Arbitrage & Odds Comparison */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Slip Payout Comparison Across Bookmakers
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Stake: {currency}{stake}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Users love seeing which bookmaker pays the most for their exact combination of picks.
            </p>

            <div className="space-y-1.5 pt-1">
              {bookmakerPayoutComparison.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.boost}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400">
                      {currency}
                      {item.payout.toFixed(2)}
                    </span>
                    {item.best && (
                      <span className="rounded bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 font-bold">
                        Top Return
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 2: Data Export for Tipsters & Syndicates */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">
                Export Slip Data (CSV & JSON)
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              Export your parsed betslip for tracking in Excel, sharing with sports betting syndicates, or feeding into automated bot integrations.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleExportJSON}
                disabled={activeLegs.length === 0}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-750 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export as JSON</span>
              </button>
              <button
                onClick={handleExportCSV}
                disabled={activeLegs.length === 0}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-750 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export as CSV</span>
              </button>
            </div>
          </div>

          {/* SaaS Tiers Overview */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-slate-950 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">SaaS Monetization Blueprint</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-2">
                <div className="font-bold text-slate-200">Free Tier</div>
                <ul className="space-y-1 text-slate-400 text-[11px]">
                  <li>✓ 5 OCR scans per day</li>
                  <li>✓ Daily upcoming matches</li>
                  <li>✓ WhatsApp slip sharing</li>
                </ul>
              </div>
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 space-y-2">
                <div className="font-bold text-emerald-300">Pro Tipster (SaaS)</div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  <li>✓ Unlimited batch OCR processing</li>
                  <li>✓ Multi-bookmaker odds arbitrage</li>
                  <li>✓ Custom booking code generation</li>
                  <li>✓ Excel & JSON automated export</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            Got it, Return to App
          </button>
        </div>
      </div>
    </div>
  );
};
