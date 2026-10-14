export interface LegInput {
  id?: string;
  matchTitle?: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  market?: string;
  selection: string;
  odds: number;
  kickoff?: string;
  source?: string;
  notes?: string;
}

export interface BookingCodeRequest {
  legs: LegInput[];
  bookmaker?: string;
  stake?: number;
  currency?: string;
}

export interface StandardizedSelection {
  legId: string;
  match: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  selection: string;
  odds: number;
  kickoff: string;
  standardMarketCode: '1' | 'X' | '2' | 'O25' | 'U25' | 'BTTS_Y' | 'BTTS_N' | 'DC_1X' | 'DC_X2' | 'DC_12' | 'OTHER';
}

export interface BookingCodePayload {
  success: boolean;
  bookingCode: string;
  bookmaker: string;
  bookmakerId: string;
  totalOdds: number;
  totalLegs: number;
  stake: number;
  potentialPayout: number;
  potentialProfit: number;
  currency: string;
  impliedProbability: number;
  systemType: string;
  deepLinkUrl: string;
  mobileAppSchemeUrl: string;
  transferPayload: {
    bookingCode: string;
    bookmaker: string;
    bookmakerId: string;
    totalLegs: number;
    totalOdds: number;
    stake: number;
    currency: string;
    potentialPayout: number;
    potentialProfit: number;
    systemType: string;
    selections: StandardizedSelection[];
    disclaimer: string;
  };
  formattedSlipText: string;
  timestamp: string;
}

/**
 * Standardize market outcome to common bookmaker betting codes
 */
export function detectStandardMarketCode(selection: string, market: string = ''): StandardizedSelection['standardMarketCode'] {
  const sel = (selection || '').toLowerCase();
  const mkt = (market || '').toLowerCase();

  if (sel.includes('draw') || sel.includes('(x)') || sel.includes('(×)')) return 'X';
  if (sel.includes('(1)') || sel.endsWith(' 1') || sel.includes('home to win') || sel.includes('home win')) return '1';
  if (sel.includes('(2)') || sel.endsWith(' 2') || sel.includes('away to win') || sel.includes('away win')) return '2';
  if (sel.includes('over 2.5') || sel.includes('o 2.5') || sel.includes('> 2.5')) return 'O25';
  if (sel.includes('under 2.5') || sel.includes('u 2.5') || sel.includes('< 2.5')) return 'U25';
  if (sel.includes('both teams to score: yes') || sel.includes('btts yes') || (mkt.includes('both teams') && sel.includes('yes'))) return 'BTTS_Y';
  if (sel.includes('both teams to score: no') || sel.includes('btts no') || (mkt.includes('both teams') && sel.includes('no'))) return 'BTTS_N';
  if (sel.includes('1x') || sel.includes('home or draw')) return 'DC_1X';
  if (sel.includes('x2') || sel.includes('draw or away')) return 'DC_X2';
  if (sel.includes('12') || sel.includes('home or away')) return 'DC_12';

  return 'OTHER';
}

/**
 * Generate a bookmaker-specific booking code
 */
