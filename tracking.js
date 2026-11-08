import { state } from './store.js';
import { api } from './api.js';
import { evalPick } from './predict.js';
const now = () => Math.floor(Date.now() / 1000);
const cc = new Map();
export async function cornerTotal(id) {
  if (cc.has(id)) return cc.get(id);
  try {
    const vals = (await api('/fixtures/statistics', { fixture: id })).map(t => t.statistics?.find(s => s.type === 'Corner Kicks')?.value);
    if (vals.length === 2 && vals.every(v => v != null)) { const v = vals.reduce((a, b) => a + Number(b), 0); cc.set(id, v); return v; }
  } catch (e) { if (/QUOTA/.test(e.message)) throw e; }
  return null;
}
// Ένα βασικό προγνωστικό ανά αγώνα. Δεν αλλάζει μετά την έναρξη του αγώνα.
export function logPick(m, p, source = 'auto') {
  const id = m.fixture_id;
  if (!p || p.status !== 'ok') { if (state.picks[id] && !state.picks[id].result) delete state.picks[id]; return; }
  state.picks[id] = { fixture_id: id, pick_id: p.id, label: p.label, market: p.market, pct: p.pct, confidence: p.confidence, source, created_at: now(), result: null, settled_at: null, slug: m.slug, home: m.home_name, away: m.away_name, date: m.match_date };
}
export async function settleAll(withApi) {
  for (const pk of Object.values(state.picks)) {
    if (pk.result) continue;
    const m = state.matches.get(pk.fixture_id); if (!m) continue;
    if (!['FT', 'AET', 'PEN', 'CANC', 'ABD', 'AWD', 'WO'].includes(m.status)) continue;
    if (['CANC', 'ABD', 'AWD', 'WO'].includes(m.status)) { pk.result = 'void'; pk.settled_at = now(); continue; }
    const isC = pk.pick_id.startsWith('C');
    if (isC && m.status !== 'FT') { pk.result = 'void'; pk.settled_at = now(); continue; }
    if (isC && m.corners == null) { if (!withApi) continue; m.corners = await cornerTotal(m.fixture_id); if (m.corners == null) continue; }
    const r = evalPick({ status: 'ok', id: pk.pick_id }, m.ft_home ?? m.goals_home, m.ft_away ?? m.goals_away, { hth: m.ht_home, hta: m.ht_away, corners: m.corners });
    if (r !== null) { pk.result = r ? 'win' : 'loss'; pk.settled_at = now(); }
  }
}
export function stats() {
  const all = Object.values(state.picks), rows = all.filter(r => r.result === 'win' || r.result === 'loss');
  const agg = key => { const o = {}; for (const r of rows) { const k = r[key] || '—'; (o[k] ??= { w: 0, n: 0 }); o[k].n++; if (r.result === 'win') o[k].w++; }
    return Object.entries(o).map(([k, v]) => ({ k, n: v.n, w: v.w, rate: Math.round(v.w * 100 / v.n) })).sort((a, b) => b.n - a.n); };
  const n = rows.length, w = rows.filter(r => r.result === 'win').length;
  return { n, w, rate: n ? Math.round(w * 100 / n) : null, avgPct: n ? Math.round(rows.reduce((s, r) => s + (r.pct || 0), 0) / n) : null,
    pending: all.filter(r => !r.result).length, voided: all.filter(r => r.result === 'void').length,
    byMarket: agg('market'), byConf: agg('confidence'), bySource: agg('source'), recent: rows.sort((a, b) => b.settled_at - a.settled_at).slice(0, 30) };
}
