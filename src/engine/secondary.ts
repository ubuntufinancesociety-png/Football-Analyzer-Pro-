import { HitRate, historicalHitRate, impliedProbability } from './probability';
import { FormulaInput } from './formula';

/** Raw match-level evidence, as a data provider would supply it. */
export interface ScoreLine {
  homeGoals: number;
  awayGoals: number;
}
export interface TeamMatch {
  scored: number;
  conceded: number;
}
export interface RawMatchEvidence {
  homeGoalAvg: number | null;
  awayGoalAvg: number | null;
  /** Most recent first. */
  h2h: ScoreLine[] | null;
  homeRecent: TeamMatch[] | null;
  awayRecent: TeamMatch[] | null;
  odds: { over15: number | null; over25: number | null; bttsYes: number | null };
}

const validScore = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;

/** Convert raw provider results into the counts the formula needs. Only the most recent `sample` entries are used. */
export function summariseEvidence(raw: RawMatchEvidence, h2hSample = 5, formSample = 5): FormulaInput {
  const h2h = raw.h2h?.filter((s) => validScore(s.homeGoals) && validScore(s.awayGoals)).slice(0, h2hSample) ?? null;
  const form = (list: TeamMatch[] | null) => {
    const l = list?.filter((m) => validScore(m.scored) && validScore(m.conceded)).slice(0, formSample) ?? null;
    if (!l) return { scored: null, shut: null, sample: null };
    const scored = l.filter((m) => m.scored > 0).length;
    return { scored, shut: l.length - scored, sample: l.length };
  };
  const h = form(raw.homeRecent);
  const a = form(raw.awayRecent);
  return {
    homeGoalAvg: raw.homeGoalAvg,
    awayGoalAvg: raw.awayGoalAvg,
    h2hOver15Count: h2h ? h2h.filter((s) => s.homeGoals + s.awayGoals >= 2).length : null,
    h2hSampleSize: h2h ? h2h.length : null,
    homeScoredIn: h.scored,
    awayScoredIn: a.scored,
    homeShutouts: h.shut,
    awayShutouts: a.shut,
    homeFormSample: h.sample,
    awayFormSample: a.sample,
    over15Odds: raw.odds.over15,
  };
}

export interface SecondaryMarketAnalysis {
  market: 'Over 2.5 Goals' | 'Both Teams To Score';
  available: boolean;
  /** Observed frequency in head-to-head meetings — historical, not a probability. */
  h2hHitRate: HitRate | null;
  impliedProbabilityPct: number | null;
  odds: number | null;
  evidence: string[];
  missing: string[];
}

export interface SecondaryInput {
  h2hOver25Count: number | null;
  h2hBttsCount: number | null;
  h2hSampleSize: number | null;
  homeScoredIn: number | null;
  awayScoredIn: number | null;
  homeFormSample: number | null;
  awayFormSample: number | null;
  combinedGoalAvg: number | null;
  over25Odds: number | null;
  bttsOdds: number | null;
}

export function secondaryFromRaw(raw: RawMatchEvidence, h2hSample = 5, formSample = 5): SecondaryInput {
  const s = summariseEvidence(raw, h2hSample, formSample);
  const h2h = raw.h2h?.slice(0, h2hSample) ?? null;
  return {
    h2hOver25Count: h2h ? h2h.filter((x) => x.homeGoals + x.awayGoals >= 3).length : null,
    h2hBttsCount: h2h ? h2h.filter((x) => x.homeGoals > 0 && x.awayGoals > 0).length : null,
    h2hSampleSize: h2h ? h2h.length : null,
    homeScoredIn: s.homeScoredIn,
    awayScoredIn: s.awayScoredIn,
    homeFormSample: s.homeFormSample,
    awayFormSample: s.awayFormSample,
    combinedGoalAvg: raw.homeGoalAvg != null && raw.awayGoalAvg != null ? raw.homeGoalAvg + raw.awayGoalAvg : null,
    over25Odds: raw.odds.over25,
    bttsOdds: raw.odds.bttsYes,
  };
}

/**
 * Secondary markets are descriptive only. The original app defined no qualification rule for them,
 * so the engine reports supporting statistics and never a pass/fail verdict.
 */
export function analyseSecondaryMarkets(input: SecondaryInput): SecondaryMarketAnalysis[] {
  const ip = (o: number | null) => {
    const p = impliedProbability(o);
    return p == null ? null : p * 100;
  };

  const o25Rate = historicalHitRate(input.h2hOver25Count, input.h2hSampleSize);
  const o25Evidence: string[] = [];
  const o25Missing: string[] = [];
  if (o25Rate) o25Evidence.push(`H2H: ${o25Rate.hits}/${o25Rate.sample} meetings had 3+ goals`);
  else o25Missing.push('Head-to-head Over 2.5 count');
  if (input.combinedGoalAvg != null && Number.isFinite(input.combinedGoalAvg)) o25Evidence.push(`Combined goal average ${input.combinedGoalAvg.toFixed(2)}`);
  else o25Missing.push('Goal averages');

  const bttsRate = historicalHitRate(input.h2hBttsCount, input.h2hSampleSize);
  const bttsEvidence: string[] = [];
  const bttsMissing: string[] = [];
  if (bttsRate) bttsEvidence.push(`H2H: both teams scored in ${bttsRate.hits}/${bttsRate.sample} meetings`);
  else bttsMissing.push('Head-to-head BTTS count');
  const homeForm = historicalHitRate(input.homeScoredIn, input.homeFormSample);
  const awayForm = historicalHitRate(input.awayScoredIn, input.awayFormSample);
  if (homeForm && awayForm) bttsEvidence.push(`Home scored in ${homeForm.hits}/${homeForm.sample}, away scored in ${awayForm.hits}/${awayForm.sample} recent matches`);
  else bttsMissing.push('Recent scoring form');

  return [
    {
      market: 'Over 2.5 Goals',
      available: o25Evidence.length > 0,
      h2hHitRate: o25Rate,
      odds: input.over25Odds,
      impliedProbabilityPct: ip(input.over25Odds),
      evidence: o25Evidence,
      missing: o25Missing,
    },
    {
      market: 'Both Teams To Score',
      available: bttsEvidence.length > 0,
      h2hHitRate: bttsRate,
      odds: input.bttsOdds,
      impliedProbabilityPct: ip(input.bttsOdds),
      evidence: bttsEvidence,
      missing: bttsMissing,
    },
  ];
}
