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

export interface BoundingBox {
  ymin: number; // 0 to 1000 normalized coordinate
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectedBoundingBoxItem {
  id: string;
  type: 'match_row' | 'league' | 'home_team' | 'away_team' | 'home_odds' | 'draw_odds' | 'away_odds' | 'bookmaker_header';
  label: string;
  value?: string | number;
  box: BoundingBox;
  confidence?: number;
  matchId?: string;
  isWarning?: boolean;
  warningNote?: string;
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
  boundingBox?: BoundingBox;
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
    boundingBoxes?: DetectedBoundingBoxItem[];
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

