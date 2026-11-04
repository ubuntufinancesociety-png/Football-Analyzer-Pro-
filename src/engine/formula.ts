import { FORMULA_CONFIG, FormulaConfig } from './config';
import { benchmarkGapPct, impliedProbability, isValidDecimalOdds, historicalHitRate, HitRate } from './probability';

/**
 * Evidence for a single fixture. Every field is nullable: `null` means "not available",
 * which is never treated as passing.
 */
export interface FormulaInput {
  /** Season average goals for each team (as used by the original Step 1). */
  homeGoalAvg: number | null;
  awayGoalAvg: number | null;
  /** Head-to-head: how many of the last `h2hSampleSize` meetings had 2+ goals. */
  h2hOver15Count: number | null;
  h2hSampleSize: number | null;
  /** Recent form: matches (of the sample) in which each team scored, and shutouts (0 goals scored). */
  homeScoredIn: number | null;
  awayScoredIn: number | null;
  homeShutouts: number | null;
  awayShutouts: number | null;
  homeFormSample: number | null;
  awayFormSample: number | null;
  /** Bookmaker decimal odds for Over 1.5 Goals. */
  over15Odds: number | null;
}

export type FilterStatus = 'pass' | 'fail' | 'unavailable';

export interface FilterResult {
  step: 1 | 2 | 3;
  id: 'combined_goal_average' | 'h2h_over15' | 'recent_scoring_form';
  label: string;
  rule: string;
  status: FilterStatus;
  /** Supporting statistic shown to the user, e.g. "2.10 + 1.40 = 3.50 goals/match". */
  evidence: string;
  /** Names of missing / invalid inputs that made the filter unavailable. */
  missing: string[];
}

export interface BenchmarkComparison {
  step: 4;
  id: 'benchmark_odds_comparison';
  label: string;
  rule: string;
  /** Step 4 has never been part of the pass condition — it is informational only. */
  status: 'info' | 'unavailable';
  impliedProbabilityPct: number | null;
  benchmarkPct: number;
  gapPct: number | null;
  evidence: string;
  note: string;
}

export type Qualification = 'qualified' | 'not_qualified' | 'incomplete';

