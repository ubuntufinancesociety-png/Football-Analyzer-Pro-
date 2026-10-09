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
  source: 'ocr' | 'upcoming' | 'manual';
  active: boolean;
  notes?: string;
}

export interface ScannedMatch {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  matchTime?: string;
  homeOdds?: number | null;
  drawOdds?: number | null;
  awayOdds?: number | null;
  extraMarkets?: Array<{
    market: string;
    selection: string;
    odds: number;
  }>;
  detectedSelection?: {
    selection: string;
    odds: number;
    market?: string;
  };
  confidence: number;
  isCustom?: boolean;
}

export interface OcrParseResult {
  success: boolean;
  bookmaker: string;
  detectedLayout: string;
  matchCount: number;
  matches: ScannedMatch[];
  rawSummary?: string;
  debugDiagnostics?: {
    modelUsed?: string;
    processingTimeMs?: number;
    rawGeminiResponse?: any;
    fieldMappingsSummary?: Array<{
      matchId: string;
      league: string;
      teams: { home: string; away: string };
      oddsMapping: Record<string, number | null>;
      extraMarketsCount: number;
      confidenceScore: number;
      hasFull1X2: boolean;
      status: 'OK' | 'INCOMPLETE_ODDS' | 'MISSING_TEAMS';
    }>;
  };
  error?: string;
}

export interface UpcomingMatch {
  id: string;
  league: string;
  country: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  date: string;
  odds: {
    home: number;
    draw: number;
    away: number;
    over25?: number;
    under25?: number;
    bttsYes?: number;
  };
  hot?: boolean;
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
