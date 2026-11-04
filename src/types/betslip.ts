export type MarketType =
  | '1X2'
  | 'Double Chance'
  | 'Over/Under Goals'
  | 'Both Teams To Score'
  | 'Draw No Bet'
  | 'Handicap'
  | 'Correct Score'
  | 'Custom';

export interface MatchLeg {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchTitle: string;
  market: MarketType | string;
  selection: string;
  odds: number;
  kickoff?: string;
  source: 'upcoming' | 'manual';
  active: boolean;
  notes?: string;
}

export interface BookmakerTransferTarget {
  id: string;
  name: string;
  url: string;
  primaryColor: string;
  accentColor: string;
  region: string;
  instructions: string;
}

export type BankerSelectionCount = 3 | 5 | 7 | 9 | 12 | 15;
export type MultiLegPreset = 3 | 7 | 9 | 12;
export type MultiLegStrategy = 'confidence' | 'balanced' | 'value';

export interface BookingCodeResponse {
  success: boolean;
  bookingCode: string;
  bookmaker: string;
  totalOdds: number;
  totalLegs: number;
  stake: number;
  potentialPayout: number;
  currency: string;
  deepLinkUrl: string;
  transferPayload: {
    bookingCode: string;
    bookmaker: string;
    totalLegs: number;
    totalOdds: number;
    stake: number;
    currency: string;
    potentialPayout: number;
    selections: Array<{
      match: string;
      league: string;
      market: string;
      selection: string;
      odds: number;
      kickoff?: string;
    }>;
    disclaimer: string;
  };
  formattedSlipText: string;
  timestamp: string;
  error?: string;
}

export interface AnalyzedBankerMatch {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchTitle: string;
  kickoff: string;
  timeframe: 'today' | 'tomorrow' | 'weekend';
  market: string;
  recommendedPick: string;
  odds: number;
  bankerRank: number; // 1 to 15
  bankerConfidence: number; // e.g. 96%
  bankerTag: string;
  aiAnalysis: string;
  h2hSummary: string;
  allOdds: {
    home: number;
    draw?: number;
    away: number;
  };
  selectionReason?: string;
}

export interface Formula87Match {
  id: string;
  league: string;
  country?: string;
  homeTeam: string;
  awayTeam: string;
  matchTitle: string;
  kickoff: string;
  timeframe: 'today' | 'tomorrow' | 'weekend';
  market: string; // "Over 1.5 Goals"
  recommendedPick: string; // "Over 1.5 Goals"
  odds: number; // e.g. 1.28
  impliedProbability: number; // (1 / odds) * 100
  trueProbability: number; // 87.0
  mathematicalEdge: number; // 87.0 - impliedProbability
  combinedGoalAvg: number; // Goal average of both teams (>= 2.40)
  h2hOver15Rate: number; // % of H2H matches clearing 1.5 goals (>= 80%)
  teamAScoredLast5: number; // Scored in X of last 5
  teamBScoredLast5: number; // Scored in X of last 5
  shutoutsA: number; // Number of scoreless games in last 5 (max 1 allowed)
  shutoutsB: number; // Number of scoreless games in last 5 (max 1 allowed)
  formulaPassed: boolean;
  statusBadge: string;
  aiTacticalAnalysis: string;
  h2hDetails: string;
}

