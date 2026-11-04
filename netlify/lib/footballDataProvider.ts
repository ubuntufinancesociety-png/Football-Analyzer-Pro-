/**
 * Football data-provider interface (server-side only).
 *
 * Every method returns genuine provider data or `null` (unavailable). Nothing here is ever
 * generated, estimated or filled in by Gemini — missing data stays missing.
 */
import type { RawMatchEvidence, ScoreLine, TeamMatch } from '../../src/engine/secondary';

export interface ProviderFixture {
  id: string;
  league: string;
  leagueId: number;
  season: number;
  kickoffIso: string;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
}

export interface FootballDataProvider {
  name: string;
  isConfigured(): boolean;
  verify(): Promise<{ ok: boolean; message: string }>;
  getFixtures(dates: string[]): Promise<ProviderFixture[]>;
  getTeamGoalAverage(teamId: number, leagueId: number, season: number): Promise<number | null>;
  getRecentForm(teamId: number, last: number): Promise<TeamMatch[] | null>;
  getHeadToHead(homeId: number, awayId: number, last: number): Promise<ScoreLine[] | null>;
  getGoalOdds(fixtureId: string): Promise<RawMatchEvidence['odds']>;
}

/** Leagues scanned by default (API-Football ids). */
export const DEFAULT_LEAGUE_IDS = [39, 140, 135, 78, 61, 88, 94, 144, 288];

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

export class ApiFootballProvider implements FootballDataProvider {
  name = 'API-Football (api-sports.io)';
  private base = 'https://v3.football.api-sports.io';
  constructor(private key: string | undefined = process.env.API_FOOTBALL_KEY) {}

  isConfigured() {
    return Boolean(this.key && this.key.trim());
  }

  private async get(path: string, params: Record<string, string | number>): Promise<any> {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    try {
      const res = await fetch(url, { headers: { 'x-apisports-key': this.key!.trim() }, signal: ctrl.signal });
      if (!res.ok) throw new Error(`Provider HTTP ${res.status}`);
      const json = await res.json();
      const errs = json?.errors;
      if (errs && (Array.isArray(errs) ? errs.length : Object.keys(errs).length)) {
        // Provider error messages never contain the key; still, report only the field names.
        throw new Error(`Provider rejected request (${Object.keys(errs).join(', ') || 'error'})`);
      }
      return json;
    } finally {
      clearTimeout(t);
    }
  }

  async verify() {
    if (!this.isConfigured()) return { ok: false, message: 'API_FOOTBALL_KEY is not set.' };
    try {
      await this.get('/status', {});
      return { ok: true, message: 'Connected' };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Provider unreachable' };
    }
  }

  async getFixtures(dates: string[]) {
    const out: ProviderFixture[] = [];
    for (const date of dates) {
      const json = await this.get('/fixtures', { date, status: 'NS' });
      for (const f of json?.response ?? []) {
        if (!DEFAULT_LEAGUE_IDS.includes(f?.league?.id)) continue;
        out.push({
          id: String(f.fixture.id),
          league: `${f.league.name}${f.league.country ? ` (${f.league.country})` : ''}`,
          leagueId: f.league.id,
          season: f.league.season,
          kickoffIso: f.fixture.date,
          homeTeam: { id: f.teams.home.id, name: f.teams.home.name },
          awayTeam: { id: f.teams.away.id, name: f.teams.away.name },
        });
      }
    }
    return out.sort((a, b) => a.kickoffIso.localeCompare(b.kickoffIso));
  }

  async getTeamGoalAverage(teamId: number, leagueId: number, season: number) {
    try {
      const json = await this.get('/teams/statistics', { team: teamId, league: leagueId, season });
      const played = num(json?.response?.fixtures?.played?.total);
      if (!played) return null; // no matches yet this season -> unavailable, not zero
      return num(json?.response?.goals?.for?.average?.total);
    } catch {
      return null;
    }
  }

  async getRecentForm(teamId: number, last: number) {
    try {
      const json = await this.get('/fixtures', { team: teamId, last, status: 'FT-AET-PEN' });
      const list: TeamMatch[] = [];
      for (const f of json?.response ?? []) {
        const h = num(f?.goals?.home);
        const a = num(f?.goals?.away);
        if (h == null || a == null) continue;
        const isHome = f?.teams?.home?.id === teamId;
        list.push({ scored: isHome ? h : a, conceded: isHome ? a : h });
      }
      return list.length ? list : null;
    } catch {
      return null;
    }
  }

  async getHeadToHead(homeId: number, awayId: number, last: number) {
    try {
      const json = await this.get('/fixtures/headtohead', { h2h: `${homeId}-${awayId}`, last, status: 'FT-AET-PEN' });
      const list: ScoreLine[] = [];
      for (const f of json?.response ?? []) {
        const h = num(f?.goals?.home);
        const a = num(f?.goals?.away);
        if (h != null && a != null) list.push({ homeGoals: h, awayGoals: a });
      }
      return list.length ? list : null;
    } catch {
      return null;
    }
  }

  async getGoalOdds(fixtureId: string) {
    const empty = { over15: null, over25: null, bttsYes: null };
    try {
      const json = await this.get('/odds', { fixture: fixtureId });
      const bookmaker = json?.response?.[0]?.bookmakers?.[0];
      if (!bookmaker) return empty;
      const bet = (name: string) => bookmaker.bets?.find((b: any) => b?.name === name)?.values ?? [];
      const pick = (values: any[], label: string) => num(values.find((v: any) => v?.value === label)?.odd);
      const ou = bet('Goals Over/Under');
      return { over15: pick(ou, 'Over 1.5'), over25: pick(ou, 'Over 2.5'), bttsYes: pick(bet('Both Teams Score'), 'Yes') };
    } catch {
      return empty;
    }
  }
}
