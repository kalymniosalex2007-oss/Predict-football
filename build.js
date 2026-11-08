import fs from 'node:fs'; import path from 'node:path';
import { load, save, state, log } from './lib/store.js';
import { dailyJob, refreshLive, refreshInjuries } from './lib/sync.js';
import { applyOverrides } from './lib/overrides.js';
import { stats } from './lib/tracking.js';
import { dayPage, matchPage, statsPage, notFound, u } from './lib/render.js';
import { athensDate, addDays } from './lib/util.js';

load();
if (process.env.API_FOOTBALL_KEY) {
  for (const [n, f] of [['daily', dailyJob], ['live', refreshLive], ['injuries', refreshInjuries]]) { try { await f(); } catch (e) { log(n, false, e.message); } }
} else log('config', false, 'Λείπει το μυστικό API_FOOTBALL_KEY: δεν φορτώθηκαν νέα δεδομένα');
applyOverrides();
save();

const out = 'dist', put = (p, c) => { const f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync('public', out, { recursive: true });
put('.nojekyll', '');
const today = athensDate(), vis = [...state.matches.values()].filter(m => !m.hidden);
const dates = new Set(vis.map(m => m.match_date));
for (let i = -1; i <= 6; i++) dates.add(addDays(today, i));
const days = Array.from({ length: 8 }, (_, i) => addDays(today, i - 1));
const known = [...dates].filter(d => d >= addDays(today, -1)).sort();
for (const d of dates) {
  const rows = vis.filter(m => m.match_date === d).sort((a, b) => a.kickoff_ts - b.kickoff_ts);
  put(`day/${d}/index.html`, dayPage({ date: d, today, rows, days, known, isRoot: false }));
  if (d === today) put('index.html', dayPage({ date: d, today, rows, days, known, isRoot: true }));
}
for (const m of vis) put(`predictions/${m.slug}/index.html`, matchPage(m));
put('stats/index.html', statsPage(stats()));
put('404.html', notFound());
const site = (process.env.SITE_URL || '').replace(/\/$/, '');
put('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`);
put('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site}/</loc></url>${vis.map(m => `<url><loc>${site}/predictions/${m.slug}/</loc><lastmod>${m.match_date}</lastmod></url>`).join('')}</urlset>`);
console.log(`Έτοιμο: ${vis.length} αγώνες, ${dates.size} ημέρες, ${state.meta.log.filter(l => !l.ok).length} σφάλματα στο ιστορικό`);
