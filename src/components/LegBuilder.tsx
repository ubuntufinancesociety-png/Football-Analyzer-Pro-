import React, { useState } from 'react';
import {
  PlusCircle,
  Check,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  Dices,
  Info,
} from 'lucide-react';
import { MatchLeg, MarketType } from '../types/betslip';

interface LegBuilderProps {
  onAddLeg: (leg: Omit<MatchLeg, 'id' | 'active'>) => void;
  onGoToSlip: () => void;
  currency: string;
  stake: number;
}

const COMMON_LEAGUES = [
  'Premier League',
  'DStv Premiership (PSL)',
  'UEFA Champions League',
  'La Liga',
  'Serie A',
  'Bundesliga',
  'Championship',
  'Ligue 1',
  'CAF Champions League',
];

const MARKETS: Array<{ type: MarketType; label: string; quickPicks: string[] }> = [
  {
    type: '1X2',
    label: 'Match Result (1X2)',
    quickPicks: ['Home Win (1)', 'Draw (X)', 'Away Win (2)'],
  },
  {
    type: 'Double Chance',
    label: 'Double Chance',
    quickPicks: ['1X (Home or Draw)', 'X2 (Draw or Away)', '12 (Home or Away)'],
  },
  {
    type: 'Over/Under Goals',
    label: 'Over / Under Total Goals',
    quickPicks: ['Over 1.5 Goals', 'Over 2.5 Goals', 'Under 2.5 Goals', 'Over 3.5 Goals'],
  },
  {
    type: 'Both Teams To Score',
    label: 'Both Teams To Score (BTTS)',
    quickPicks: ['Yes (Goal / Goal)', 'No (Clean sheet either side)'],
  },
  {
    type: 'Draw No Bet',
    label: 'Draw No Bet (DNB)',
    quickPicks: ['Home (Draw No Bet)', 'Away (Draw No Bet)'],
  },
  {
    type: 'Handicap',
    label: 'Handicap (Spread)',
    quickPicks: ['Home (-1)', 'Away (+1)', 'Home (-1.5)', 'Away (+1.5)'],
  },
  {
    type: 'Custom',
    label: 'Custom Market',
    quickPicks: ['Anytime Goalscorer', 'Over 8.5 Corners', 'Over 3.5 Cards'],
  },
];

export const LegBuilder: React.FC<LegBuilderProps> = ({
  onAddLeg,
  onGoToSlip,
  currency,
  stake,
}) => {
  const [league, setLeague] = useState('Premier League');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<MarketType>('1X2');
  const [selection, setSelection] = useState('Home Win (1)');
  const [customSelection, setCustomSelection] = useState('');
  const [oddsStr, setOddsStr] = useState('1.95');
  const [notes, setNotes] = useState('');
  const [lastAddedLeg, setLastAddedLeg] = useState<string | null>(null);

  const currentMarketConfig = MARKETS.find((m) => m.type === selectedMarket) || MARKETS[0];
  const parsedOdds = parseFloat(oddsStr) || 1.0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const home = homeTeam.trim() || 'Home Team';
    const away = awayTeam.trim() || 'Away Team';
    const finalSelection = selectedMarket === 'Custom' && customSelection ? customSelection : selection;
    const finalOdds = parsedOdds > 1 ? Number(parsedOdds.toFixed(2)) : 1.5;

    onAddLeg({
      league: league.trim() || 'Soccer',
      homeTeam: home,
      awayTeam: away,
      matchTitle: `${home} vs ${away}`,
      market: selectedMarket,
      selection: finalSelection,
      odds: finalOdds,
      source: 'manual',
      notes: notes.trim() || undefined,
    });

    setLastAddedLeg(`${home} vs ${away} - ${finalSelection} @ ${finalOdds}`);

    // Reset team names for next leg, keeping league for fast multi-entry
    setHomeTeam('');
    setAwayTeam('');
    setCustomSelection('');

    setTimeout(() => {
      setLastAddedLeg(null);
    }, 4000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header section */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-5 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <PlusCircle className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Create Custom Leg
          </h2>
        </div>
        <p className="mt-1 text-xs sm:text-sm text-slate-300">
          Build any bet selection manually and send it directly to your betslip accumulator.
        </p>
      </div>

      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-[#0f172a] p-5 sm:p-6 shadow-xl space-y-5"
      >
        {/* League Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            League / Competition
          </label>
          <input
            type="text"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            placeholder="e.g. Premier League or DStv PSL"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
            required
          />

          {/* Quick league chips */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {COMMON_LEAGUES.map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => setLeague(l)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  league === l
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Teams Input: Home vs Away */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Home Team
            </label>
            <input
              type="text"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              placeholder="e.g. Mamelodi Sundowns"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-emerald-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Away Team
            </label>
            <input
              type="text"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder="e.g. Orlando Pirates"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm font-semibold text-white focus:border-emerald-500 outline-none"
              required
            />
          </div>
        </div>

        {/* Market Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Market Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MARKETS.map((m) => (
              <button
                type="button"
                key={m.type}
                onClick={() => {
                  setSelectedMarket(m.type);
                  setSelection(m.quickPicks[0]);
                }}
                className={`rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
                  selectedMarket === m.type
                    ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selection Shortcuts */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Selection (Pick)
          </label>
          <div className="flex flex-wrap gap-2">
            {currentMarketConfig.quickPicks.map((pick) => (
              <button
                type="button"
                key={pick}
                onClick={() => setSelection(pick)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  selection === pick
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
              >
                {pick}
              </button>
            ))}
          </div>

          {selectedMarket === 'Custom' && (
            <div className="mt-2.5">
              <input
                type="text"
                value={customSelection}
                onChange={(e) => setCustomSelection(e.target.value)}
                placeholder="Type your custom selection e.g. Bukayo Saka to score anytime"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Odds Input & Payout Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Decimal Odds
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1.01"
                max="500"
                value={oddsStr}
                onChange={(e) => setOddsStr(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-base font-bold text-emerald-400 focus:border-emerald-500 outline-none"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-slate-500 font-mono">
                Odds
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Single Leg Return ({currency}{stake})
            </label>
            <div className="flex h-[42px] items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3.5">
              <span className="text-xs text-slate-400">Potential Return</span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {currency}
                {(parsedOdds * stake).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Notes / Tag (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Banker, High Value, Derby Match"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-300 outline-none focus:border-slate-700"
          />
        </div>

        {/* Action Button */}
        <button
          type="submit"
          className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Leg Directly to Betslip</span>
        </button>
      </form>

      {/* Confirmation feedback card */}
      {lastAddedLeg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-300 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <div>
              <span className="font-bold">Leg Added: </span>
              <span>{lastAddedLeg}</span>
            </div>
          </div>
          <button
            onClick={onGoToSlip}
            className="inline-flex items-center gap-1 font-bold text-white bg-emerald-500/30 border border-emerald-500/40 rounded-lg px-2.5 py-1 hover:bg-emerald-500/50"
          >
            <span>View Slip</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
};
