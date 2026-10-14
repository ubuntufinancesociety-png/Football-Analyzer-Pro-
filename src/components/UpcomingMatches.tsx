import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Sparkles,
  Check,
  Plus,
  Share2,
  Copy,
  ExternalLink,
  Flame,
  TrendingUp,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Info,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Facebook,
  CheckSquare,
  Square,
  Trophy,
} from 'lucide-react';
import { MatchLeg, AnalyzedBankerMatch, BankerSelectionCount } from '../types/betslip';

interface UpcomingMatchesProps {
  onAddLeg: (leg: Omit<MatchLeg, 'id' | 'active'>) => void;
  onAddMultipleLegs?: (legs: Array<Omit<MatchLeg, 'id' | 'active'>>) => void;
  activeLegs: MatchLeg[];
  onGoToSlip: () => void;
  currency?: string;
}

export const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({
  onAddLeg,
  onAddMultipleLegs,
  activeLegs,
  onGoToSlip,
  currency = 'R',
}) => {
  // Query Filters
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'tomorrow' | 'weekend'>('all');
  const [sport, setSport] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchInput, setActiveSearchInput] = useState('');

  // Live AI Data State
  const [matches, setMatches] = useState<AnalyzedBankerMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string>('gemini-live-ai');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Banker Selection: IDs of matches selected for the accumulator
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Accumulator & Stake State
  const [stake, setStake] = useState<number>(50);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [bookingCodeData, setBookingCodeData] = useState<{
    code: string;
    bookmaker: string;
    url: string;
  } | null>(null);
  const [targetBookmaker, setTargetBookmaker] = useState<string>('Hollywoodbets');

  // Fetch upcoming matches dynamically from Gemini API
  const fetchUpcomingMatches = async (
    targetTimeframe = timeframe,
    targetSport = sport,
    targetQuery = searchQuery
  ) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/matches/find-upcoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe: targetTimeframe,
          sport: targetSport,
          searchQuery: targetQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.matches) && data.matches.length > 0) {
        setMatches(data.matches);
        setAiSource(data.source || 'gemini-live-ai');
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        // Default: Auto-select Top 7 Bankers for instant accumulator preview
        const initialSelected = new Set<string>(data.matches.slice(0, 7).map((m: AnalyzedBankerMatch) => m.id));
        setSelectedIds(initialSelected);
      } else {
        throw new Error(data.error || 'No matches returned by AI analyzer');
      }
    } catch (err: any) {
      console.error('Failed to fetch AI upcoming matches:', err);
      setErrorMessage(err.message || 'Network error fetching upcoming matches.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUpcomingMatches('all', 'all', '');
  }, []);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(activeSearchInput);
    fetchUpcomingMatches(timeframe, sport, activeSearchInput);
  };

  // Quick Preset Selection (All 15, 12, 9, 7, 5, 3)
  const handleSelectBankersPreset = (count: BankerSelectionCount) => {
    if (matches.length === 0) return;
    const selected = new Set<string>();
    matches.slice(0, count).forEach((m) => selected.add(m.id));
    setSelectedIds(selected);
  };

  const handleSelectAll = () => {
    const all = new Set<string>(matches.map((m) => m.id));
    setSelectedIds(all);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Individual Match Toggle
  const toggleMatchSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Calculate Accumulator Stats
  const selectedMatchesList = useMemo(() => {
    return matches.filter((m) => selectedIds.has(m.id));
  }, [matches, selectedIds]);

  const combinedOdds = useMemo(() => {
    if (selectedMatchesList.length === 0) return 1.0;
    const product = selectedMatchesList.reduce((acc, m) => acc * (m.odds || 1.0), 1.0);
    return Number(product.toFixed(2));
  }, [selectedMatchesList]);

  const potentialPayout = useMemo(() => {
    return Number((combinedOdds * stake).toFixed(2));
  }, [combinedOdds, stake]);

  const averageConfidence = useMemo(() => {
    if (selectedMatchesList.length === 0) return 0;
    const total = selectedMatchesList.reduce((acc, m) => acc + (m.bankerConfidence || 85), 0);
    return Math.round(total / selectedMatchesList.length);
  }, [selectedMatchesList]);

  // Format Share Text for WhatsApp & Facebook
  const generateShareSummaryText = () => {
    const lines = [
      `🔥 *FOOTBALL ANALYZER PRO - AI BANKER ACCUMULATOR* 🔥`,
      `🎯 *Selected:* ${selectedMatchesList.length} Curated Bankers`,
      `📈 *Combined Multiplier:* @${combinedOdds}x`,
      `💵 *Stake:* ${currency}${(Number(stake) || 0).toFixed(2)} ➡️ *Est. Return:* ${currency}${(Number(potentialPayout) || 0).toFixed(2)}`,
      `⭐ *Avg Banker Conviction:* ${averageConfidence}%`,
      ``,
      `*ANALYZED MATCH LEGS:*`,
      ...selectedMatchesList.map(
        (m, idx) => {
          const mOdds = Number(m?.odds) || 1.5;
          return `${idx + 1}. [${m.sport}] ${m.matchTitle}\n   👉 Pick: *${m.recommendedPick}* (@${mOdds.toFixed(2)})\n   ⏱️ ${m.kickoff} (Banker #${m.bankerRank} - ${m.bankerConfidence}%)\n   💡 ${m.aiAnalysis}`;
        }
      ),
      ``,
      `⚠️ *DISCLAIMER:* Football Analyzer Pro is an independent analytical tool and NOT a bookmaker. Gamble responsibly (18+).`,
      `🔗 Live App: https://footballanalyzerpro.netlify.app/`,
    ];
    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const text = generateShareSummaryText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareFacebook = () => {
    const shareText = generateShareSummaryText();
    navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://footballanalyzerpro.netlify.app/')}`;
    window.open(fbUrl, '_blank');
  };

  const handleCopyShareText = () => {
    const text = generateShareSummaryText();
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Transfer all selected legs to the Betslip tab
  const handleTransferToBetslip = () => {
    if (selectedMatchesList.length === 0) return;

    const legsToAdd = selectedMatchesList.map((m) => ({
      league: m.league,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      matchTitle: m.matchTitle,
      market: m.market,
      selection: m.recommendedPick,
      odds: m.odds,
      kickoff: m.kickoff,
      source: 'upcoming' as const,
      notes: `Banker #${m.bankerRank} (${m.bankerConfidence}% confidence)`,
    }));

    if (onAddMultipleLegs) {
      onAddMultipleLegs(legsToAdd);
    } else {
      legsToAdd.forEach((leg) => onAddLeg(leg));
      onGoToSlip();
    }
  };

  // Generate Bookmaker Booking Code
  const handleGenerateBookingCode = async () => {
    if (selectedMatchesList.length === 0) return;
    try {
      const response = await fetch('/api/betslip/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookmaker: targetBookmaker,
          legs: selectedMatchesList,
          stake,
          currency,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setBookingCodeData({
          code: data.bookingCode,
          bookmaker: data.bookmaker,
          url: data.targetUrl,
        });
        setShowShareModal(true);
      }
    } catch (e) {
      console.error('Failed to generate booking code:', e);
    }
  };

  // Sport Icon Helper
  const getSportIcon = (sportName: string) => {
    const s = sportName.toLowerCase();
    if (s.includes('rugby')) return '🏉';
    if (s.includes('basket')) return '🏀';
    if (s.includes('cricket')) return '🏏';
    if (s.includes('hockey')) return '🏒';
    if (s.includes('american') || s.includes('nfl')) return '🏈';
    return '⚽';
  };

  // Timeframe Badge Helper
  const getTimeframeBadge = (tf: string) => {
    if (tf === 'today') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          TODAY
        </span>
      );
    }
    if (tf === 'tomorrow') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
          TOMORROW
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
        THIS WEEKEND
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Header Banner & Clear Bookmaker Distinction */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shadow-inner">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                AI Upcoming Match Bankers
              </h2>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Gemini Search
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Curated sports banker intelligence for <span className="text-emerald-400 font-semibold">Today</span>,{' '}
              <span className="text-amber-400 font-semibold">Tomorrow</span>, and{' '}
              <span className="text-purple-400 font-semibold">This Weekend</span> across all team sports. Dynamically analyzed and ranked by algorithmic confidence.
            </p>
          </div>

          {/* Distinction Callout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDisclaimerModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-300 hover:text-amber-200 transition-all shadow-sm"
            >
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Not a Bookmaker (Notice)</span>
            </button>

            <button
              onClick={() => fetchUpcomingMatches(timeframe, sport, searchQuery)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3.5 py-2 text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Querying Gemini...' : 'New AI Search'}</span>
            </button>
          </div>
        </div>

        {/* Status / Timestamp bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-slate-300">
              <span>Model Source:</span>
              <span className="font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                {aiSource === 'gemini-live-ai' ? 'Gemini 3.5 AI Engine' : 'Sports Neural Engine'}
              </span>
            </span>
            {lastUpdated && (
              <span className="text-slate-400">
                • Refreshed at <span className="text-slate-200 font-medium">{lastUpdated}</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 italic">
            Matches updated live on each search • 15 Bankers evaluated
          </span>
        </div>
      </div>

      {/* 2. Interactive Search & Filter Controls */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg space-y-3.5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={activeSearchInput}
              onChange={(e) => setActiveSearchInput(e.target.value)}
              placeholder="Search team, tournament, or rivalry (e.g. Real Madrid, Sundowns, Arsenal, Leinster, Lakers)..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition-all shadow-md shadow-emerald-500/20 shrink-0"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search Gemini</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
          {/* Timeframe Filter Pills */}
          <div className="lg:col-span-6 space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3 text-emerald-400" />
              <span>Timeframe</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Upcoming' },
                { id: 'today', label: '⚡ Today (Oct 14)' },
                { id: 'tomorrow', label: '📅 Tomorrow (Oct 15)' },
                { id: 'weekend', label: '🏆 This Weekend (Oct 17-18)' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTimeframe(t.id as any);
                    fetchUpcomingMatches(t.id as any, sport, searchQuery);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    timeframe === t.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sport Filter Pills */}
          <div className="lg:col-span-6 space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span>All Team Sports</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: '🌐 All Sports' },
                { id: 'football', label: '⚽ Football' },
                { id: 'rugby', label: '🏉 Rugby' },
                { id: 'basketball', label: '🏀 Basketball' },
                { id: 'cricket', label: '🏏 Cricket' },
                { id: 'ice_hockey', label: '🏒 NHL' },
                { id: 'american_football', label: '🏈 NFL' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSport(s.id);
                    fetchUpcomingMatches(timeframe, s.id, searchQuery);
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    sport === s.id
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Banker Selection Toolbar: Select All 15, 12, 9, 7, 5, 3 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Banker Accumulator Selection
              </span>
              <span className="text-xs text-slate-400">
                (Click to auto-select top conviction bankers):
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Quickly pick top ranked bankers or customize individually below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300">
              Selected:{' '}
              <span className="font-extrabold text-emerald-400 text-sm">
                {selectedMatchesList.length}
              </span>{' '}
              / 15
            </span>
            <button
              onClick={handleClearSelection}
              className="text-[11px] text-slate-400 hover:text-red-400 transition-colors underline"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleSelectAll}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
              selectedMatchesList.length === 15
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500/50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Select All 15 Bankers</span>
          </button>

          {[
            { count: 12 as BankerSelectionCount, label: 'Top 12 Bankers', badge: '💎 High Yield' },
            { count: 9 as BankerSelectionCount, label: 'Top 9 Bankers', badge: '⚡ Solid Value' },
            { count: 7 as BankerSelectionCount, label: 'Top 7 Bankers', badge: '⭐ Recommended' },
            { count: 5 as BankerSelectionCount, label: 'Top 5 Bankers', badge: '🎯 Safe Banker' },
            { count: 3 as BankerSelectionCount, label: 'Top 3 Bankers', badge: '🔒 Ultra Safe' },
          ].map((preset) => {
            const isActive = selectedMatchesList.length === preset.count;
            return (
              <button
                key={preset.count}
                type="button"
                onClick={() => handleSelectBankersPreset(preset.count)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500/50'
                }`}
              >
                <span>{preset.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${isActive ? 'bg-slate-950/30 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'}`}>
                  {preset.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-200 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => fetchUpcomingMatches(timeframe, sport, searchQuery)}
            className="text-xs font-bold underline text-red-300 hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading && (
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-8 text-center space-y-3 shadow-xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 animate-spin">
            <RefreshCw className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            Querying Live Gemini AI Sports Intelligence...
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Analyzing real sports schedules for Today, Tomorrow, and This Weekend. Evaluating team form, xG, historical head-to-head records, and calculating top 15 banker conviction scores.
          </p>
        </div>
      )}

      {/* 4. List of the 15 Matches with Tactical Analysis & Odds */}
      {!isLoading && matches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Curated 15 Match Bankers</span>
              <span className="text-xs text-slate-400 font-normal">
                (Ranked by Conviction #1 to #15)
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              Click any match to select or expand AI tactical reason
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {matches.map((match) => {
              const isSelected = selectedIds.has(match.id);
              const isExpanded = expandedAnalysisId === match.id;
              const sportIcon = getSportIcon(match.sport);

              return (
                <div
                  key={match.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'border-emerald-500/60 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20 shadow-lg shadow-emerald-950/30'
                      : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      {/* Checkbox and Rank */}
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleMatchSelection(match.id)}
                          className="mt-1 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                          aria-label={isSelected ? 'Deselect match' : 'Select match'}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-emerald-400 fill-emerald-500/20" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-600 hover:text-slate-400" />
                          )}
                        </button>

                        <div className="min-w-0">
                          {/* Top Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="rounded bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-[10px] font-black text-white shrink-0">
                              #{match.bankerRank}
                            </span>
                            <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-300 shrink-0 flex items-center gap-1">
                              <span>{sportIcon}</span>
                              <span>{match.sport}</span>
                            </span>
                            <span className="text-[11px] font-medium text-slate-400 shrink-0">
                              • {match.league}
                            </span>
                            {getTimeframeBadge(match.timeframe)}
                            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                              {match.bankerTag}
                            </span>
                          </div>

                          {/* Match Title & Kickoff */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <h4 className="text-base font-extrabold text-white tracking-tight">
                              {match.homeTeam}{' '}
                              <span className="text-xs font-normal text-slate-400">vs</span>{' '}
                              {match.awayTeam}
                            </h4>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              <span>{match.kickoff}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Pick & Odds Callout */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Banker Pick
                        </span>
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 px-3 py-1.5 text-xs font-black text-emerald-300 shadow-sm">
                          <span>{match.recommendedPick}</span>
                          <span className="rounded bg-emerald-500 text-slate-950 px-1.5 py-0.2 text-[11px] font-black">
                            @{(!isNaN(Number(match.odds)) && Number(match.odds) > 0 ? Number(match.odds) : 1.5).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Conviction:{' '}
                          <span className="font-bold text-emerald-400">
                            {match.bankerConfidence}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Meter Bar */}
                    <div className="mt-3 w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${match.bankerConfidence}%` }}
                      />
                    </div>

                    {/* AI Tactical Summary snippet & Expand Accordion */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="text-slate-300 leading-snug flex items-start gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 sm:line-clamp-1">{match.aiAnalysis}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedAnalysisId(isExpanded ? null : match.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Why Banker?'}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onAddLeg({
                              league: match.league,
                              homeTeam: match.homeTeam,
                              awayTeam: match.awayTeam,
                              matchTitle: match.matchTitle,
                              market: match.market,
                              selection: match.recommendedPick,
                              odds: match.odds,
                              kickoff: match.kickoff,
                              source: 'upcoming',
                              notes: `Banker #${match.bankerRank} (${match.bankerConfidence}%)`,
                            });
                          }}
                          className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3 text-emerald-400" />
                          <span>Add Single</span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Box */}
                    {isExpanded && (
                      <div className="mt-3.5 rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-2.5 text-xs text-slate-300 animate-fadeIn">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                            AI Tactical Analysis & Statistical Edge:
                          </span>
                          <p className="leading-relaxed">{match.aiAnalysis}</p>
                        </div>

                        {match.h2hSummary && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                              Head-to-Head & Form Highlight:
                            </span>
                            <p className="text-slate-400 leading-relaxed">{match.h2hSummary}</p>
                          </div>
                        )}

                        {match.allOdds && (
                          <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="text-slate-400 font-semibold">1X2 Odds:</span>
                            {match.allOdds.home != null && !isNaN(Number(match.allOdds.home)) && (
                              <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                                Home (1): <strong className="text-white">@{Number(match.allOdds.home).toFixed(2)}</strong>
                              </span>
                            )}
                            {match.allOdds.draw != null && !isNaN(Number(match.allOdds.draw)) && (
                              <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                                Draw (X): <strong className="text-white">@{Number(match.allOdds.draw).toFixed(2)}</strong>
                              </span>
                            )}
                            {match.allOdds.away != null && !isNaN(Number(match.allOdds.away)) && (
                              <span className="bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                                Away (2): <strong className="text-white">@{Number(match.allOdds.away).toFixed(2)}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Sticky Bottom Accumulator Results & Share Bar */}
      {selectedMatchesList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-800 bg-[#0d1527]/98 backdrop-blur-lg px-3 py-3 sm:px-6 shadow-2xl">
          <div className="mx-auto max-w-6xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Accumulator Summary Info */}
            <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto pb-1 md:pb-0">
              <div className="shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Accumulator
                </span>
                <span className="text-base font-black text-emerald-400">
                  {selectedMatchesList.length}{' '}
                  <span className="text-xs text-slate-300 font-normal">of 15 Legs</span>
                </span>
              </div>

              <div className="h-8 w-[1px] bg-slate-800 shrink-0" />

              <div className="shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Combined Odds
                </span>
                <span className="text-base font-black text-amber-300">
                  @{combinedOdds}x
                </span>
              </div>

              <div className="h-8 w-[1px] bg-slate-800 shrink-0" />

              {/* Stake input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Stake ({currency})
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-bold">{currency}</span>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={stake}
                      onChange={(e) => setStake(Math.max(1, Number(e.target.value) || 10))}
                      className="w-16 rounded bg-slate-900 border border-slate-700 px-1.5 py-0.5 text-xs font-bold text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="h-8 w-[1px] bg-slate-800 shrink-0" />

              <div className="shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Est. Return
                </span>
                <span className="text-base font-black text-emerald-300">
                  {currency}
                  {(Number(potentialPayout) || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons: WhatsApp, Facebook, Transfer to Betslip, Bookmaker Code */}
            <div className="flex items-center gap-2 shrink-0 justify-end">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                title="Share accumulator on WhatsApp"
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 text-xs transition-all shadow-md shadow-emerald-600/20"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden xs:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleShareFacebook}
                title="Share or copy for Facebook"
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 text-xs transition-all shadow-md shadow-blue-600/20"
              >
                <Facebook className="h-4 w-4" />
                <span className="hidden xs:inline">Facebook</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateBookingCode}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3.5 py-2 text-xs transition-all shadow-md shadow-amber-500/20"
              >
                <Share2 className="h-4 w-4" />
                <span>Bookmaker Slip</span>
              </button>

              <button
                type="button"
                onClick={handleTransferToBetslip}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-2 text-xs transition-all shadow-md shadow-emerald-500/20"
              >
                <span>Add to Slip Tab</span>
                <span className="rounded bg-slate-950 text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {selectedMatchesList.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Bookmaker Distinction Modal */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Independent Analytical Intelligence Platform
                </h3>
                <p className="text-xs text-amber-300 font-semibold mt-0.5">
                  Football Analyzer Pro is NOT a Bookmaker or Betting Operator
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>1. No Real-Money Wagering:</strong> This application does not accept wagers, hold player funds, process bets, or operate as a licensed bookmaker or casino in any jurisdiction.
              </p>
              <p>
                <strong>2. Algorithmic Projections:</strong> All probabilities, decimal odds, and &quot;Banker&quot; conviction rankings are computational statistical projections calculated via Gemini artificial intelligence for informational and entertainment study.
              </p>
              <p>
                <strong>3. Bookmaker Slip Transfer:</strong> When generating a booking code or transfer link (e.g. for Hollywoodbets or Betway), the picks are strictly formatted for you to manually load into your own pre-existing, licensed personal betting account.
              </p>
              <p>
                <strong>4. Responsible Gaming (18+):</strong> Sports betting carries risk. Never gamble with money you cannot afford to lose. Please adhere to your local gambling regulations.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDisclaimerModal(false)}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 text-xs transition-all shadow-md"
              >
                I Understand & Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Bookmaker Transfer & Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Share2 className="h-4 w-4" />
                </span>
                <h3 className="text-base font-bold text-white">Bookmaker Bet Slip Transfer</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Target Bookmaker:
                </label>
                <select
                  value={targetBookmaker}
                  onChange={(e) => {
                    setTargetBookmaker(e.target.value);
                  }}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="Hollywoodbets">Hollywoodbets</option>
                  <option value="Betway">Betway</option>
                  <option value="Supabets">Supabets</option>
                  <option value="Bet365">Bet365</option>
                  <option value="Sportingbet">Sportingbet</option>
                </select>
              </div>

              {bookingCodeData && (
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Generated Booking Reference
                  </span>
                  <div className="text-2xl font-black text-amber-300 font-mono tracking-widest">
                    {bookingCodeData.code}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Use this code to load these {selectedMatchesList.length} banker legs into your{' '}
                    {bookingCodeData.bookmaker} account.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2.5 text-xs transition-all shadow-md"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Send to WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareText}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold p-2.5 text-xs transition-all border border-slate-700"
                >
                  <Copy className="h-4 w-4" />
                  <span>{copiedShare ? 'Copied Slip!' : 'Copy Summary'}</span>
                </button>
              </div>

              {bookingCodeData?.url && (
                <a
                  href={bookingCodeData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black p-3 text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  <span>Open {targetBookmaker} Live Slip ↗</span>
                </a>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center">
              ⚠️ Football Analyzer Pro is an independent analytical tool and not affiliated with any gambling operator.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
