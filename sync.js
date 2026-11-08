import { state, log } from './store.js';
import { api } from './api.js';
import { athensDate, addDays, slugify, FINISHED } from './util.js';
import { buildAnalysis, parseRecent } from './analysis.js';
import { aiAnalysis } from './ai.js';
import { logPick, settleAll, cornerTotal } from './tracking.js';

const LEAGUES = (process.env.LEAGUE_IDS || '2,3,848,39,140,135,78,61,197,88,94,203,40').split(',').map(Number).filter(Boolean);
const prio = id => { const i = LEAGUES.indexOf(id); return i < 0 ? 999 : i; };
const now = () => Math.floor(Date.now() / 1000);
const list = () => [...state.matches.values()];

export async function syncFixtures(date) {
  const rows = (await api('/fixtures', { date, timezone: 'Europe/Athens' })).filter(f => LEAGUES.includes(f.league.id));
  for (const f of rows) {
    const id = f.fixture.id, ts = f.fixture.timestamp, md = athensDate(new Date(ts * 1000));
    const base = { fixture_id: id, match_date: md, kickoff_ts: ts, league_id: f.league.id, league_name: f.league.name, league_country: f.league.country, league_logo: f.league.logo, season: f.league.season, round: f.league.round,
      home_id: f.teams.home.id, home_name: f.teams.home.name, home_logo: f.teams.home.logo, away_id: f.teams.away.id, away_name: f.teams.away.name, away_logo: f.teams.away.logo,
      venue: f.fixture.venue?.name || null, status: f.fixture.status.short, goals_home: f.goals.home, goals_away: f.goals.away,
      ht_home: f.score?.halftime?.home ?? null, ht_away: f.score?.halftime?.away ?? null, ft_home: f.score?.fulltime?.home ?? null, ft_away: f.score?.fulltime?.away ?? null, updated_at: now() };
    const old = state.matches.get(id);
    if (old) { Object.assign(old, base); continue; }
    const taken = s => list().some(m => m.slug === s && m.fixture_id !== id);
    let slug = slugify(`${base.home_name}-vs-${base.away_name}`) || `match-${id}`; const b = slug;
    if (taken(slug)) slug = `${b}-${md}`; if (taken(slug)) slug = `${b}-${id}`;
    state.matches.set(id, { ...base, slug, analysis: null, prediction: null, lineups: null, lineups_try: 0, enriched_at: null, hidden: false, corners: null });
  }
  return rows.length;
}
async function injuriesFor(date) {
  try {
    const map = {};
    for (const i of await api('/injuries', { date })) (map[i.fixture.id] ||= []).push({ team_id: i.team.id, name: i.player.name, type: i.player.type, reason: i.player.reason });
    return map;
  } catch (e) { log('injuries', false, e.message); return null; }
}
const fmtInj = i => ({ name: i.name, kind: /suspen/i.test(i.reason || '') ? 'Τιμωρία' : 'Τραυματισμός/απουσία', status: i.type === 'Questionable' ? 'Αμφίβολος' : 'Θα απουσιάσει', reason: i.reason });
const splitInj = (m, l) => l == null ? null : { home: l.filter(i => i.team_id === m.home_id).map(fmtInj), away: l.filter(i => i.team_id === m.away_id).map(fmtInj) };

