type Context = { ip?: string };
type Config = { path: string };
import { ApiFootballProvider } from '../lib/footballDataProvider';
import type { RawMatchEvidence } from '../../src/engine/secondary';

/** Limits */
const MAX_FIXTURES = 6; // each fixture costs ~6 provider requests
const RATE_LIMIT_PER_MIN = 10;
const CACHE_MS = 30 * 60 * 1000;

const hits = new Map<string, number[]>();
const cache = new Map<string, { at: number; body: unknown }>();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function datesFor(timeframe: string): string[] {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const add = (n: number) => new Date(now.getTime() + n * 86400000);
  if (timeframe === 'today') return [iso(now)];
  if (timeframe === 'tomorrow') return [iso(add(1))];
  if (timeframe === 'weekend') {
    const toSat = (6 - now.getUTCDay() + 7) % 7;
    return [iso(add(toSat)), iso(add(toSat + 1))];
  }
  return [iso(now), iso(add(1))];
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const ip = context.ip || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= RATE_LIMIT_PER_MIN) return json({ success: false, status: 'rate_limited', error: 'Too many requests. Try again in a minute.' }, 429);
  hits.set(ip, [...recent, now]);

  let body: any = {};
  try {
    const text = await req.text();
    if (text.length > 2000) return json({ success: false, error: 'Request too large' }, 413);
    body = text ? JSON.parse(text) : {};
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }
  const timeframe = ['today', 'tomorrow', 'weekend', 'all'].includes(body.timeframe) ? body.timeframe : 'all';
  const searchQuery = typeof body.searchQuery === 'string' ? body.searchQuery.slice(0, 60).toLowerCase().trim() : '';

  const provider = new ApiFootballProvider();
  if (!provider.isConfigured()) {
    return json({
      success: false,
      status: 'not_configured',
      provider: provider.name,
      error: 'No football data provider is connected. Set the API_FOOTBALL_KEY environment variable in Netlify (Project configuration → Environment variables) and redeploy.',
    });
  }

  const cacheKey = `${timeframe}|${searchQuery}`;
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < CACHE_MS) return json(hit.body);

  const check = await provider.verify();
  if (!check.ok) {
    console.warn('[formula-scan] provider verification failed:', check.message);
    return json({ success: false, status: 'provider_error', provider: provider.name, error: `The football data provider rejected the connection: ${check.message}. Check that API_FOOTBALL_KEY is a valid api-sports.io key.` });
  }

  try {
    let fixtures = await provider.getFixtures(datesFor(timeframe));
    if (searchQuery) {
      fixtures = fixtures.filter((f) => `${f.homeTeam.name} ${f.awayTeam.name} ${f.league}`.toLowerCase().includes(searchQuery));
    }
    const totalFound = fixtures.length;
    fixtures = fixtures.slice(0, MAX_FIXTURES);

    const matches = await Promise.all(
      fixtures.map(async (f) => {
        const [homeGoalAvg, awayGoalAvg, homeRecent, awayRecent, h2h, odds] = await Promise.all([
          provider.getTeamGoalAverage(f.homeTeam.id, f.leagueId, f.season),
          provider.getTeamGoalAverage(f.awayTeam.id, f.leagueId, f.season),
          provider.getRecentForm(f.homeTeam.id, 5),
          provider.getRecentForm(f.awayTeam.id, 5),
          provider.getHeadToHead(f.homeTeam.id, f.awayTeam.id, 5),
          provider.getGoalOdds(f.id),
        ]);
        const evidence: RawMatchEvidence = { homeGoalAvg, awayGoalAvg, homeRecent, awayRecent, h2h, odds };
        return {
          id: f.id,
          league: f.league,
          kickoffIso: f.kickoffIso,
          homeTeam: f.homeTeam.name,
          awayTeam: f.awayTeam.name,
          evidence,
        };
      })
    );

    const result = {
      success: true,
      status: 'ok',
      provider: provider.name,
      fetchedAt: new Date().toISOString(),
      totalFound,
      limit: MAX_FIXTURES,
      matches,
    };
    cache.set(cacheKey, { at: now, body: result });
    return json(result);
  } catch (e: any) {
    console.error('[formula-scan] provider request failed:', e?.message);
    return json({ success: false, status: 'provider_error', provider: provider.name, error: 'The football data provider request failed. Please try again later.' }, 502);
  }
};

export const config: Config = { path: '/api/formula/scan-matches' };
