/**
 * SINGLE SOURCE OF TRUTH for every threshold used by the 87% Formula engine.
 *
 * These values reproduce the rules that were previously hard-coded inside
 * Formula87Scanner.tsx (calculator logic):
 *   step 1: combinedAvg >= 2.4
 *   step 2: (h2hCount / 5) * 100 >= 80          -> at least 4 of last 5
 *   step 3: homeScored5 >= 4 && awayScored5 >= 4 && homeShutouts <= 1 && awayShutouts <= 1
 *   step 4: implied = 100 / odds; edge = 87 - implied   (display only, never part of the pass condition)
 *
 * Change a threshold here and every screen, share text and test picks it up.
 */
export const FORMULA_CONFIG = {
  primaryMarket: 'Over 1.5 Goals',

  /** Step 1 — home avg goals + away avg goals must be at least this. */
  minCombinedGoalAverage: 2.4,

  /** Step 2 — head-to-head sample and minimum number of those matches with 2+ goals. */
  h2hSampleSize: 5,
  minH2HOver15Count: 4,

  /** Step 3 — recent form sample per team. */
  formSampleSize: 5,
  minMatchesScoredIn: 4,
  maxShutouts: 1,

  /**
   * Step 4 — the "87%" figure used by the original app as an assumed win probability.
   * It is a BRANDING BENCHMARK. It has NOT been verified by documented historical backtesting,
   * so the engine never treats it as a probability for expected-value purposes.
   */
  benchmarkPct: 87,
  benchmarkVerifiedByBacktest: false,

  /** Decimal odds outside this range are rejected as invalid input. */
  minValidDecimalOdds: 1.01,
  maxValidDecimalOdds: 1000,
} as const;

export type FormulaConfig = typeof FORMULA_CONFIG;