export async function enrichDay(date) {
  const max = Number(process.env.MAX_ANALYSES_PER_DAY || 10);
  const top = list().filter(m => m.match_date === date).sort((a, b) => prio(a.league_id) - prio(b.league_id) || a.kickoff_ts - b.kickoff_ts).slice(0, max)
    .filter(m => !m.enriched_at && !FINISHED.includes(m.status));
  if (!top.length) return 0;
  const inj = await injuriesFor(date), stand = {};
  let done = 0;
  for (const m of top) {
    try {
      const k = `${m.league_id}-${m.season}`;
      if (!(k in stand)) { try { stand[k] = (await api('/standings', { league: m.league_id, season: m.season }))[0]?.league?.standings || []; } catch (e) { if (/QUOTA/.test(e.message)) throw e; stand[k] = []; } }
      const grp = stand[k].find(g => g.some(t => t.team.id === m.home_id)) || [];
      const standings = { home: grp.find(t => t.team.id === m.home_id), away: grp.find(t => t.team.id === m.away_id), total: grp.length };
      const pred = (await api('/predictions', { fixture: m.fixture_id }))[0] || null;
      const recent = { home: parseRecent(await api('/fixtures', { team: m.home_id, last: 5 }), m.home_id), away: parseRecent(await api('/fixtures', { team: m.away_id, last: 5 }), m.away_id) };
      if (process.env.ENABLE_CORNERS === 'true') for (const r of [...recent.home, ...recent.away]) r.ct = await cornerTotal(r.id);
      const { analysis, prediction } = buildAnalysis(m, { pred, recent, standings, injuries: splitInj(m, inj?.[m.fixture_id] ?? (inj ? [] : null)) });
      try { const ai = await aiAnalysis(m, analysis, prediction, null); if (ai) analysis.ai = ai; } catch (e) { log('ai', false, `${m.slug}: ${e.message}`); }
      Object.assign(m, { analysis, prediction, enriched_at: now() });
      logPick(m, prediction, 'auto'); done++;
    } catch (e) { log('enrich', false, `${m.slug}: ${e.message}`); if (/QUOTA/.test(e.message)) break; }
  }
  return done;
}
export async function regenAI(m) {
  if (!m.analysis || m.analysis.ai?.edited) return;
  const ai = await aiAnalysis(m, m.analysis, m.prediction, m.lineups); if (ai) m.analysis.ai = ai;
}
export async function refreshLive() {
  await settleAll(false);
  const t = now(), today = athensDate();
  const act = list().filter(m => [addDays(today, -1), today].includes(m.match_date) && !FINISHED.includes(m.status) && m.kickoff_ts < t + 5400 && m.kickoff_ts > t - 4 * 3600);
  if (!act.length) return;
  for (const m of act.filter(x => x.enriched_at && !x.lineups && x.lineups_try < 6 && x.kickoff_ts - t < 4200)) {
    m.lineups_try++;
    const r = await api('/fixtures/lineups', { fixture: m.fixture_id });
    if (r.length === 2) { m.lineups = r.map(x => ({ team_id: x.team.id, formation: x.formation, coach: x.coach?.name, xi: x.startXI.map(p => ({ n: p.player.number, name: p.player.name, pos: p.player.pos })) })); await regenAI(m).catch(e => log('ai', false, e.message)); }
  }
  for (const d of new Set(act.filter(x => x.kickoff_ts < t).map(x => x.match_date))) await syncFixtures(d);
  await settleAll(false);
}
export async function refreshInjuries() {
  const today = athensDate(), up = list().filter(m => m.match_date === today && m.analysis && m.kickoff_ts > now());
  if (!up.length || now() - (state.meta.injAt || 0) < 10800) return;
  const inj = await injuriesFor(today); if (!inj) return;
  state.meta.injAt = now();
  for (const m of up) m.analysis.injuries = { ...splitInj(m, inj[m.fixture_id] || []), has: true };
}
export async function dailyJob() {
  const today = athensDate(), n = Number(process.env.DAYS_AHEAD || 2);
  if (state.meta.lastDaily !== today) {
    await syncFixtures(addDays(today, -1)); await settleAll(true);
    for (let i = 0; i <= n; i++) await syncFixtures(addDays(today, i));
    state.meta.lastDaily = today; log('daily', true, `Φορτώθηκαν αγώνες ${today} + ${n} ημέρες`);
  }
  await enrichDay(today);
  if (process.env.ENRICH_TOMORROW === 'true') await enrichDay(addDays(today, 1));
}