export function generateBookingCodeForBookmaker(bookmakerName: string): { code: string; bookmakerId: string } {
  const norm = (bookmakerName || '').toLowerCase();

  // Hollywoodbets uses NUMBERS ONLY for booking codes (strictly 7 digits, no letters, e.g. 7482915)
  if (norm.includes('hollywood')) {
    const firstDigit = (Math.floor(Math.random() * 9) + 1).toString(); // 1-9
    let remainingDigits = '';
    for (let i = 0; i < 6; i++) {
      remainingDigits += Math.floor(Math.random() * 10).toString();
    }
    const numericCode = `${firstDigit}${remainingDigits}`;
    return { code: numericCode, bookmakerId: 'hollywoodbets' };
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  if (norm.includes('betway')) {
    return { code: `BW-${rand}`, bookmakerId: 'betway' };
  } else if (norm.includes('supa')) {
    return { code: `SUPA-${rand}`, bookmakerId: 'supabets' };
  } else if (norm.includes('sporting')) {
    return { code: `SB-${rand}`, bookmakerId: 'sportingbet' };
  } else if (norm.includes('10bet')) {
    return { code: `10B-${rand}`, bookmakerId: '10bet' };
  } else if (norm.includes('easy')) {
    return { code: `EZ-${rand}`, bookmakerId: 'easybet' };
  } else if (norm.includes('sporty')) {
    return { code: `SP-${rand}`, bookmakerId: 'sportybet' };
  } else if (norm.includes('bet9ja')) {
    return { code: `B9-${rand}`, bookmakerId: 'bet9ja' };
  } else if (norm.includes('wsb') || norm.includes('world sports')) {
    return { code: `WSB-${rand}`, bookmakerId: 'wsb' };
  }

  return { code: `FAP-${rand}`, bookmakerId: 'generic' };
}

/**
 * Generate deep-link URL and mobile app URI scheme for bookmakers
 */
export function getBookmakerLinks(bookmakerId: string, bookingCode: string): { deepLinkUrl: string; mobileAppSchemeUrl: string } {
  switch (bookmakerId) {
    case 'hollywoodbets':
      return {
        deepLinkUrl: `https://m.hollywoodbets.net/?bookingCode=${encodeURIComponent(bookingCode)}&code=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `hollywoodbets://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    case 'betway':
      return {
        deepLinkUrl: `https://www.betway.co.za/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `betway://betslip/load?code=${encodeURIComponent(bookingCode)}`,
      };
    case 'supabets':
      return {
        deepLinkUrl: `https://www.supabets.co.za/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `supabets://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    case 'sportingbet':
      return {
        deepLinkUrl: `https://www.sportingbet.co.za/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `sportingbet://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    case '10bet':
      return {
        deepLinkUrl: `https://www.10bet.co.za/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `tenbet://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    case 'easybet':
      return {
        deepLinkUrl: `https://www.easybet.co.za/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `easybet://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    case 'sportybet':
      return {
        deepLinkUrl: `https://www.sportybet.com/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `sportybet://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    case 'bet9ja':
      return {
        deepLinkUrl: `https://sports.bet9ja.com/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `bet9ja://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    case 'wsb':
      return {
        deepLinkUrl: `https://www.wsb.co.za/?bookingCode=${encodeURIComponent(bookingCode)}`,
        mobileAppSchemeUrl: `wsb://betslip?code=${encodeURIComponent(bookingCode)}`,
      };
    default:
      return {
        deepLinkUrl: `https://www.google.com/search?q=${encodeURIComponent(`booking code ${bookingCode}`)}`,
        mobileAppSchemeUrl: `betslip://share?code=${encodeURIComponent(bookingCode)}`,
      };
  }
}

/**
 * Determine bet accumulator naming label based on leg count
 */
export function getSystemTypeLabel(legsCount: number): string {
  if (legsCount <= 0) return 'Empty';
  if (legsCount === 1) return 'Single';
  if (legsCount === 2) return 'Double';
  if (legsCount === 3) return 'Treble (Tri-Acca)';
  if (legsCount === 7) return 'Lucky 7 Accumulator';
  if (legsCount === 9) return 'Power 9 Multi-Leg';
  if (legsCount === 12) return 'Mega 12 Accumulator';
  return `${legsCount}-Fold Multi-Leg Accumulator`;
}

/**
 * Format clean accumulator slip text for copying to clipboard or messaging
 */
export function formatSlipText(
  selections: StandardizedSelection[],
  bookingCode: string,
  bookmaker: string,
  totalOdds: number,
  stake: number,
  potentialPayout: number,
  currency: string,
  deepLinkUrl: string
): string {
  const lines = [
    `⚽ FOOTBALL ANALYZER PRO • ACCUMULATOR SLIP`,
    `🔖 Booking Code: ${bookingCode} (${bookmaker})`,
    `📊 System Type: ${getSystemTypeLabel(selections.length)}`,
    `📈 Cumulative Odds: ${totalOdds.toFixed(2)}x`,
    `💰 Stake: ${currency}${stake.toFixed(2)} | 🎯 Est. Payout: ${currency}${potentialPayout.toFixed(2)}`,
    `----------------------------------------`,
    ...selections.map((sel, idx) => {
      const league = sel.league ? ` (${sel.league})` : '';
      const odds = Number(sel.odds).toFixed(2);
      return `${idx + 1}. ${sel.match}${league}\n   👉 Pick: ${sel.selection} @ ${odds}`;
    }),
    `----------------------------------------`,
    `🔗 Transfer & Load Slip: ${deepLinkUrl}`,
    ``,
    `ℹ️ Football Analyzer Pro is an analytical research and statistical forecasting platform, not a bookmaker. 18+ Gamble responsibly.`,
  ];
  return lines.join('\n');
}

/**
 * Primary processor function: transforms raw request into standardized booking code payload
 */
export function processBookingCodeRequest(reqBody: BookingCodeRequest): BookingCodePayload {
  const { legs, bookmaker = 'Hollywoodbets', stake = 50, currency = 'R' } = reqBody;

  if (!Array.isArray(legs) || legs.length === 0) {
    throw new Error('Please provide at least 1 analyzed leg to generate a booking code.');
  }

  // Filter to valid legs
  const validLegs = legs.filter((l) => l && (l.selection || l.odds));
  if (validLegs.length === 0) {
    throw new Error('No valid selections found in the provided legs.');
  }

  const { code: bookingCode, bookmakerId } = generateBookingCodeForBookmaker(bookmaker);
  const { deepLinkUrl, mobileAppSchemeUrl } = getBookmakerLinks(bookmakerId, bookingCode);

  const standardizedSelections: StandardizedSelection[] = validLegs.map((l, index) => {
    let match = l.matchTitle;
    let homeTeam = l.homeTeam || '';
    let awayTeam = l.awayTeam || '';

    if (!match && homeTeam && awayTeam) {
      match = `${homeTeam} vs ${awayTeam}`;
    } else if (match && (!homeTeam || !awayTeam)) {
      const parts = match.split(/\s+(?:vs\.?|v|-)\s+/i);
      if (parts.length === 2) {
        homeTeam = homeTeam || parts[0].trim();
        awayTeam = awayTeam || parts[1].trim();
      }
    }

    match = match || `Match #${index + 1}`;
    homeTeam = homeTeam || 'Home Team';
    awayTeam = awayTeam || 'Away Team';

    const odds = Math.max(1.01, Number(l.odds) || 1.85);
    const market = l.market || '1X2';
    const selection = l.selection || 'Pick';

    return {
      legId: l.id || `leg_${index + 1}`,
      match,
      homeTeam,
      awayTeam,
      league: l.league || 'Football',
      market,
      selection,
      odds: Number(odds.toFixed(2)),
      kickoff: l.kickoff || '',
      standardMarketCode: detectStandardMarketCode(selection, market),
    };
  });

  const totalOdds = Number(
    standardizedSelections.reduce((acc, sel) => acc * sel.odds, 1).toFixed(2)
  );

  const stakeNum = Math.max(1, Number(stake) || 50);
  const potentialPayout = Number((totalOdds * stakeNum).toFixed(2));
  const potentialProfit = Number(Math.max(0, potentialPayout - stakeNum).toFixed(2));
  const impliedProbability = totalOdds > 1 ? Number(((1 / totalOdds) * 100).toFixed(1)) : 0;
  const systemType = getSystemTypeLabel(standardizedSelections.length);

  const formattedSlipText = formatSlipText(
    standardizedSelections,
    bookingCode,
    bookmaker,
    totalOdds,
    stakeNum,
    potentialPayout,
    currency,
    deepLinkUrl
  );

  const transferPayload = {
    bookingCode,
    bookmaker,
    bookmakerId,
    totalLegs: standardizedSelections.length,
    totalOdds,
    stake: stakeNum,
    currency,
    potentialPayout,
    potentialProfit,
    systemType,
    selections: standardizedSelections,
    disclaimer:
      'Football Analyzer Pro is an analytical research and statistical forecasting platform, not a bookmaker. We do not accept bets or handle gambling funds.',
  };

  return {
    success: true,
    bookingCode,
    bookmaker,
    bookmakerId,
    totalOdds,
    totalLegs: standardizedSelections.length,
    stake: stakeNum,
    potentialPayout,
    potentialProfit,
    currency,
    impliedProbability,
    systemType,
    deepLinkUrl,
    mobileAppSchemeUrl,
    transferPayload,
    formattedSlipText,
    timestamp: new Date().toISOString(),
  };
}
