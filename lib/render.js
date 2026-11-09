import { fmtTime, fmtDay, statusLabel, FINISHED } from './util.js';
import { evalPick } from './predict.js';
import { narrative } from './analysis.js';
const BASE = process.env.BASE || '', SITE = (process.env.SITE_URL || '').replace(/\/$/, ''), NAME = 'Football Predictor';
const LG = (process.env.LEAGUE_IDS || '2,3,848,39,140,135,78,61,197,88,94,203,40').split(',').map(Number);
export const u = p => BASE + p;
export const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const evalFor = (p, m) => ['FT', 'AET', 'PEN'].includes(m.status) ? evalPick(p, m.ft_home ?? m.goals_home, m.ft_away ?? m.goals_away, { hth: m.ht_home, hta: m.ht_away, corners: m.corners }) : null;

export const layout = ({ title, desc, path, body, ld, attrs = '' }) => `<!doctype html><html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(title)}</title><meta name="description" content="${e(desc)}"><link rel="canonical" href="${e(SITE + path)}">
<meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><meta property="og:type" content="website">
<link rel="stylesheet" href="${u('/style.css')}"><style>.brand{gap:10px}.selhead{margin:16px 0 0;color:#8f9a94;font-size:.85rem;font-weight:600}.filter{margin:10px 0 4px}.filter select{background:#171a19;color:#e8ece9;border:1px solid #2b312e;border-radius:8px;padding:8px 10px;font:inherit;max-width:100%}.ai p{max-width:75ch}</style>${ld ? `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` : ''}</head><body ${attrs}>
<header class="top"><div class="wrap bar"><a class="brand" href="${u('/')}"><svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#13261c" stroke="#2fd37a" stroke-width="2"/><polygon points="16,9 21,12.6 19.1,18.4 12.9,18.4 11,12.6" fill="#e3b341"/><path d="M16 9V4M21 12.6l5-1.6M19.1 18.4l3.2 4.4M12.9 18.4l-3.2 4.4M11 12.6l-5-1.6" stroke="#2fd37a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg><span>Football <b style="color:#e3b341;font-weight:800">Predictor</b></span></a><nav class="topnav"><a href="${u('/')}">Αγώνες</a><a href="${u('/stats/')}">Στατιστικά επιτυχίας</a></nav></div></header><main class="wrap">${body}</main>
<footer class="foot"><div class="wrap"><p>Τα προγνωστικά είναι στατιστικές εκτιμήσεις και δεν αποτελούν εγγύηση κέρδους. Το στοίχημα απευθύνεται σε άτομα άνω των 18 ετών. Παίξτε υπεύθυνα.</p><p>Δεδομένα: API-Football. Ώρες: Ελλάδα (Europe/Athens).</p></div></footer></body></html>`;

