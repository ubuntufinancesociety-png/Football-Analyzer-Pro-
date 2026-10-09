import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Flame,
  Check,
  Plus,
  ArrowRight,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { MatchLeg, UpcomingMatch } from '../types/betslip';
import { UPCOMING_MATCHES } from '../data/mockFixtures';

interface UpcomingMatchesProps {
  onAddLeg: (leg: Omit<MatchLeg, 'id' | 'active'>) => void;
  activeLegs: MatchLeg[];
  onGoToSlip: () => void;
}

export const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({
  onAddLeg,
  activeLegs,
  onGoToSlip,
}) => {
  const [selectedLeague, setSelectedLeague] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const leaguesList = [
    'All',
    'Premier League',
    'DStv Premiership (PSL)',
    'UEFA Champions League',
    'La Liga',
    'Serie A',
    'Bundesliga',
  ];

  const filteredMatches = UPCOMING_MATCHES.filter((m) => {
    const matchesLeague = selectedLeague === 'All' || m.league === selectedLeague;
    const matchesSearch =
      m.homeTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.awayTeam.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.league.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLeague && matchesSearch;
  });

  const isLegInSlip = (home: string, away: string, pick: string) => {
    return activeLegs.some(
      (l) => l.homeTeam === home && l.awayTeam === away && l.selection.includes(pick)
    );
  };

  const handleSelectOutcome = (
    match: UpcomingMatch,
    pickType: 'home' | 'draw' | 'away' | 'o25' | 'u25' | 'btts',
    odds: number,
    selectionName: string,
    marketName: string
  ) => {
    onAddLeg({
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchTitle: `${match.homeTeam} vs ${match.awayTeam}`,
      market: marketName,
      selection: selectionName,
      odds,
      kickoff: match.kickoff,
      source: 'upcoming',
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Calendar className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Daily Populated Upcoming Matches
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              Browse top fixtures from Premier League, PSL, and Europe. Tap any odds button to populate your betslip instantly.
            </p>
          </div>

          {activeLegs.length > 0 && (
            <button
              onClick={onGoToSlip}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20 shrink-0 self-start sm:self-auto"
            >
              <span>View Slip ({activeLegs.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips & Search */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="flex flex-wrap gap-1.5 items-center">
            {leaguesList.map((lg) => (
              <button
                key={lg}
                onClick={() => setSelectedLeague(lg)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  selectedLeague === lg
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {lg}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team or league..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredMatches.map((match) => {
          const homeAdded = isLegInSlip(match.homeTeam, match.awayTeam, 'Home Win');
          const drawAdded = isLegInSlip(match.homeTeam, match.awayTeam, 'Draw');
          const awayAdded = isLegInSlip(match.homeTeam, match.awayTeam, 'Away Win');

          return (
            <div
              key={match.id}
              className="rounded-2xl border border-slate-800 bg-[#0f172a] p-4 shadow-lg hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: League & Kickoff */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-400">{match.league}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400">{match.country}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {match.hot && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <Flame className="h-3 w-3" />
                        HOT
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {match.kickoff}
                    </span>
                  </div>
                </div>

                {/* Match Teams */}
                <div className="flex items-center justify-between py-1 mb-3.5">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{match.homeTeam}</span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-1">
                      <span>{match.awayTeam}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-600 tracking-widest uppercase">VS</span>
                </div>
              </div>

              {/* 1X2 Main Market Odds */}
              <div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      handleSelectOutcome(
                        match,
                        'home',
                        match.odds.home,
                        `${match.homeTeam} to Win (1)`,
                        '1X2'
                      )
                    }
                    className={`rounded-xl border p-2 text-center transition-all ${
                      homeAdded
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                      <span>1 (Home)</span>
                      {homeAdded && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                    </div>
                    <div className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                      {match.odds.home.toFixed(2)}
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      handleSelectOutcome(match, 'draw', match.odds.draw, 'Draw (X)', '1X2')
                    }
                    className={`rounded-xl border p-2 text-center transition-all ${
                      drawAdded
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                      <span>X (Draw)</span>
                      {drawAdded && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                    </div>
                    <div className="font-mono text-sm font-black text-amber-400 mt-0.5">
                      {match.odds.draw.toFixed(2)}
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      handleSelectOutcome(
                        match,
                        'away',
                        match.odds.away,
                        `${match.awayTeam} to Win (2)`,
                        '1X2'
                      )
                    }
                    className={`rounded-xl border p-2 text-center transition-all ${
                      awayAdded
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center justify-center gap-1">
                      <span>2 (Away)</span>
                      {awayAdded && <Check className="h-2.5 w-2.5 text-emerald-400" />}
                    </div>
                    <div className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                      {match.odds.away.toFixed(2)}
                    </div>
                  </button>
                </div>

                {/* Sub-markets: Over 2.5 & BTTS */}
                {(match.odds.over25 || match.odds.bttsYes) && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    {match.odds.over25 && (
                      <button
                        onClick={() =>
                          handleSelectOutcome(
                            match,
                            'o25',
                            match.odds.over25!,
                            'Over 2.5 Goals',
                            'Over/Under'
                          )
                        }
                        className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800"
                      >
                        <span>O 2.5:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {match.odds.over25.toFixed(2)}
                        </span>
                      </button>
                    )}

                    {match.odds.bttsYes && (
                      <button
                        onClick={() =>
                          handleSelectOutcome(
                            match,
                            'btts',
                            match.odds.bttsYes!,
                            'Both Teams To Score (Yes)',
                            'BTTS'
                          )
                        }
                        className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800"
                      >
                        <span>BTTS Yes:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {match.odds.bttsYes.toFixed(2)}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