export interface FormulaResult {
  market: string;
  filters: [FilterResult, FilterResult, FilterResult];
  benchmark: BenchmarkComparison;
  qualification: Qualification;
  passedCount: number;
  failedCount: number;
  unavailableCount: number;
  /** Observed H2H Over 1.5 frequency — historical, not a probability. */
  h2hHitRate: HitRate | null;
  summary: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isCount = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v >= 0;

/** Step 1 — combined season goal averages >= threshold. */
export function evaluateCombinedGoalAverage(input: Pick<FormulaInput, 'homeGoalAvg' | 'awayGoalAvg'>, cfg: FormulaConfig = FORMULA_CONFIG): FilterResult {
  const missing: string[] = [];
  if (!isNum(input.homeGoalAvg) || input.homeGoalAvg < 0) missing.push('Home team goal average');
  if (!isNum(input.awayGoalAvg) || input.awayGoalAvg < 0) missing.push('Away team goal average');
  const base = {
    step: 1 as const,
    id: 'combined_goal_average' as const,
    label: 'Combined goal average',
    rule: `Home avg + Away avg ≥ ${cfg.minCombinedGoalAverage.toFixed(2)} goals/match`,
  };
  if (missing.length) return { ...base, status: 'unavailable', evidence: 'Goal averages unavailable', missing };
  const combined = Math.round(((input.homeGoalAvg as number) + (input.awayGoalAvg as number)) * 1000) / 1000;
  return {
    ...base,
    status: combined >= cfg.minCombinedGoalAverage ? 'pass' : 'fail',
    evidence: `${(input.homeGoalAvg as number).toFixed(2)} + ${(input.awayGoalAvg as number).toFixed(2)} = ${combined.toFixed(2)} goals/match`,
    missing,
  };
}

/** Step 2 — at least N of the last `h2hSampleSize` head-to-head meetings had 2+ goals. */
export function evaluateH2HOver15(input: Pick<FormulaInput, 'h2hOver15Count' | 'h2hSampleSize'>, cfg: FormulaConfig = FORMULA_CONFIG): FilterResult {
  const base = {
    step: 2 as const,
    id: 'h2h_over15' as const,
    label: 'Head-to-head Over 1.5',
    rule: `At least ${cfg.minH2HOver15Count} of the last ${cfg.h2hSampleSize} meetings had 2+ goals`,
  };
  const { h2hOver15Count: hits, h2hSampleSize: sample } = input;
  if (!isCount(hits) || !isCount(sample)) {
    return { ...base, status: 'unavailable', evidence: 'Head-to-head results unavailable', missing: ['Head-to-head results'] };
  }
  if (hits > sample) {
    return { ...base, status: 'unavailable', evidence: `Inconsistent data: ${hits} hits from ${sample} matches`, missing: ['Valid head-to-head count'] };
  }
  if (sample < cfg.h2hSampleSize) {
    return {
      ...base,
      status: 'unavailable',
      evidence: `Only ${sample} of the required ${cfg.h2hSampleSize} head-to-head meetings available (${hits} with 2+ goals)`,
      missing: [`${cfg.h2hSampleSize - sample} more head-to-head result(s)`],
    };
  }
  return {
    ...base,
    status: hits >= cfg.minH2HOver15Count ? 'pass' : 'fail',
    evidence: `${hits}/${sample} meetings with 2+ goals (${Math.round((hits / sample) * 100)}%)`,
    missing: [],
  };
}

/** Step 3 — both teams scored in >= N of their last `formSampleSize` matches and neither has more than `maxShutouts` shutouts. */
export function evaluateRecentScoringForm(
  input: Pick<FormulaInput, 'homeScoredIn' | 'awayScoredIn' | 'homeShutouts' | 'awayShutouts' | 'homeFormSample' | 'awayFormSample'>,
  cfg: FormulaConfig = FORMULA_CONFIG
): FilterResult {
  const base = {
    step: 3 as const,
    id: 'recent_scoring_form' as const,
    label: 'Recent scoring form',
    rule: `Both teams scored in ≥ ${cfg.minMatchesScoredIn} of last ${cfg.formSampleSize}, max ${cfg.maxShutouts} shutout each`,
  };
  const missing: string[] = [];
  const teams = [
    { name: 'Home', scored: input.homeScoredIn, shut: input.homeShutouts, sample: input.homeFormSample },
    { name: 'Away', scored: input.awayScoredIn, shut: input.awayShutouts, sample: input.awayFormSample },
  ];
  for (const t of teams) {
    if (!isCount(t.scored) || !isCount(t.shut) || !isCount(t.sample)) {
      missing.push(`${t.name} team recent results`);
    } else if (t.scored + t.shut > t.sample) {
      missing.push(`${t.name} team: scored-in (${t.scored}) + shutouts (${t.shut}) exceeds sample (${t.sample})`);
    } else if (t.sample < cfg.formSampleSize) {
      missing.push(`${t.name} team: only ${t.sample} of ${cfg.formSampleSize} recent matches available`);
    }
  }
  if (missing.length) return { ...base, status: 'unavailable', evidence: 'Recent form incomplete', missing };
  const [h, a] = teams as Array<{ name: string; scored: number; shut: number; sample: number }>;
  const pass =
    h.scored >= cfg.minMatchesScoredIn &&
    a.scored >= cfg.minMatchesScoredIn &&
    h.shut <= cfg.maxShutouts &&
    a.shut <= cfg.maxShutouts;
  return {
    ...base,
    status: pass ? 'pass' : 'fail',
    evidence: `Home scored in ${h.scored}/${h.sample} (${h.shut} shutout${h.shut === 1 ? '' : 's'}) • Away scored in ${a.scored}/${a.sample} (${a.shut} shutout${a.shut === 1 ? '' : 's'})`,
    missing: [],
  };
}

/** Step 4 — original "implied vs 87%" display. Informational, never part of qualification. */
export function evaluateBenchmarkComparison(odds: number | null, cfg: FormulaConfig = FORMULA_CONFIG): BenchmarkComparison {
  const base = {
    step: 4 as const,
    id: 'benchmark_odds_comparison' as const,
    label: 'Odds vs 87% benchmark',
    rule: `Benchmark ${cfg.benchmarkPct}% − bookmaker implied probability (100 ÷ odds)`,
    benchmarkPct: cfg.benchmarkPct,
    note: `The ${cfg.benchmarkPct}% figure is branding, not a verified success rate (no documented backtest). This comparison is not expected value and does not affect qualification.`,
  };
  if (!isValidDecimalOdds(odds)) {
    return { ...base, status: 'unavailable', impliedProbabilityPct: null, gapPct: null, evidence: 'Over 1.5 odds unavailable' };
  }
  const ip = (impliedProbability(odds) as number) * 100;
  const gap = benchmarkGapPct(odds, cfg.benchmarkPct) as number;
  return {
    ...base,
    status: 'info',
    impliedProbabilityPct: ip,
    gapPct: gap,
    evidence: `${cfg.benchmarkPct}% − ${ip.toFixed(1)}% (100 ÷ ${odds.toFixed(2)}) = ${gap >= 0 ? '+' : ''}${gap.toFixed(1)} pts`,
  };
}

/** Run the full 87% Formula on one fixture. Pure and deterministic. */
export function evaluateFormula(input: FormulaInput, cfg: FormulaConfig = FORMULA_CONFIG): FormulaResult {
  const filters: [FilterResult, FilterResult, FilterResult] = [
    evaluateCombinedGoalAverage(input, cfg),
    evaluateH2HOver15(input, cfg),
    evaluateRecentScoringForm(input, cfg),
  ];
  const passedCount = filters.filter((f) => f.status === 'pass').length;
  const failedCount = filters.filter((f) => f.status === 'fail').length;
  const unavailableCount = filters.filter((f) => f.status === 'unavailable').length;
  const qualification: Qualification = failedCount > 0 ? 'not_qualified' : unavailableCount > 0 ? 'incomplete' : 'qualified';
  const summary =
    qualification === 'qualified'
      ? `All ${filters.length} statistical filters passed. This is a filter result, not a guarantee or a value judgement.`
      : qualification === 'not_qualified'
      ? `${failedCount} filter${failedCount === 1 ? '' : 's'} failed.`
      : `Incomplete evidence: ${unavailableCount} filter${unavailableCount === 1 ? '' : 's'} could not be evaluated. Not qualified.`;
  return {
    market: cfg.primaryMarket,
    filters,
    benchmark: evaluateBenchmarkComparison(input.over15Odds, cfg),
    qualification,
    passedCount,
    failedCount,
    unavailableCount,
    h2hHitRate: historicalHitRate(input.h2hOver15Count, input.h2hSampleSize),
    summary,
  };
}

export const EMPTY_FORMULA_INPUT: FormulaInput = {
  homeGoalAvg: null,
  awayGoalAvg: null,
  h2hOver15Count: null,
  h2hSampleSize: null,
  homeScoredIn: null,
  awayScoredIn: null,
  homeShutouts: null,
  awayShutouts: null,
  homeFormSample: null,
  awayFormSample: null,
  over15Odds: null,
};
