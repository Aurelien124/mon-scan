'use strict';
// Suivi annuel : régularité, volume, équilibre, progression, records, analyses « coach » et bilan pour Claude.
// (chargé avant app.js ; utilise ses fonctions au moment de l'affichage)

const DAY = 864e5;
const CATS = { 'Pectoraux': 'Poussée', 'Épaules': 'Poussée', 'Triceps': 'Poussée', 'Dos': 'Tirage', 'Biceps': 'Tirage', 'Quadriceps': 'Jambes (genou)', 'Mollets': 'Jambes (genou)', 'Ischios': 'Chaîne postérieure', 'Fessiers': 'Chaîne postérieure', 'Abdos/Gainage': 'Gainage', 'Pliométrie': 'Pliométrie / terrain', 'Cardio': 'Pliométrie / terrain', 'Corps entier': 'Corps entier' };
const CAT_ORDER = ['Poussée', 'Tirage', 'Jambes (genou)', 'Chaîne postérieure', 'Gainage', 'Pliométrie / terrain', 'Corps entier'];

function mondayOf(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
function suiviTabs(cur) {
  return `<div class="tabs"><button class="${cur === 'annee' ? 'on' : ''}" onclick="location.hash='#/suivi'">Année</button><button class="${cur === 'historique' ? 'on' : ''}" onclick="location.hash='#/historique'">Historique</button></div>`;
}
const workSets = it => it.sets.filter(s => s.done && !s.warm);
// Valeur de performance d'un exercice dans une séance : 1RM estimé si charge, sinon reps (ou secondes) max
function perfOf(it) {
  const ss = workSets(it); if (!ss.length) return null;
  const w = Math.max(...ss.map(s => s.w || 0));
  if (w > 0) return { v: Math.max(...ss.map(s => e1rm(s.w, s.r))), unit: 'kg', kind: '1RM estimé' };
  return { v: Math.max(...ss.map(s => s.r || 0)), unit: '', kind: 'max' };
}
function exSeries(exId, from = 0, to = Infinity) {
  const out = [];
  for (const w of doneWorkouts().slice().reverse()) if (w.start >= from && w.start < to) for (const it of w.items) if (it.exId === exId) { const p = perfOf(it); if (p) out.push({ t: w.start, w, it, ...p }); }
  return out; // chronologique
}
function weekStats(ws, from, to) {
  const goal = S.settings.goal || 2; const weeks = [];
  for (let m = mondayOf(from); m < to; m += 7 * DAY) weeks.push({ m, n: ws.filter(w => w.start >= m && w.start < m + 7 * DAY).length });
  const now = Date.now(); const elapsed = weeks.filter(x => x.m <= now);
  const complete = elapsed.filter(x => x.m + 7 * DAY <= now);
  let best = 0, run = 0; for (const x of complete) { run = x.n >= goal ? run + 1 : 0; best = Math.max(best, run); }
  // série en cours : semaines complètes consécutives + semaine en cours si objectif déjà atteint
  let cur = 0; for (let i = complete.length - 1; i >= 0 && complete[i].n >= goal; i--) cur++;
  const thisWeek = elapsed.find(x => x.m + 7 * DAY > now); if (thisWeek && thisWeek.n >= goal) { cur++; best = Math.max(best, cur); }
  return { weeks, elapsed, complete, hit: complete.filter(x => x.n >= goal).length, best, cur, goal };
}
function catSets(ws) {
  const c = {}; for (const w of ws) for (const it of w.items) { const k = CATS[ex(it.exId).muscle] || 'Corps entier'; c[k] = (c[k] || 0) + workSets(it).length; } return c;
}
function prEvents(from = 0, to = Infinity) {
  const best = {}, ev = [];
  for (const w of doneWorkouts().slice().reverse()) for (const it of w.items) {
    const p = perfOf(it); if (!p || ex(it.exId).type === 'temps') continue;
    const b = best[it.exId];
    if (b != null && p.v > b + 0.01 && w.start >= from && w.start < to) ev.push({ t: w.start, exId: it.exId, v: p.v, prev: b, unit: p.unit });
    best[it.exId] = Math.max(b ?? 0, p.v);
  }
  return ev;
}

// ---------- Analyses « coach » ----------
function coachInsights() {
  const ws = doneWorkouts(); const out = [];
  if (!ws.length) return [{ ic: '👋', t: 'Pas encore de données', d: 'Fais tes premières séances : les analyses apparaîtront ici au fil des semaines.' }];
  const now = Date.now(), goal = S.settings.goal || 2;
  const d28 = ws.filter(w => w.start > now - 28 * DAY), prev28 = ws.filter(w => w.start > now - 56 * DAY && w.start <= now - 28 * DAY);
  // 1. Régularité
  const per = d28.length / 4;
  if (per >= goal) out.push({ ic: '✅', t: `Régularité au top : ${fmtKg(Math.round(per * 10) / 10)} séance${per >= 2 ? 's' : ''}/semaine`, d: `Sur les 4 dernières semaines, tu tiens ton objectif (${goal}/semaine).` });
  else out.push({ ic: '📅', t: `Régularité : ${fmtKg(Math.round(per * 10) / 10)} séance/semaine sur 4 semaines`, d: `En dessous de ton objectif de ${goal}. Cale tes créneaux muscu en début de semaine (ou baisse l'objectif dans les Réglages s'il n'est pas réaliste en ce moment).` });
  // 2. Reprise après coupure
  const gap = (now - ws[0].start) / DAY;
  if (gap > 9) out.push({ ic: '🔁', t: `Dernière séance il y a ${Math.round(gap)} jours`, d: 'Pour reprendre, baisse les charges d\'environ 10 % sur la première séance puis remonte.' });
  // 3. Stagnations / progrès par exercice
  const exIds = [...new Set(ws.flatMap(w => w.items.map(i => i.exId)))];
  const stag = [], up = [];
  for (const id of exIds) {
    const et = ex(id).type; if (et === 'temps' || et === 'plio') continue;
    const ser = exSeries(id); if (ser.length < 4 || !ser.some(x => x.unit)) continue;
    const last3 = ser.slice(-3), before = ser.slice(0, -3);
    const bestBefore = Math.max(...before.map(x => x.v)), bestLast = Math.max(...last3.map(x => x.v));
    if (bestLast <= bestBefore + 0.01) stag.push(ex(id).name);
    const old = ser.filter(x => x.t < now - 35 * DAY); const ref = old.length ? old[old.length - 1].v : ser[0].v;
    if (ref > 0 && bestLast / ref >= 1.05) up.push(`${ex(id).name} (+${Math.round((bestLast / ref - 1) * 100)} %)`);
  }
  if (up.length) out.push({ ic: '📈', t: 'En progression', d: up.slice(0, 5).join(', ') + '.' });
  if (stag.length) out.push({ ic: '⏸️', t: `Stagnation sur ${stag.length} exercice${stag.length > 1 ? 's' : ''}`, d: `${stag.slice(0, 5).join(', ')} : pas de progrès sur les 3 dernières séances. Pistes : changer de fourchette de reps, ajouter une série, travailler le tempo, ou passer par une semaine plus légère.` });
  // 4. Reps manquées / prêt à monter (dernière séance de chaque exercice)
  const heavy = [], ready = [];
  for (const id of exIds) {
    const ser = exSeries(id, now - 28 * DAY); if (!ser.length) continue;
    const last = ser[ser.length - 1].it; const rg = repsRange(last.targetReps); if (!rg) continue;
    const ss = workSets(last);
    if (ss.filter(s => (s.r || 0) < rg[0]).length >= 2) heavy.push(ex(id).name);
    else if (ss.length && ss.every(s => (s.r || 0) >= rg[1]) && ss.some(s => s.w)) ready.push(ex(id).name);
  }
  if (ready.length) out.push({ ic: '⬆️', t: 'Prêt à augmenter la charge', d: `${ready.slice(0, 6).join(', ')} : toutes les reps validées la dernière fois. L'appli te proposera +${fmtKg(S.settings.inc)} kg.` });
  if (heavy.length) out.push({ ic: '🎯', t: 'Charges peut-être trop lourdes', d: `${heavy.slice(0, 6).join(', ')} : plusieurs séries sous la fourchette de reps visée. Garde la charge jusqu'à valider toutes les reps, ou baisse un peu.` });
  // 5. Équilibre tirage / poussée
  const cs = catSets(d28);
  if ((cs['Poussée'] || 0) >= 6) {
    const r = (cs['Tirage'] || 0) / cs['Poussée'];
    if (r < 0.8) out.push({ ic: '⚖️', t: `Plus de poussée que de tirage (ratio ${fmtKg(Math.round(r * 100) / 100)})`, d: 'Vise au moins autant de séries de tirage que de poussée pour la santé des épaules (rowing, tractions, face pull).' });
    else out.push({ ic: '⚖️', t: 'Équilibre poussée / tirage correct', d: `${cs['Tirage'] || 0} séries de tirage pour ${cs['Poussée']} de poussée sur 4 semaines.` });
  }
  // 6. Évolution du volume
  const v1 = d28.reduce((a, w) => a + volume(w), 0), v0 = prev28.reduce((a, w) => a + volume(w), 0);
  if (v0 > 0 && v1 / v0 > 1.3) out.push({ ic: '⚠️', t: `Tonnage en forte hausse (+${Math.round((v1 / v0 - 1) * 100)} % sur 4 semaines)`, d: 'Une hausse brutale augmente le risque de blessure, surtout avec le basket à côté. Monte plus progressivement.' });
  else if (v0 > 0 && v1 / v0 < 0.7) out.push({ ic: '📉', t: `Tonnage en baisse (${Math.round((v1 / v0 - 1) * 100)} % sur 4 semaines)`, d: 'Normal si c\'est une phase d\'allègement ou la reprise de saison ; sinon, vérifie la régularité.' });
  // 7. Fatigue ressentie
  const feels = ws.slice(0, 4).map(w => w.feel).filter(Boolean);
  if (feels.length >= 3) { const f = feels.reduce((a, b) => a + b, 0) / feels.length; if (f >= 8.5) out.push({ ic: '🔋', t: `Séances très dures (difficulté moyenne ${fmtKg(Math.round(f * 10) / 10)}/10)`, d: 'Sur les dernières séances : si ça dure, place une semaine plus légère (-30 % de volume).' }); }
  // 8. Semaine de décharge
  const st = weekStats(ws, now - 70 * DAY, now);
  if (st.cur >= 6) out.push({ ic: '🛌', t: `${st.cur} semaines d'affilée à fond`, d: 'Pense à une semaine de décharge (moins de séries, charges -10 à -20 %) pour mieux repartir.' });
  return out;
}

// ---------- Vue Suivi ----------
let suiviYear = null;
function vSuivi() {
  const all = doneWorkouts();
  const years = [...new Set([new Date().getFullYear(), ...all.map(w => new Date(w.start).getFullYear())])].sort((a, b) => b - a);
  const year = suiviYear || years[0];
  const from = new Date(year, 0, 1).getTime(), to = new Date(year + 1, 0, 1).getTime();
  const ws = all.filter(w => w.start >= from && w.start < to);
  const firstT = all.length ? all[all.length - 1].start : Date.now();
  const st = weekStats(all, Math.max(from, mondayOf(firstT)), to);
  const tonnage = ws.reduce((a, w) => a + volume(w), 0);
  const hours = ws.reduce((a, w) => a + (w.end - w.start), 0) / 36e5;
  const feels = ws.map(w => w.feel).filter(Boolean);
  const prs = prEvents(from, to);

  // Progression par exercice
  const exIds = [...new Set(ws.flatMap(w => w.items.map(i => i.exId)))];
  const prog = exIds.map(id => { const ser = exSeries(id, from, to); return { id, ser }; }).filter(x => x.ser.length >= 2)
    .map(x => { const first = x.ser[0].v, last = Math.max(...x.ser.slice(-3).map(s => s.v)); return { ...x, first, last, pct: first ? (last / first - 1) * 100 : 0, unit: x.ser[0].unit }; })
    .sort((a, b) => b.ser.length - a.ser.length).slice(0, 12);

  const cs28 = catSets(all.filter(w => w.start > Date.now() - 28 * DAY)), csY = catSets(ws);
  const maxC = Math.max(1, ...Object.values(csY));

  app.innerHTML = `<h1>Suivi</h1>${suiviTabs('annee')}
    ${years.length > 1 ? `<div class="tabs">${years.map(y => `<button class="${y === year ? 'on' : ''}" data-y="${y}">${y}</button>`).join('')}</div>` : ''}
    <div class="stats">
      <div class="stat"><b>${ws.length}</b><span>séances ${year}</span></div>
      <div class="stat"><b>${st.elapsed.length ? fmtKg(Math.round(ws.length / st.elapsed.length * 10) / 10) : 0}</b><span>par semaine</span></div>
      <div class="stat"><b>${Math.round(hours)} h</b><span>d'entraînement</span></div>
      <div class="stat"><b>${st.complete.length ? Math.round(st.hit / st.complete.length * 100) : 0} %</b><span>semaines à l'objectif (${st.goal})</span></div>
      <div class="stat"><b>${st.cur}</b><span>série en cours (sem.)</span></div>
      <div class="stat"><b>${fmtKg(Math.round(tonnage / 100) / 10)} t</b><span>tonnage</span></div>
    </div>

    <h2>Régularité</h2>
    <div class="card">${heatmap(ws, year)}<div class="row tiny dim" style="margin-top:6px;gap:6px">Moins <i style="width:10px;height:10px;border-radius:2px;background:var(--card2)"></i><i style="width:10px;height:10px;border-radius:2px;background:#ff6b2c77"></i><i style="width:10px;height:10px;border-radius:2px;background:#ff6b2c"></i> Plus · meilleure série : ${st.best} semaine${st.best > 1 ? 's' : ''} à l'objectif</div></div>
    <div class="card">${monthBars(ws, year)}</div>

    <h2>Analyses du coach</h2>
    <div class="card" style="padding:2px 14px">${coachInsights().map(i => `<div class="insight"><div class="ic">${i.ic}</div><div><b class="small">${esc(i.t)}</b><div class="small mut">${esc(i.d)}</div></div></div>`).join('')}</div>
    <button class="btn pri block" style="margin-top:10px" data-a="bilan">🤖 Préparer mon bilan pour Claude</button>
    <div class="tiny dim" style="text-align:center;margin-top:4px">Un résumé à m'envoyer pour que j'ajuste ta prog comme un coach</div>

    <h2>Progression ${year}</h2>
    ${prog.length ? `<div class="card" style="padding:4px 12px">${prog.map(x => `<a class="list-item tap" href="#/exercice/${x.id}" style="text-decoration:none;color:inherit">
      <div class="grow"><div class="small">${esc(ex(x.id).name)}</div><div class="tiny dim">${x.ser.length} séances · ${x.unit ? '1RM est.' : 'max'} ${fmtKg(Math.round(x.first))} → ${fmtKg(Math.round(x.last))}${x.unit ? ' kg' : ''}</div></div>
      ${spark(x.ser.map(s => s.v))}<span class="pill ${x.pct > 0.5 ? 'ok' : ''}" style="min-width:58px;text-align:center">${x.pct > 0 ? '+' : ''}${Math.round(x.pct)} %</span></a>`).join('')}</div>` : '<div class="empty small">Au moins 2 séances par exercice pour voir ta progression.</div>'}

    <h2>Équilibre musculaire</h2>
    <div class="card"><div class="row tiny dim between"><span>Séries de travail</span><span>4 sem. · ${year}</span></div>
      ${CAT_ORDER.filter(c => csY[c] || cs28[c]).map(c => `<div style="margin-top:8px"><div class="row between small"><span>${c}</span><span class="mut">${cs28[c] || 0} · ${csY[c] || 0}</span></div><div style="background:var(--card2);border-radius:5px;margin-top:3px"><div class="bar-h" style="width:${(csY[c] || 0) / maxC * 100}%"></div></div></div>`).join('') || '<div class="empty small">Pas encore de données.</div>'}</div>

    <h2>Records ${year} <span class="small mut">· ${prs.length}</span></h2>
    <div class="card" style="padding:4px 12px">${prs.slice(-8).reverse().map(p => `<div class="list-item small"><span>🏅</span><div class="grow">${esc(ex(p.exId).name)} <span class="mut">${fmtKg(Math.round(p.prev * 10) / 10)} → <b style="color:var(--txt)">${fmtKg(Math.round(p.v * 10) / 10)}</b>${p.unit ? ' kg (1RM est.)' : ' reps'}</span></div><span class="tiny dim">${fmtDateShort(p.t)}</span></div>`).join('') || '<div class="empty small">Tes records apparaîtront ici.</div>'}</div>
    ${feels.length ? `<p class="small mut" style="text-align:center;margin-top:14px">Difficulté ressentie moyenne : <b>${fmtKg(Math.round(feels.reduce((a, b) => a + b, 0) / feels.length * 10) / 10)}/10</b> sur ${feels.length} séance${feels.length > 1 ? 's' : ''}</p>` : ''}`;
  app.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { suiviYear = +b.dataset.y; vSuivi(); });
}
function heatmap(ws, year) {
  const start = mondayOf(new Date(year, 0, 1).getTime()), end = new Date(year + 1, 0, 1).getTime();
  const byDay = {}; for (const w of ws) { const d = new Date(w.start); d.setHours(0, 0, 0, 0); byDay[d.getTime()] = (byDay[d.getTime()] || 0) + 1; }
  const cs = 6.2, g = 1.4, top = 12, left = 12;
  let s = '', col = 0, lastMonth = -1; const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let m = start; m < end; m += 7 * DAY, col++) {
    for (let d = 0; d < 7; d++) {
      const t = new Date(m); t.setDate(t.getDate() + d); const tt = t.getTime();
      if (t.getFullYear() !== year) continue;
      const n = byDay[tt] || 0;
      const fill = n >= 2 ? '#ff6b2c' : n === 1 ? '#ff6b2c99' : tt > today.getTime() ? '#1c1f26' : '#2a2e38';
      s += `<rect x="${left + col * (cs + g)}" y="${top + d * (cs + g)}" width="${cs}" height="${cs}" rx="1.4" fill="${fill}"${tt === today.getTime() ? ' stroke="#eef0f4" stroke-width=".6"' : ''}/>`;
      if (d === 0 || (t.getDate() === 1)) { const mo = t.getMonth(); if (mo !== lastMonth && t.getDate() <= 7) { lastMonth = mo; s += `<text x="${left + col * (cs + g)}" y="8" fill="#6b7280" font-size="5.5">${t.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</text>`; } }
    }
  }
  s += ['L', '', 'M', '', 'V', '', 'D'].map((l, i) => l ? `<text x="2" y="${top + i * (cs + g) + 5}" fill="#6b7280" font-size="5">${l}</text>` : '').join('');
  return `<svg class="heat" viewBox="0 0 ${left + col * (cs + g) + 2} ${top + 7 * (cs + g) + 2}">${s}</svg>`;
}
function monthBars(ws, year) {
  const n = new Array(12).fill(0), ton = new Array(12).fill(0);
  for (const w of ws) { const m = new Date(w.start).getMonth(); n[m]++; ton[m] += volume(w); }
  const mx = Math.max(4, ...n), cur = new Date().getFullYear() === year ? new Date().getMonth() : 11;
  return `<div class="small mut" style="margin-bottom:8px">Séances et tonnage par mois</div><div class="row" style="align-items:flex-end;height:96px;gap:4px">${n.map((c, i) => `<div class="grow" style="text-align:center">
    <div class="tiny dim" style="height:12px">${c || ''}</div><div style="height:${Math.max(2, c / mx * 60)}px;background:${i === cur ? 'var(--acc)' : c ? '#ff6b2c88' : 'var(--card2)'};border-radius:4px"></div>
    <div class="tiny dim" style="margin-top:3px">${'JFMAMJJASOND'[i]}</div></div>`).join('')}</div>
    <div class="tiny dim" style="margin-top:6px">Tonnage du mois en cours : ${fmtKg(Math.round(ton[cur]))} kg${cur > 0 && ton[cur - 1] ? ` (mois précédent : ${fmtKg(Math.round(ton[cur - 1]))} kg)` : ''}</div>`;
}
function spark(vals) {
  if (vals.length < 2) return '';
  const W = 54, H = 20, lo = Math.min(...vals), hi = Math.max(...vals), r = hi - lo || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * W).toFixed(1)},${(H - 2 - (v - lo) / r * (H - 4)).toFixed(1)}`).join(' ');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="flex:none"><polyline points="${pts}" fill="none" stroke="#ff6b2c" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

// ---------- Bilan pour Claude ----------
function bilanText(days) {
  const now = Date.now(), from = days ? now - days * DAY : 0;
  const ws = doneWorkouts().filter(w => w.start >= from).slice().reverse();
  const f = t => new Date(t).toLocaleDateString('fr-FR');
  const L = [];
  L.push(`BILAN MA MUSCU — ${days ? `du ${f(from)} au ${f(now)}` : 'depuis le début'} (${ws.length} séance${ws.length > 1 ? 's' : ''})`);
  L.push('Contexte : je joue au basket (entraînements + matchs) et je fais de la muscu/prépa physique à côté.');
  const p = S.programs.find(x => x.id === S.activeProgramId);
  if (p) {
    L.push(`\nPROGRAMME ACTIF : ${p.name}`);
    p.weeks.forEach(w => w.sessions.forEach(se => L.push(`- ${p.weeks.length > 1 ? w.name + ' · ' : ''}${se.name} : ${se.items.map(i => `${ex(i.exId).name}${i.ss ? ' (enchaîné)' : ''} ${i.sets}×${i.reps}${i.weight != null && i.weight !== '' ? ' ' + (typeof i.weight === 'number' ? i.weight + ' kg' : i.weight) : ''}${i.rest ? ' r' + fmtRest(i.rest) : ''}`).join(' ; ')}`)));
  }
  const st = weekStats(doneWorkouts(), Math.max(from, mondayOf(ws[0]?.start ?? now)), now);
  L.push(`\nRÉGULARITÉ : ${ws.length} séances sur ${st.elapsed.length} semaine(s), moyenne ${fmtKg(Math.round(ws.length / Math.max(1, st.elapsed.length) * 10) / 10)}/semaine (objectif ${st.goal}). Semaines à l'objectif : ${st.hit}/${st.complete.length}.`);
  const feels = ws.map(w => w.feel).filter(Boolean);
  if (feels.length) L.push(`Difficulté ressentie moyenne : ${fmtKg(Math.round(feels.reduce((a, b) => a + b, 0) / feels.length * 10) / 10)}/10.`);
  const vol = ws.reduce((a, w) => a + volume(w), 0); L.push(`Tonnage total : ${fmtKg(Math.round(vol))} kg. Durée moyenne : ${ws.length ? fmtDur(ws.reduce((a, w) => a + w.end - w.start, 0) / ws.length) : '—'}.`);
  L.push('\nDÉTAIL PAR EXERCICE (charge×reps par série ; É = échauffement exclu)');
  const ids = [...new Set(ws.flatMap(w => w.items.map(i => i.exId)))];
  for (const id of ids) {
    const ser = exSeries(id, from, now + 1); if (!ser.length) continue;
    const e = ex(id); const first = ser[0], last = ser[ser.length - 1];
    let head = `- ${e.name} (${e.muscle}) — ${ser.length} séance${ser.length > 1 ? 's' : ''}`;
    if (ser.length >= 2) head += ` — ${first.unit ? '1RM estimé' : 'max'} ${fmtKg(Math.round(first.v))} → ${fmtKg(Math.round(last.v))}${first.unit ? ' kg' : ''}`;
    L.push(head);
    for (const s of ser.slice(-6)) L.push(`    ${fmtDateShort(s.t)} (objectif ${s.it.sets.length}×${s.it.targetReps || '?'}${s.it.targetWeight ? ' ' + s.it.targetWeight : ''}) : ${workSets(s.it).map(x => (x.w ? fmtKg(x.w) + '×' : '') + (x.r ?? '')).join(', ')}`);
  }
  const prs = prEvents(from, now + 1);
  if (prs.length) { L.push('\nRECORDS'); prs.forEach(r => L.push(`- ${f(r.t)} ${ex(r.exId).name} : ${fmtKg(Math.round(r.prev * 10) / 10)} → ${fmtKg(Math.round(r.v * 10) / 10)}${r.unit ? ' kg (1RM est.)' : ' reps'}`)); }
  L.push('\nSIGNAUX DÉTECTÉS PAR L\'APPLI'); coachInsights().forEach(i => L.push(`- ${i.t}. ${i.d}`));
  const notes = ws.filter(w => w.comment || w.feel);
  if (notes.length) { L.push('\nNOTES DE SÉANCE'); notes.forEach(w => L.push(`- ${f(w.start)} ${w.name}${w.feel ? ` (difficulté ${w.feel}/10)` : ''}${w.comment ? ' : ' + w.comment : ''}`)); }
  L.push('\nDEMANDE : analyse ce bilan comme mon coach. Dis-moi ce qui progresse, ce qui stagne et pourquoi, et propose des ajustements concrets de mon programme pour les prochaines semaines (charges, séries/reps, exercices, récupération, gestion avec le basket). Si utile, donne-moi le programme ajusté au format texte importable dans Ma Muscu.');
  return L.join('\n');
}
function bilanModal() {
  const m = modal(`<div class="row"><h2 class="grow" style="margin:0">Bilan pour Claude</h2><button class="icon-btn" data-a="close">✕</button></div>
    <p class="small mut">Copie ce bilan et colle-le dans une conversation avec Claude (projet « Sport & muscu ») : il analysera tes séances et ajustera ta prog.</p>
    <div class="tabs" id="bp"><button data-d="28" class="on">4 semaines</button><button data-d="91">3 mois</button><button data-d="365">1 an</button><button data-d="0">Tout</button></div>
    <textarea id="bt" style="min-height:260px;font-size:12px;font-family:ui-monospace,Menlo,monospace" readonly></textarea>
    <div class="row" style="margin-top:10px"><button class="btn pri grow" id="bcopy">Copier</button><button class="btn grow" id="bshare">Partager…</button></div>`);
  const set = d => { m.querySelector('#bt').value = bilanText(d); };
  set(28);
  m.querySelector('#bp').onclick = ev => { const b = ev.target.closest('[data-d]'); if (!b) return; m.querySelectorAll('#bp button').forEach(x => x.classList.toggle('on', x === b)); set(+b.dataset.d); };
  m.querySelector('#bcopy').onclick = async () => {
    const t = m.querySelector('#bt'); try { await navigator.clipboard.writeText(t.value); } catch (e) { t.removeAttribute('readonly'); t.select(); document.execCommand('copy'); t.setAttribute('readonly', ''); }
    toast('Bilan copié : colle-le dans Claude');
  };
  m.querySelector('#bshare').onclick = () => { const t = m.querySelector('#bt').value; if (navigator.share) navigator.share({ title: 'Bilan Ma Muscu', text: t }).catch(() => {}); else shareOrDownload('bilan-ma-muscu.txt', t, 'text/plain'); };
}
document.addEventListener('click', e => { if (e.target.closest('[data-a="bilan"]')) bilanModal(); });