const card = m => {
  const p = m.prediction, ok = evalFor(p, m), live = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(m.status);
  const sum = p && p.status === 'ok' ? `<span class="chip">${e(p.label)} · ${p.pct}%</span><small>${e(p.reasons[0])}</small>${ok !== null ? `<em class="${ok ? 'win' : 'loss'}">${ok ? 'Επιτυχία' : 'Αποτυχία'}</em>` : ''}` : p ? `<small>${e(p.note)}</small>` : '<small>Η ανάλυση δεν έχει δημιουργηθεί ακόμη.</small>';
  const t = (n, l, g) => `<div><img src="${e(l)}" alt="" width="28" height="28" loading="lazy">${e(n)}${g !== null ? `<b class="sc">${g}</b>` : ''}</div>`;
  return `<article class="card"><div class="when"><b>${fmtTime(m.kickoff_ts)}</b><small class="${live ? 'live' : ''}">${e(statusLabel(m.status))}</small></div>
<div class="teams">${t(m.home_name, m.home_logo, m.goals_home)}${t(m.away_name, m.away_logo, m.goals_away)}</div><div class="sum">${sum}</div>
<a class="btn" href="${u('/predictions/' + m.slug + '/')}">ΑΝΑΛΥΣΗ ΑΓΩΝΑ</a></article>`;
};
export function dayPage({ date, today, rows, days, known, isRoot }) {
  const groups = [];
  for (const m of rows) { let g = groups.find(x => x.id === m.league_id); if (!g) groups.push(g = { id: m.league_id, name: m.league_name, country: m.league_country, logo: m.league_logo, items: [] }); g.items.push(m); }
  groups.sort((a, b) => (LG.indexOf(a.id) + 1 || 999) - (LG.indexOf(b.id) + 1 || 999));
  const picks = rows.filter(m => m.prediction?.status === 'ok').sort((a, b) => b.prediction.pct - a.prediction.pct).slice(0, 3);
  const filt = groups.length > 1 ? `<div class="filter"><label>Πρωτάθλημα: <select onchange="var v=this.value;document.querySelectorAll('.league').forEach(function(s){s.style.display=(!v||s.dataset.lg===v)?'':'none'})"><option value="">Όλα τα πρωταθλήματα</option>${groups.map(g => `<option value="${g.id}">${e(g.name)} (${g.items.length})</option>`).join('')}</select></label></div>` : '';
  const body = `<p class="selhead">Επίλεξε ημέρα</p><nav class="days" aria-label="Επιλογή ημέρας">${days.map(d => `<a href="${u('/day/' + d + '/')}" class="${d === date ? 'on' : ''}"><b>${fmtDay(d, { weekday: 'short' })}</b><span>${fmtDay(d, { day: 'numeric', month: 'short' })}</span>${d === today ? '<i>Σήμερα</i>' : ''}</a>`).join('')}
<form onsubmit="return false"><label>Άλλη ημερομηνία <input type="date" value="${date}" onchange="if(this.value)location.href='${u('/day/')}'+this.value+'/'"></label></form></nav>
${filt}<h1>${date === today ? 'Σημερινά προγνωστικά' : 'Προγνωστικά ' + fmtDay(date)}</h1>
${picks.length ? `<section class="picks"><h2>Οι ισχυρότερες επιλογές της ημέρας</h2><div class="grid3">${picks.map(m => `<a class="pick" href="${u('/predictions/' + m.slug + '/')}"><small>${fmtTime(m.kickoff_ts)} · ${e(m.league_name)}</small><strong>${e(m.home_name)} - ${e(m.away_name)}</strong><span class="sel">${e(m.prediction.label)}</span><em>${m.prediction.pct}% · εμπιστοσύνη ${e(m.prediction.confidence.toLowerCase())}</em></a>`).join('')}</div></section>` : ''}
${!groups.length ? '<p class="empty">Δεν υπάρχουν αγώνες στα πρωταθλήματα που καλύπτουμε για αυτή την ημέρα ή δεν έχουν φορτωθεί ακόμη. Δοκίμασε άλλη ημερομηνία.</p>' : ''}
${groups.map(g => `<section class="league" data-lg="${g.id}"><h2><img src="${e(g.logo)}" alt="" width="22" height="22" loading="lazy">${e(g.name)} <small>${e(g.country)}</small></h2>${g.items.map(card).join('')}</section>`).join('')}
${isRoot ? `<script>try{var d=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Athens'}).format(new Date());if(d!=='${today}'&&'${known.join(',')}'.split(',').indexOf(d)>-1)location.replace('${u('/day/')}'+d+'/')}catch(x){}</script>` : ''}`;
  return layout({ title: `Προγνωστικά ποδοσφαίρου ${fmtDay(date)} | ${NAME}`, desc: `Αναλυτικά προγνωστικά για τους ${rows.length} αγώνες της ${fmtDay(date)}: φόρμα, απουσίες, στατιστικά και πρόταση ανά αγώνα.`, path: isRoot ? '/' : `/day/${date}/`, body });
}

const dots = r => r.map(x => `<i class="f${x.res}">${x.res === 'W' ? 'Ν' : x.res === 'D' ? 'Ι' : 'Η'}</i>`).join('');
const resList = (l, name) => `<ul class="res">${l.map(r => `<li><span>${r.date} ${r.home ? 'vs' : '@'} ${e(r.opp)}</span><b class="${r.res}">${r.gf}-${r.ga}</b></li>`).join('') || '<li>Δεν υπάρχουν διαθέσιμα αποτελέσματα.</li>'}</ul>`;
const aiBlock = (m, a) => {
  const t = a.ai?.text, paras = t ? t.split(/\n\s*\n/) : narrative(m);
  return `<section class="panel ai"><h2>Ανάλυση αγώνα <small>${t ? (a.ai.edited ? '(επιμέλεια συντάκτη)' : '(δημιουργήθηκε αυτόματα με AI)') : '(αυτόματη, με βάση τα δεδομένα)'}</small></h2>${paras.map(x => `<p>${e(x)}</p>`).join('')}<p class="note">Το κείμενο βασίζεται αποκλειστικά στα δεδομένα των ενοτήτων παρακάτω και μπορεί να περιέχει λάθη. Έλεγξε τις επίσημες ανακοινώσεις των ομάδων.</p></section>`;
};
export function matchPage(m) {
  const a = m.analysis, p = m.prediction, name = `${m.home_name} - ${m.away_name}`, ok = evalFor(p, m);
  const ld = { '@context': 'https://schema.org', '@type': 'SportsEvent', name, startDate: new Date(m.kickoff_ts * 1000).toISOString(), location: { '@type': 'Place', name: m.venue || m.league_name }, homeTeam: { '@type': 'SportsTeam', name: m.home_name }, awayTeam: { '@type': 'SportsTeam', name: m.away_name } };
  let body = `<a class="back" href="${u('/day/' + m.match_date + '/')}">‹ Όλοι οι αγώνες</a>
<section class="hero"><p class="lg"><img src="${e(m.league_logo)}" alt="" width="20" height="20">${e(m.league_name)} · ${e(m.round)}</p>
<div class="vs"><div><img src="${e(m.home_logo)}" alt="${e(m.home_name)}" width="72" height="72"><h1>${e(m.home_name)}</h1></div>
<div class="mid"><b>${m.goals_home !== null ? `${m.goals_home} - ${m.goals_away}` : fmtTime(m.kickoff_ts)}</b><small>${fmtDay(m.match_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small><small>${e(statusLabel(m.status))}</small></div>
<div><img src="${e(m.away_logo)}" alt="${e(m.away_name)}" width="72" height="72"><h1>${e(m.away_name)}</h1></div></div>${m.venue ? `<p class="lg">Γήπεδο: ${e(m.venue)}</p>` : ''}</section>`;
  if (!a) body += '<p class="empty">Η πλήρης ανάλυση αυτού του αγώνα δεν έχει δημιουργηθεί ακόμη. Οι αναλύσεις παράγονται την ημέρα του αγώνα, με προτεραιότητα στα μεγαλύτερα πρωταθλήματα. Δεν εμφανίζουμε στοιχεία που δεν έχουμε από αξιόπιστη πηγή.</p>';
  else {
    const vrow = (n, v) => `<tr><td>${e(n)}</td>${v ? `<td>${v.p}</td><td>${v.w}</td><td>${v.d}</td><td>${v.l}</td><td>${v.gf}-${v.ga}</td>` : '<td colspan="5">Δεν διατίθενται δεδομένα</td>'}</tr>`;
    const injCol = (n, l) => `<div><h3>${e(n)}</h3>${!a.injuries.has ? '<p class="note">Δεν υπάρχουν διαθέσιμες πληροφορίες.</p>' : !l.length ? '<p class="note">Δεν έχουν καταγραφεί απουσίες στην πηγή (αυτό δεν σημαίνει απαραίτητα ότι δεν υπάρχουν).</p>' : `<ul class="list">${l.map(i => `<li><b>${e(i.name)}</b> <span>${e(i.kind)} · ${e(i.status)}${i.reason ? ' · ' + e(i.reason) : ''}</span></li>`).join('')}</ul>`}</div>`;
    body += aiBlock(m, a) + `<section class="panel two"><div><h2>Φόρμα: ${e(m.home_name)}</h2><div class="form">${dots(a.form.home)}</div>${resList(a.form.home)}</div><div><h2>Φόρμα: ${e(m.away_name)}</h2><div class="form">${dots(a.form.away)}</div>${resList(a.form.away)}</div></section>
<section class="panel"><h2>Βαθμολογία και κίνητρο</h2><div class="two"><p>${e(a.motivation.home)}</p><p>${e(a.motivation.away)}</p></div><p class="note">Το κίνητρο είναι εκτίμηση με βάση τη θέση στη βαθμολογία, όχι επιβεβαιωμένη πληροφορία.</p></section>
<section class="panel"><h2>Στατιστικά εντός και εκτός έδρας (τρέχουσα σεζόν)</h2><div class="scroll"><table><thead><tr><th></th><th>Αγ.</th><th>Ν</th><th>Ι</th><th>Η</th><th>Γκολ</th></tr></thead><tbody>${vrow(m.home_name + ' (εντός)', a.venue.home)}${vrow(m.away_name + ' (εκτός)', a.venue.away)}</tbody></table></div></section>
<section class="panel"><h2>Απουσίες</h2><div class="two">${injCol(m.home_name, a.injuries.home)}${injCol(m.away_name, a.injuries.away)}</div></section>
<section class="panel"><h2>Ενδεκάδες</h2>${m.lineups ? `<p class="note ok">Επίσημες ενδεκάδες, όπως ανακοινώθηκαν.</p><div class="two">${m.lineups.map(t => `<div><h3>${e(t.team_id === m.home_id ? m.home_name : m.away_name)} <small>${e(t.formation)}</small></h3><ol class="xi">${t.xi.map(x => `<li><b>${x.n}</b> ${e(x.name)}</li>`).join('')}</ol></div>`).join('')}</div>` : '<p class="note">Οι ενδεκάδες δεν έχουν ανακοινωθεί ακόμη και θα εμφανιστούν εδώ μόλις είναι επίσημες (συνήθως 20-60\' πριν την έναρξη). Δεν δημοσιεύουμε εκτιμώμενες ενδεκάδες χωρίς αξιόπιστη πηγή.</p>'}</section>
<section class="panel"><h2>Head to Head</h2>${a.h2h.list.length ? `<p><b>${a.h2h.hw}</b> νίκες ${e(m.home_name)} · <b>${a.h2h.d}</b> ισοπαλίες · <b>${a.h2h.aw}</b> νίκες ${e(m.away_name)} · μ.ό. ${a.h2h.avg} γκολ</p><ul class="res">${a.h2h.list.map(x => `<li><span>${x.date} · ${e(x.home)} - ${e(x.away)}</span><b>${x.gh}-${x.ga}</b></li>`).join('')}</ul>` : '<p class="note">Δεν υπάρχει ιστορικό αναμετρήσεων στην πηγή δεδομένων.</p>'}</section>
<section class="panel"><h2>Σημαντικές πληροφορίες</h2><ul class="list">${a.notes.map(n => `<li>${e(n)}</li>`).join('')}</ul></section>
`;
  }
  body += `<section class="pred"><h2>Προγνωστικό</h2>${p && p.status === 'ok' ? `<div class="big"><span class="pl">Επιλογή</span><strong>${e(p.label)}</strong></div>
<dl><div><dt>Αγορά</dt><dd>${e(p.market)}</dd></div><div><dt>Εκτίμηση πιθανότητας</dt><dd>${p.pct}%</dd></div><div><dt>Επίπεδο εμπιστοσύνης</dt><dd>${e(p.confidence)}</dd></div></dl>
<h3>Αιτιολόγηση</h3><ul class="list">${p.reasons.map(r => `<li>${e(r)}</li>`).join('')}</ul>
<p class="alts">Αγορές που εξετάστηκαν: ${p.alts.map(x => `<span>${e(x.label)} ${x.pct}%</span>`).join('')}</p>
${ok !== null ? `<p class="result ${ok ? 'win' : 'loss'}">Αποτέλεσμα προγνωστικού: ${ok ? 'επιτυχία' : 'αποτυχία'}</p>` : ''}` : `<p>${e(p ? p.note : 'Δεν υπάρχουν επαρκή δεδομένα για προγνωστικό σε αυτόν τον αγώνα.')}</p>`}
${p?.source === 'manual' ? '<p class="note">Επιλογή συντάκτη: η πιθανότητα είναι εκτίμηση της συντακτικής ομάδας.</p>' : '<p class="note">Η πιθανότητα είναι εκτίμηση στατιστικού μοντέλου.</p>'}<p class="note">Δεν αποτελεί εγγύηση. Δεν προτείνουμε ποσά στοιχηματισμού. 18+, παίξτε υπεύθυνα.</p></section>`;
  return layout({ ld, path: `/predictions/${m.slug}/`, body,
    title: `${name} Προγνωστικά & Ανάλυση ${fmtDay(m.match_date, { day: 'numeric', month: 'long' })} | ${NAME}`,
    desc: p && p.status === 'ok' ? `${name} (${m.league_name}): ανάλυση, απουσίες, στατιστικά και προγνωστικό ${p.label} με εκτιμώμενη πιθανότητα ${p.pct}%.` : `${name} (${m.league_name}): στοιχεία, φόρμα και στατιστικά του αγώνα ${fmtDay(m.match_date)}.` });
}
export function statsPage(st) {
  const tbl = (t, l) => `<div class="panel"><h3>${t}</h3>${!l.length ? '<p class="note">Δεν υπάρχουν ακόμη δεδομένα.</p>' : `<table><thead><tr><th></th><th>Επιτυχίες</th><th>Ποσοστό</th></tr></thead><tbody>${l.map(x => `<tr><td>${e(x.k)}</td><td>${x.w}/${x.n}</td><td><div class="bar"><i style="width:${x.rate}%"></i></div>${x.rate}%</td></tr>`).join('')}</tbody></table>`}</div>`;
  const body = `<h1>Στατιστικά επιτυχίας</h1><p class="note">Κάθε βασικό προγνωστικό καταγράφεται πριν τον αγώνα και ελέγχεται αυτόματα μετά το τέλος του (αποτέλεσμα 90 λεπτών). Δεν αλλάζει μετά την έναρξη.</p>
<div class="kpis"><div><b>${st.rate === null ? '—' : st.rate + '%'}</b><span>Ποσοστό επιτυχίας (${st.w} από ${st.n})</span></div><div><b>${st.avgPct === null ? '—' : st.avgPct + '%'}</b><span>Μέση εκτιμώμενη πιθανότητα</span></div><div><b>${st.pending}</b><span>Σε αναμονή</span></div><div><b>${st.voided}</b><span>Ακυρώθηκαν</span></div></div>
${st.n < 30 ? '<p class="note">Μικρό δείγμα (λιγότερα από 30 ολοκληρωμένα προγνωστικά): τα ποσοστά δεν είναι ακόμη στατιστικά αξιόπιστα.</p>' : ''}
<div class="three">${tbl('Ανά αγορά', st.byMarket)}${tbl('Ανά επίπεδο εμπιστοσύνης', st.byConf)}${tbl('Ανά πηγή (auto = μοντέλο, manual = συντάκτης)', st.bySource)}</div>
<section class="panel"><h2>Τελευταία ολοκληρωμένα</h2><div class="scroll"><table><thead><tr><th>Αγώνας</th><th>Επιλογή</th><th>Πιθ.</th><th></th></tr></thead><tbody>${st.recent.map(x => `<tr><td><a href="${u('/predictions/' + x.slug + '/')}">${e(x.home)} - ${e(x.away)}</a></td><td>${e(x.label)}</td><td>${x.pct}%</td><td class="${x.result === 'win' ? 'win' : 'loss'}">${x.result === 'win' ? 'Επιτυχία' : 'Αποτυχία'}</td></tr>`).join('') || '<tr><td colspan="4">Δεν έχει ολοκληρωθεί ακόμη κάποιο προγνωστικό.</td></tr>'}</tbody></table></div></section>`;
  return layout({ title: `Στατιστικά επιτυχίας προγνωστικών | ${NAME}`, desc: 'Πλήρες, επαληθευμένο ιστορικό των προγνωστικών μας: ποσοστό επιτυχίας συνολικά και ανά αγορά.', path: '/stats/', body });
}
export const notFound = () => layout({ title: `Η σελίδα δεν βρέθηκε | ${NAME}`, desc: 'Η σελίδα δεν βρέθηκε.', path: '/404.html', body: `<h1>Η σελίδα δεν βρέθηκε</h1><p class="empty">Ο αγώνας ή η ημέρα δεν υπάρχει ακόμη. <a href="${u('/')}">Δες τους αγώνες της ημέρας</a>.</p>` });
