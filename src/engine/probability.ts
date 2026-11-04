import { FORMULA_CONFIG } from './config';

/** True when `odds` is a finite decimal price within the configured range. */
export function isValidDecimalOdds(odds: unknown, cfg = FORMULA_CONFIG): odds is number {
  return (
    typeof odds === 'number' &&
    Number.isFinite(odds) &&
    odds >= cfg.minValidDecimalOdds &&
    odds <= cfg.maxValidDecimalOdds
  );
}

/** Bookmaker implied probability (0..1) from decimal odds: 1 / odds. Null when odds are invalid. */
export function impliedProbability(odds: unknown): number | null {
  return isValidDecimalOdds(odds) ? 1 / odds : null;
}

export interface HitRate {
  hits: number;
  sample: number;
  /** 0..1 — an observed frequency in a small sample, NOT a calibrated probability. */
  rate: number;
}

/** Historical hit rate (observed frequency). Null when inputs are missing or inconsistent. */
export function historicalHitRate(hits: number | null | undefined, sample: number | null | undefined): HitRate | null {
  if (hits == null || sample == null) return null;
  if (!Number.isInteger(hits) || !Number.isInteger(sample) || sample <= 0 || hits < 0 || hits > sample) return null;
  return { hits, sample, rate: hits / sample };
}

export interface ExpectedValueResult {
  probability: number; // 0..1
  odds: number;
  /** Expected profit per 1 unit staked: p * odds - 1 */
  evPerUnit: number;
  evPct: number;
  /** Human-readable calculation, e.g. "EV = 0.800 × 1.30 − 1 = +0.040 (+4.0%)" */
  calculation: string;
}

export type ExpectedValueOutcome =
  | { available: true; result: ExpectedValueResult }
  | { available: false; reason: string };

/**
 * Expected value of a 1-unit stake. Only computed when BOTH a defensible probability estimate
 * (0 < p < 1) and valid decimal odds are supplied. Never infers a probability by itself.
 */
export function expectedValue(probability: number | null | undefined, odds: number | null | undefined): ExpectedValueOutcome {
  if (probability == null || !Number.isFinite(probability)) {
    return { available: false, reason: 'No defensible probability estimate supplied.' };
  }
  if (probability <= 0 || probability >= 1) {
    return { available: false, reason: 'Probability estimate must be strictly between 0% and 100%.' };
  }
  if (!isValidDecimalOdds(odds)) {
    return { available: false, reason: 'Valid decimal bookmaker odds are required.' };
  }
  const evPerUnit = probability * odds - 1;
  const sign = evPerUnit >= 0 ? '+' : '−';
  const abs = Math.abs(evPerUnit);
  return {
    available: true,
    result: {
      probability,
      odds,
      evPerUnit,
      evPct: evPerUnit * 100,
      calculation: `EV = ${probability.toFixed(3)} × ${odds.toFixed(2)} − 1 = ${sign}${abs.toFixed(3)} per unit (${sign}${(abs * 100).toFixed(1)}%)`,
    },
  };
}

/**
 * Gap between the (unverified) branding benchmark and the bookmaker implied probability,
 * in percentage points. Reproduces the original "edge = 87 − implied" display value.
 * This is NOT expected value.
 */
export function benchmarkGapPct(odds: unknown, benchmarkPct: number = FORMULA_CONFIG.benchmarkPct): number | null {
  const ip = impliedProbability(odds);
  return ip == null ? null : benchmarkPct - ip * 100;
}

export interface AccumulatorResult {
  legs: number;
  combinedOdds: number;
  impliedProbability: number; // 0..1
}

/**
 * Combined decimal odds of an accumulator (product of leg odds).
 * Returns null for an empty list or if ANY leg has invalid odds — invalid legs are never silently treated as 1.00.
 */
export function accumulatorOdds(odds: Array<number | null | undefined>): AccumulatorResult | null {
  if (!Array.isArray(odds) || odds.length === 0) return null;
  let product = 1;
  for (const o of odds) {
    if (!isValidDecimalOdds(o)) return null;
    product *= o;
  }
  return { legs: odds.length, combinedOdds: product, impliedProbability: 1 / product };
}

/** Potential return (stake × combined odds) and profit. Null when inputs are invalid. */
export function potentialReturn(stake: number, combinedOdds: number | null): { payout: number; profit: number } | null {
  if (!Number.isFinite(stake) || stake < 0 || combinedOdds == null || !Number.isFinite(combinedOdds) || combinedOdds < 1) return null;
  const payout = stake * combinedOdds;
  return { payout, profit: payout - stake };
}
