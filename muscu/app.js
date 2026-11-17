'use strict';
/* ============================================================
   Ma Muscu — appli perso de suivi de musculation (PWA, hors ligne)
   Données stockées sur l'appareil (localStorage) + sauvegarde JSON.
   ============================================================ */

// ---------- Stockage ----------
const KEY = 'ma-muscu-v1';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const DEFAULT_SETTINGS = { inc: 2.5, rest: 90, bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], sound: true, vibrate: true, autoTimer: true, wake: true, notif: false, goal: 2, iphoneTimer: /iPhone|iPad/.test(navigator.userAgent), shortcut: 'MaMuscu' };

let S = load();
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!d) {
    d = { exercises: {}, programs: [], workouts: [], active: null, activeProgramId: null, settings: { ...DEFAULT_SETTINGS }, timer: null, lastBackup: null };
    for (const [name, muscle, type, aliases] of SEED_EXERCISES) {
      const id = uid(); d.exercises[id] = { id, name, muscle, type, aliases, note: '' };
    }
  }
  d.settings = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
  if (d.settings.shortcut === 'Récup Ma Muscu') d.settings.shortcut = 'MaMuscu';
  for (const [name, muscle, type, aliases] of SEED_EXERCISES) { // nouveaux exercices ajoutés à la bibliothèque
    if (!Object.values(d.exercises).some(e => e.name === name)) { const id = uid(); d.exercises[id] = { id, name, muscle, type, aliases, note: '' }; }
  }
  if (!d.presetDone && typeof PRESET_PROGRAM !== 'undefined' && !d.programs.length) {
    const byName = n => Object.values(d.exercises).find(e => e.name === n);
    const P = PRESET_PROGRAM;
    const p = { id: uid(), name: P.name, notes: P.notes, pos: { w: 0, s: 0 }, weeks: [{ id: uid(), name: 'Semaine 1', sessions: P.sessions.map(se => ({ id: uid(), name: se.name, note: se.note || '', items: se.items.map(([n, sets, reps, rest, weight, note, ss]) => ({ id: uid(), exId: byName(n).id, sets, reps, rest, weight, note: note || '', ss: !!ss })) })) }] };
    d.programs.push(p); d.activeProgramId = p.id;
  }
  d.presetDone = true;
  for (const e of Object.values(d.exercises)) if (!e.lex && typeof LEX !== 'undefined' && LEX[e.name]) e.lex = e.name;
  return d;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('⚠️ Stockage plein : exporte une sauvegarde'); }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- Utilitaires ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const fmtKg = n => n == null ? '' : (Math.round(n * 100) / 100).toString().replace('.', ',');
const fmtSec = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtRest = s => !s ? '—' : s < 60 ? s + ' s' : (s % 60 ? fmtSec(s) : (s / 60) + ' min');
const fmtDur = ms => { const m = Math.round(ms / 60000); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
const fmtDate = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateShort = t => new Date(t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const e1rm = (w, r) => (!w || !r) ? 0 : r === 1 ? w : w * (1 + r / 30); // Epley
const ex = id => S.exercises[id] || { id, name: 'Exercice supprimé', muscle: '', type: 'charge' };
const repsRange = t => { const m = String(t || '').match(/^(\d+)(?:-(\d+))?$/); return m ? [+m[1], +(m[2] || m[1])] : null; };
const isTime = e => e.type === 'temps' || /s$/.test(e._target || '');
function toast(msg, ms = 2200) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function findExerciseByName(name) {
  const n = Parser.norm(name);
  if (!n) return null;
  const all = Object.values(S.exercises);
  return all.find(e => Parser.norm(e.name) === n) || all.find(e => (e.aliases || []).some(a => Parser.norm(a) === n))
    || all.find(e => n.length > 4 && (Parser.norm(e.name).startsWith(n) || n.startsWith(Parser.norm(e.name)) && Parser.norm(e.name).length > 5)) || null;
}
function guessType(name) {
  const n = Parser.norm(name);
  if (/jump|saut|bond|pogo|plio|box|lancer|throw|skater|hop/.test(n)) return ['Pliométrie', 'plio'];
  if (/gainage|plank|planche|hold|isom|sprint|corde/.test(n)) return ['Abdos/Gainage', 'temps'];
  if (/pompe|traction|dips|pull up|push up/.test(n)) return ['Corps entier', 'pdc'];
  return ['Corps entier', 'charge'];
}
function getOrCreateExercise(name) {
  const found = findExerciseByName(name); if (found) return found.id;
  const [muscle, type] = guessType(name); const id = uid();
  S.exercises[id] = { id, name: name.charAt(0).toUpperCase() + name.slice(1), muscle, type, aliases: [], note: '' };
  if (LEX[S.exercises[id].name]) S.exercises[id].lex = S.exercises[id].name;
  return id;
}
const doneWorkouts = () => S.workouts.filter(w => w.end).sort((a, b) => b.start - a.start);

// Dernière performance sur un exercice
function lastPerf(exId, excludeId) {
  for (const w of doneWorkouts()) {
    if (w.id === excludeId) continue;
    const it = w.items.find(i => i.exId === exId && i.sets.some(s => s.done));
    if (it) return { date: w.start, sets: it.sets.filter(s => s.done), target: it.targetReps };
  }
  return null;
}
// Suggestion de charge (double progression)
function suggestion(item, prev) {
  const e = ex(item.exId);
  if (!prev || e.type === 'temps') return null;
  const range = repsRange(item.targetReps);
  const work = prev.sets.filter(s => !s.warm);
  if (!range || !work.length) return null;
  const maxW = Math.max(...work.map(s => s.w || 0));
  const top = work.filter(s => (s.w || 0) === maxW);
  if (e.type === 'charge' && maxW > 0 && top.every(s => (s.r || 0) >= range[1]) && work.length >= item.sets.length) {
    return { w: maxW + S.settings.inc, msg: `↑ Tu as validé toutes tes reps la dernière fois : passe à ${fmtKg(maxW + S.settings.inc)} kg` };
  }
  if (top.some(s => (s.r || 0) < range[0])) return { w: maxW || null, msg: `Garde ${maxW ? fmtKg(maxW) + ' kg' : 'la même difficulté'} et vise ${range[0]}${range[1] !== range[0] ? '-' + range[1] : ''} reps sur toutes les séries` };
  if (maxW) return { w: maxW, msg: `Même charge (${fmtKg(maxW)} kg) : ajoute 1 rep par série jusqu'à ${range[1]}` };
  return null;
}

// ---------- Minuteur de récupération ----------
const Timer = (() => {
  let iv = null, actx = null, beeped = new Set();
  function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
  function beep(f = 880, d = 0.12, when = 0) {
    if (!S.settings.sound || !actx) return;
    const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.type = 'sine';
    const t = actx.currentTime + when; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
  }
  function start(sec, label) {
    unlockAudio();
    if (!sec) return;
    S.timer = { end: Date.now() + sec * 1000, total: sec, label: label || 'Récupération' }; save();
    beeped = new Set(); show();
  }
  function add(d) { if (!S.timer) return; S.timer.end += d * 1000; S.timer.total = Math.max(5, S.timer.total + d); save(); tick(); }
  function stop() { S.timer = null; save(); clearInterval(iv); iv = null; $('#timer').className = ''; document.body.classList.remove('has-timer'); }
  function show() { $('#timer-iphone').style.display = S.settings.iphoneTimer ? '' : 'none'; $('#timer').classList.add('show'); document.body.classList.add('has-timer'); clearInterval(iv); iv = setInterval(tick, 250); tick(); }
  function tick() {
    const t = S.timer; if (!t) return stop();
    const rem = (t.end - Date.now()) / 1000;
    const el = $('#timer');
    $('#timer-label').textContent = rem > 0 ? t.label : 'Récup terminée — série suivante !';
    $('#timer-t').textContent = rem > 0 ? fmtSec(Math.ceil(rem)) : '+' + fmtSec(-rem);
    $('#timer-prog').style.width = Math.max(0, Math.min(100, (1 - rem / t.total) * 100)) + '%';
    const c = Math.ceil(rem);
    if (c <= 3 && c >= 1 && !beeped.has(c)) { beeped.add(c); beep(660, 0.09); }
    if (rem <= 0 && !beeped.has(0)) {
      beeped.add(0); el.classList.add('over');
      beep(990, 0.18); beep(990, 0.18, 0.25); beep(1320, 0.35, 0.5);
      if (S.settings.vibrate && navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 500]);
      if (S.settings.notif && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.ready.then(r => r.showNotification('Récup terminée 💪', { body: 'Série suivante !', tag: 'timer', renotify: true })).catch(() => {});
      }
    }
    if (rem < -60) stop();
  }
  if (S.timer) { if (S.timer.end - Date.now() > -60000) setTimeout(show, 0); else S.timer = null; }
  return { start, add, stop, unlockAudio };
})();

// Écran toujours allumé pendant la séance
let wakeLock = null;
async function updateWakeLock() {
  try {
    if (S.active && S.settings.wake && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); }
    } else if (wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => { updateWakeLock(); if (!document.hidden && S.timer) Timer.add(0); });

// ---------- Séance ----------
function startWorkout(programId, weekId, sessionId) {
  if (S.active && !confirm('Une séance est déjà en cours. La remplacer ?')) return;
  const w = { id: uid(), start: Date.now(), end: null, items: [], name: 'Séance libre', programId: null };
  if (programId) {
    const p = S.programs.find(p => p.id === programId);
    const wk = p.weeks.find(x => x.id === weekId), se = wk.sessions.find(x => x.id === sessionId);
    Object.assign(w, { programId, weekId, sessionId, name: se.name, weekName: p.weeks.length > 1 ? wk.name : '', programName: p.name });
    w.note = se.note || '';
    for (const it of se.items) w.items.push(makeItem(it, w.id));
  }
  S.active = w; save(); Timer.stop(); location.hash = '#/seance'; updateWakeLock();
}
function makeItem(src, wid) {
  const { exId, sets: nSets, reps, rest, weight, note, ss } = src;
  const item = { id: uid(), exId, targetReps: reps || '', targetWeight: weight ?? null, rest: rest ?? S.settings.rest, note: note || '', ss: !!ss, sets: [] };
  const prev = lastPerf(exId, wid);
  const sug = suggestion({ ...item, sets: new Array(nSets || 3) }, prev);
  const prevWork = prev ? prev.sets.filter(s => !s.warm) : [];
  for (let i = 0; i < (nSets || 3); i++) {
    let w = null;
    if (sug && sug.w) w = sug.w;
    else if (prevWork.length) w = (prevWork[i] || prevWork[prevWork.length - 1]).w ?? null;
    else if (typeof weight === 'number') w = weight;
    item.sets.push({ w, r: null, done: false, warm: false });
  }
  return item;
}
function finishWorkout() {
  const w = S.active; if (!w) return;
  const done = w.items.reduce((a, i) => a + i.sets.filter(s => s.done).length, 0);
  if (!done) { if (confirm('Aucune série validée. Abandonner la séance ?')) { S.active = null; save(); Timer.stop(); updateWakeLock(); location.hash = '#/'; } return; }
  w.items.forEach(i => i.sets = i.sets.filter(s => s.done)); w.items = w.items.filter(i => i.sets.length);
  w.end = Date.now();
  const prs = computePRs(w);
  w.prs = prs.length;
  S.workouts.push(w); S.active = null;
  // avance dans le programme
  if (w.programId) {
    const p = S.programs.find(p => p.id === w.programId);
    if (p) {
      let wi = p.weeks.findIndex(x => x.id === w.weekId), si = wi >= 0 ? p.weeks[wi].sessions.findIndex(x => x.id === w.sessionId) : -1;
      if (wi >= 0 && si >= 0) { si++; if (si >= p.weeks[wi].sessions.length) { si = 0; wi = (wi + 1) % p.weeks.length; } p.pos = { w: wi, s: si }; }
    }
  }
  save(); Timer.stop(); updateWakeLock();
  location.hash = '#/historique/' + w.id;
  setTimeout(() => showSummary(w, prs), 50);
}
function computePRs(w) {
  const prs = [];
  const before = doneWorkouts().filter(x => x.id !== w.id);
  for (const it of w.items) {
    const e = ex(it.exId); if (e.type === 'temps') continue;
    const sets = it.sets.filter(s => s.done && !s.warm); if (!sets.length) continue;
    let bestW = 0, best1 = 0, bestR = 0;
    for (const b of before) for (const bi of b.items) if (bi.exId === it.exId) for (const s of bi.sets) if (s.done && !s.warm) { bestW = Math.max(bestW, s.w || 0); best1 = Math.max(best1, e1rm(s.w, s.r)); bestR = Math.max(bestR, s.r || 0); }
    const hadHistory = before.some(b => b.items.some(bi => bi.exId === it.exId));
    if (!hadHistory) continue;
    const mW = Math.max(...sets.map(s => s.w || 0)), m1 = Math.max(...sets.map(s => e1rm(s.w, s.r))), mR = Math.max(...sets.map(s => s.r || 0));
    if (mW > bestW && mW > 0) prs.push(`${e.name} : charge max ${fmtKg(mW)} kg`);
    else if (m1 > best1 + 0.01 && m1 > 0) prs.push(`${e.name} : 1RM estimé ${fmtKg(Math.round(m1 * 10) / 10)} kg`);
    else if (!mW && mR > bestR) prs.push(`${e.name} : ${mR} reps`);
  }
  return prs;
}
const volume = w => w.items.reduce((a, i) => a + i.sets.filter(s => s.done && !s.warm).reduce((b, s) => b + (s.w || 0) * (s.r || 0), 0), 0);
const setCount = w => w.items.reduce((a, i) => a + i.sets.filter(s => s.done).length, 0);

// ---------- Rendu ----------
const app = $('#app');
function route() {
  const h = location.hash.replace(/^#\/?/, '').split('/');
  const r = h[0] || 'home';
  const navKey = { programme: 'programmes', historique: 'suivi', exercices: 'lexique', exercice: 'lexique' }[r] || r;
  document.querySelectorAll('nav.bar a').forEach(a => a.classList.toggle('on', a.dataset.r === navKey));
  $('#nav-seance').classList.toggle('live', !!S.active);
  const views = { home: vHome, programmes: vPrograms, programme: vProgram, seance: vSession, historique: vHistory, exercices: vExercises, lexique: vExercises, exercice: vExercise, reglages: vSettings, suivi: vSuivi };
  (views[r] || vHome)(h[1], h[2]);
  if (r !== 'seance') stopClock();
  Fig.animate(app);
}
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

// --- Accueil
function vHome() {
  const p = S.programs.find(p => p.id === S.activeProgramId);
  const ws = doneWorkouts();
  const weekAgo = Date.now() - 7 * 864e5;
  const last7 = ws.filter(w => w.start > weekAgo);
  let next = '';
  if (S.active) {
    next = `<div class="card hero"><div class="pill acc">En cours</div><h2 style="margin:8px 0 4px">${esc(S.active.name)}</h2>
      <div class="mut small">Commencée à ${new Date(S.active.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
      <a class="btn pri block" style="margin-top:12px" href="#/seance">Reprendre la séance</a></div>`;
  } else if (p && p.weeks.length && p.weeks[0].sessions.length) {
    const pos = normPos(p), wk = p.weeks[pos.w], se = wk.sessions[pos.s];
    next = `<div class="card hero"><div class="row between"><span class="pill acc">Prochaine séance</span><span class="small mut">${esc(p.name)}</span></div>
      <h2 style="margin:8px 0 2px">${esc(se.name)}</h2>${p.weeks.length > 1 ? `<div class="mut small">${esc(wk.name)}</div>` : ''}
      <div class="small mut" style="margin-top:8px">${se.items.map(i => `${esc(ex(i.exId).name)} <span class="dim">${i.sets}×${esc(i.reps)}</span>`).join(' · ') || 'Aucun exercice'}</div>
      <div class="row" style="margin-top:12px"><button class="btn pri grow" data-a="start" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">▶ Démarrer</button>
      <button class="btn" data-a="pick-session" data-p="${p.id}">Autre</button></div>
      <button class="btn ghost block" style="margin-top:6px" data-a="session-fiches" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">📖 Revoir les exercices de la séance</button></div>`;
  } else {
    next = `<div class="card hero"><h2 style="margin-top:0">Bienvenue 👋</h2><p class="mut">Commence par créer ou importer ton programme (PDF, texte copié-collé).</p>
      <div class="row"><a class="btn pri grow" href="#/programmes">Créer / importer un programme</a></div></div>`;
  }
  const backupWarn = ws.length >= 3 && (!S.lastBackup || Date.now() - S.lastBackup > 14 * 864e5)
    ? `<div class="card" style="border-color:#f5b94166"><div class="row"><div class="grow small"><b>Pense à sauvegarder</b><br><span class="mut">Tes données sont sur ce téléphone uniquement.</span></div><button class="btn sm" data-a="backup">Sauvegarder</button></div></div>` : '';
  app.innerHTML = `
    <div class="row between"><h1>Ma Muscu</h1><a class="icon-btn" href="#/reglages" aria-label="Réglages">⚙︎</a></div>
    ${next}
    ${!S.active ? `<button class="btn block" style="margin-top:10px" data-a="start-free">+ Séance libre</button>` : ''}
    <h2>7 derniers jours</h2>
    <div class="stats">
      <div class="stat"><b>${last7.length}</b><span>séances</span></div>
      <div class="stat"><b>${last7.reduce((a, w) => a + setCount(w), 0)}</b><span>séries</span></div>
      <div class="stat"><b>${fmtKg(Math.round(last7.reduce((a, w) => a + volume(w), 0) / 100) / 10)} t</b><span>tonnage</span></div>
    </div>
    ${weekStrip(ws)}
    ${backupWarn}
    <h2>Dernières séances</h2>
    ${ws.slice(0, 3).map(workoutCard).join('') || '<div class="empty small">Aucune séance enregistrée pour l\'instant.</div>'}
  `;
}
function weekStrip(ws) {
  // 8 dernières semaines (nb de séances)
  const now = new Date(); const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const cols = [];
  for (let i = 7; i >= 0; i--) {
    const a = monday.getTime() - i * 7 * 864e5, b = a + 7 * 864e5;
    cols.push(ws.filter(w => w.start >= a && w.start < b).length);
  }
  const mx = Math.max(3, ...cols);
  return `<div class="card" style="margin-top:10px"><div class="small mut" style="margin-bottom:8px">Séances par semaine (8 dernières)</div>
    <div class="row" style="align-items:flex-end;height:60px;gap:6px">${cols.map((c, i) => `<div class="grow" style="text-align:center"><div style="height:${Math.max(3, c / mx * 44)}px;background:${i === 7 ? 'var(--acc)' : 'var(--card2)'};border-radius:5px"></div><div class="tiny dim" style="margin-top:3px">${c}</div></div>`).join('')}</div></div>`;
}
function workoutCard(w) {
  const best = w.items.slice(0, 4).map(i => { const s = i.sets.filter(s => !s.warm); const top = s.sort((a, b) => (b.w || 0) - (a.w || 0))[0]; return `${esc(ex(i.exId).name)}${top ? ` <span class="dim">${top.w ? fmtKg(top.w) + '×' : ''}${top.r ?? ''}</span>` : ''}`; }).join(' · ');
  return `<a class="card" style="display:block;text-decoration:none;color:inherit" href="#/historique/${w.id}">
    <div class="row between"><b>${esc(w.name)}</b><span class="small mut">${fmtDate(w.start)}</span></div>
    <div class="small mut" style="margin-top:4px">${fmtDur(w.end - w.start)} · ${setCount(w)} séries · ${fmtKg(Math.round(volume(w)))} kg${w.prs ? ` · 🏆 ${w.prs}` : ''}</div>
    <div class="small" style="margin-top:6px;color:var(--mut)">${best}${w.items.length > 4 ? ' …' : ''}</div></a>`;
}
function normPos(p) {
  let pos = p.pos || { w: 0, s: 0 };
  if (!p.weeks[pos.w]) pos = { w: 0, s: 0 };
  if (!p.weeks[pos.w].sessions[pos.s]) pos = { w: pos.w, s: 0 };
  if (!p.weeks[pos.w].sessions.length) pos = { w: 0, s: 0 };
  return pos;
}

// --- Programmes
function vPrograms() {
  app.innerHTML = `<h1>Programmes</h1>
    <div class="row"><button class="btn pri grow" data-a="new-program">+ Nouveau</button><button class="btn grow" data-a="import">⇪ Importer (PDF, texte…)</button></div>
    <div style="margin-top:14px">${S.programs.map(p => {
      const nS = p.weeks.reduce((a, w) => a + w.sessions.length, 0);
      return `<a class="card" style="display:block;text-decoration:none;color:inherit" href="#/programme/${p.id}">
        <div class="row between"><b style="font-size:17px">${esc(p.name)}</b>${p.id === S.activeProgramId ? '<span class="pill ok">Actif</span>' : ''}</div>
        <div class="small mut" style="margin-top:4px">${p.weeks.length > 1 ? p.weeks.length + ' semaines · ' : ''}${nS} séance${nS > 1 ? 's' : ''}</div></a>`;
    }).join('') || `<div class="empty"><div class="big">📋</div>Aucun programme.<br>Crée-le à la main ou importe ton PDF.</div>`}</div>`;
}
function newProgram(name = 'Mon programme') {
  const p = { id: uid(), name, notes: '', weeks: [{ id: uid(), name: 'Semaine 1', sessions: [{ id: uid(), name: 'Séance A', items: [] }] }], pos: { w: 0, s: 0 } };
  S.programs.push(p); if (!S.activeProgramId) S.activeProgramId = p.id; save(); return p;
}
let curWeek = {};
function vProgram(id) {
  const p = S.programs.find(p => p.id === id); if (!p) { location.hash = '#/programmes'; return; }
  let wi = curWeek[p.id] ?? normPos(p).w; if (!p.weeks[wi]) wi = 0; curWeek[p.id] = wi;
  const wk = p.weeks[wi];
  const pos = normPos(p);
  app.innerHTML = `
    <div class="row"><a class="icon-btn" href="#/programmes">‹</a><input type="text" class="grow" style="font-size:20px;font-weight:700;background:transparent;border-color:transparent;padding-left:0" value="${esc(p.name)}" data-bind="pname" data-p="${p.id}"></div>
    <div class="row wrap" style="margin:6px 0 12px">
      ${p.id === S.activeProgramId ? '<span class="pill ok">Programme actif</span>' : `<button class="btn sm" data-a="set-active" data-p="${p.id}">Définir comme actif</button>`}
      <button class="btn sm" data-a="export-program" data-p="${p.id}">Exporter</button>
      <button class="btn sm danger" data-a="del-program" data-p="${p.id}">Supprimer</button>
    </div>
    ${(() => { const miss = [...programExIds(p)].filter(id => !lexOf(ex(id))).map(id => ex(id).name); return miss.length ? `<div class="card" style="border-color:#f5b94166;margin-bottom:10px"><div class="small"><b>⚠️ Exercice${miss.length > 1 ? 's' : ''} sans fiche :</b> ${miss.map(esc).join(', ')}<br><span class="mut">Envoie le programme à Claude pour ajouter les fiches et schémas, ou décris-les toi-même dans le Lexique (✎).</span></div></div>` : ''; })()}
    <div class="tabs">${p.weeks.map((w, i) => `<button class="${i === wi ? 'on' : ''}" data-a="week-tab" data-p="${p.id}" data-i="${i}">${esc(w.name)}${pos.w === i && p.weeks.length > 1 ? ' •' : ''}</button>`).join('')}
      <button data-a="add-week" data-p="${p.id}">+ Semaine</button></div>
    ${p.weeks.length > 1 || true ? `<div class="row wrap" style="margin-bottom:6px">
      <input type="text" class="grow" style="max-width:220px;padding:7px 10px" value="${esc(wk.name)}" data-bind="wname" data-p="${p.id}" data-w="${wk.id}">
      <button class="btn sm" data-a="dup-week" data-p="${p.id}" data-w="${wk.id}">Dupliquer</button>
      ${p.weeks.length > 1 ? `<button class="btn sm danger" data-a="del-week" data-p="${p.id}" data-w="${wk.id}">Suppr.</button>` : ''}
    </div>` : ''}
    ${wk.sessions.map((se, si) => sessionEditor(p, wk, se, si, pos)).join('')}
    <button class="btn block" style="margin-top:12px" data-a="add-session" data-p="${p.id}" data-w="${wk.id}">+ Ajouter une séance</button>
    <label class="f">Notes du programme</label>
    <textarea data-bind="pnotes" data-p="${p.id}" placeholder="Objectifs, consignes, progression…">${esc(p.notes || '')}</textarea>
  `;
}
function sessionEditor(p, wk, se, si, pos) {
  const isNext = p.id === S.activeProgramId && pos.w === p.weeks.indexOf(wk) && pos.s === si;
  return `<div class="card" style="margin-top:12px">
    <div class="row"><input type="text" class="grow" style="font-weight:700;font-size:17px" value="${esc(se.name)}" data-bind="sname" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">
      <button class="btn sm pri" data-a="start" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">▶</button></div>
    ${isNext ? '<div class="tiny" style="color:var(--acc2);margin-top:4px">← prochaine séance prévue</div>' : ''}
    ${se.items.map((it, ii) => `${ii > 0 ? `<button class="btn sm ghost" style="display:block;margin:6px auto -2px;${it.ss ? '' : 'color:var(--dim)'}" data-a="ss-toggle" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}">${it.ss ? '🔗 Enchaîné avec le précédent (repos commun)' : '+ enchaîner avec le précédent'}</button>` : ''}<div class="item" ${it.ss ? 'style="border-color:#ff6b2c66"' : ''}>
      <div class="row"><button class="grow" style="text-align:left;font-weight:600;color:var(--acc2)" data-a="pick-ex" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}">${esc(ex(it.exId).name)} ✎</button>
        <button class="icon-btn" data-a="fiche" data-id="${it.exId}">ⓘ</button>
        <button class="icon-btn" data-a="mv-item" data-d="-1" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}" ${ii === 0 ? 'disabled style="opacity:.25"' : ''}>↑</button>
        <button class="icon-btn" data-a="mv-item" data-d="1" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}" ${ii === se.items.length - 1 ? 'disabled style="opacity:.25"' : ''}>↓</button>
        <button class="icon-btn" data-a="del-item" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}">✕</button></div>
      <div class="grid4">
        <div><label>Séries</label><input type="text" inputmode="numeric" value="${it.sets}" data-bind="it-sets" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}"></div>
        <div><label>Reps / durée</label><input type="text" value="${esc(it.reps)}" placeholder="8-10, 30s…" data-bind="it-reps" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}"></div>
        <div><label>Récup (s)</label><input type="text" inputmode="numeric" value="${it.rest ?? ''}" placeholder="${S.settings.rest}" data-bind="it-rest" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}"></div>
      </div>
      <div class="row" style="margin-top:6px"><input type="text" style="max-width:96px;padding:7px;text-align:center" value="${it.weight ?? ''}" placeholder="kg/%/RPE" data-bind="it-weight" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}">
        <input type="text" class="grow" style="padding:7px 10px" value="${esc(it.note || '')}" placeholder="Consigne (tempo, RPE, superset…)" data-bind="it-note" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}" data-i="${it.id}"></div>
    </div>`).join('')}
    <details style="margin-top:8px"><summary class="tiny mut">Échauffement / consignes de la séance${se.note ? ' ✓' : ''}</summary><textarea style="margin-top:6px;min-height:70px" data-bind="snote" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">${esc(se.note || '')}</textarea></details>
    <div class="row wrap" style="margin-top:10px"><button class="btn sm" data-a="add-item" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">+ Exercice</button>
      <span class="grow"></span>
      <button class="btn sm ghost" data-a="mv-session" data-d="-1" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">↑</button>
      <button class="btn sm ghost" data-a="mv-session" data-d="1" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">↓</button>
      <button class="btn sm ghost" data-a="dup-session" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">Dupliquer</button>
      <button class="btn sm ghost" style="color:var(--bad)" data-a="del-session" data-p="${p.id}" data-w="${wk.id}" data-s="${se.id}">Suppr.</button></div>
  </div>`;
}
function ctx(d) {
  const p = S.programs.find(x => x.id === d.p); if (!p) return {};
  const w = d.w ? p.weeks.find(x => x.id === d.w) : null;
  const s = w && d.s ? w.sessions.find(x => x.id === d.s) : null;
  const i = s && d.i ? s.items.find(x => x.id === d.i) : null;
  return { p, w, s, i };
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const reId = (o) => { o.id = uid(); (o.sessions || o.items || []).forEach(reId); return o; };

// --- Séance en cours
let clockIv = null;
function stopClock() { clearInterval(clockIv); clockIv = null; }
function vSession() {
  const w = S.active;
  if (!w) {
    app.innerHTML = `<h1>Séance</h1><div class="empty"><div class="big">🏋️</div>Aucune séance en cours.</div>
      <a class="btn pri block" href="#/">Choisir une séance</a><button class="btn block" style="margin-top:10px" data-a="start-free">+ Séance libre</button>`;
    return;
  }
  const doneSets = setCount(w), totalSets = w.items.reduce((a, i) => a + i.sets.length, 0);
  app.innerHTML = `
    <div class="row between" style="margin-top:4px">
      <div class="grow"><div class="small mut">${esc(w.programName || '')}${w.weekName ? ' · ' + esc(w.weekName) : ''}</div><h1 style="margin:2px 0 0;font-size:24px">${esc(w.name)}</h1></div>
      <button class="btn ok" data-a="finish">Terminer</button></div>
    <div class="row small mut" style="margin:4px 0 2px"><span id="clock">⏱ ${fmtSec((Date.now() - w.start) / 1000)}</span><span>·</span><span>${doneSets}/${totalSets} séries</span><span>·</span><span>${fmtKg(Math.round(volume(w)))} kg</span></div>
    ${w.note ? `<details class="card" style="margin-top:10px"><summary class="small" style="color:var(--warn)">Échauffement / consignes</summary><div class="small mut" style="white-space:pre-wrap;margin-top:6px">${esc(w.note)}</div></details>` : ''}
    ${w.items.map((it, ii) => exerciseBlock(it, ii)).join('')}
    <button class="btn block" style="margin-top:14px" data-a="sess-add-ex">+ Ajouter un exercice</button>
    <button class="btn block ghost" style="margin-top:6px;color:var(--bad)" data-a="cancel-workout">Abandonner la séance</button>`;
  stopClock();
  clockIv = setInterval(() => { const c = $('#clock'); if (c && S.active) c.textContent = '⏱ ' + fmtSec((Date.now() - S.active.start) / 1000); }, 1000);
  updateWakeLock();
}
function exerciseBlock(it, ii) {
  const e = ex(it.exId);
  const prev = lastPerf(it.exId, S.active.id);
  const sug = suggestion(it, prev);
  const timeMode = e.type === 'temps' || /\d\s*s$/.test(it.targetReps);
  const showKg = e.type !== 'temps';
  const allDone = it.sets.length && it.sets.every(s => s.done);
  const prevSets = prev ? prev.sets : [];
  let wi = 0;
  const nextSS = S.active.items[ii + 1] && S.active.items[ii + 1].ss;
  return `${it.ss ? `<div class="tiny" style="text-align:center;color:var(--acc2);margin:6px 0 -6px">🔗 enchaîné (sans repos)</div>` : ''}<div class="ex ${allDone ? 'done' : ''} ${it.ss || nextSS ? 'ssx' : ''}" id="ex-${ii}">
    <div class="ex-head"><div class="grow"><div class="ex-title" data-a="ex-menu" data-i="${ii}">${esc(e.name)}</div>
      <div class="ex-meta">${it.sets.length} × ${esc(it.targetReps || '—')}${it.targetWeight != null && it.targetWeight !== '' ? (/rpe/i.test(it.targetWeight) ? ' · ' : ' @ ') + esc(typeof it.targetWeight === 'number' ? fmtKg(it.targetWeight) + ' kg' : it.targetWeight) : ''} · récup ${fmtRest(it.rest)}</div></div>
      <button class="icon-btn" data-a="fiche" data-id="${it.exId}" aria-label="Fiche">ⓘ</button><button class="icon-btn" data-a="ex-menu" data-i="${ii}">⋯</button></div>
    ${it.note ? `<div class="ex-note">${esc(it.note)}</div>` : ''}${e.note ? `<div class="ex-note" style="color:var(--mut)">📌 ${esc(e.note)}</div>` : ''}
    ${prev ? `<div class="tiny dim" style="margin-top:6px">Dernière fois (${fmtDateShort(prev.date)}) : ${prev.sets.filter(s => !s.warm).map(s => (s.w ? fmtKg(s.w) + '×' : '') + (s.r ?? '')).join(', ')}</div>` : ''}
    ${sug && !allDone && !it.sets.some(s => s.done) ? `<div class="sugg">${esc(sug.msg)}</div>` : ''}
    <table class="sets"><thead><tr><th>Série</th><th>Préc.</th>${showKg ? `<th>${e.type === 'pdc' || e.type === 'plio' ? '+kg' : 'kg'}</th>` : ''}<th>${timeMode ? 'sec' : 'reps'}</th><th>✓</th></tr></thead><tbody>
    ${it.sets.map((s, si) => {
      const label = s.warm ? 'É' : (++wi);
      const pv = s.warm ? null : (prevSets.filter(x => !x.warm)[wi - 1]);
      const range = repsRange(it.targetReps);
      const tm = timeMode && String(it.targetReps).match(/(\d+)\s*s$/);
      const phR = pv && pv.r != null ? pv.r : (range ? range[1] : tm ? tm[1] : (parseInt(it.targetReps) || ''));
      return `<tr class="${s.done ? 'on' : ''}">
        <td class="n ${s.warm ? 'w' : ''}" data-a="toggle-warm" data-i="${ii}" data-s="${si}">${label}</td>
        <td class="prev">${pv ? (pv.w ? fmtKg(pv.w) + '×' : '') + (pv.r ?? '') : '—'}</td>
        ${showKg ? `<td><input type="text" inputmode="decimal" value="${fmtKg(s.w)}" placeholder="${pv && pv.w ? fmtKg(pv.w) : (e.type === 'charge' ? 'kg' : '0')}" data-set="${ii}:${si}:w"></td>` : ''}
        <td><input type="text" inputmode="numeric" value="${s.r ?? ''}" placeholder="${phR}" data-set="${ii}:${si}:r"></td>
        <td><button class="chk" data-a="check" data-i="${ii}" data-s="${si}">✓</button></td></tr>`;
    }).join('')}</tbody></table>
    <div class="ex-foot"><button class="btn sm ghost" data-a="add-set" data-i="${ii}">+ Série</button>
      ${it.sets.length > 1 ? `<button class="btn sm ghost" style="color:var(--dim)" data-a="del-set" data-i="${ii}">− Série</button>` : ''}
      <span class="grow"></span>
      <button class="btn sm ghost" data-a="timer-manual" data-i="${ii}">⏱ ${fmtRest(it.rest)}</button>
      ${e.type === 'charge' ? `<button class="btn sm ghost" data-a="plates" data-i="${ii}">🧮</button>` : ''}</div>
  </div>`;
}
function checkSet(ii, si) {
  const it = S.active.items[ii], s = it.sets[si];
  if (!s.done) {
    // remplit les champs vides avec les valeurs affichées en grisé
    const row = document.querySelectorAll(`#ex-${ii} tbody tr`)[si];
    if (row) row.querySelectorAll('input[data-set]').forEach(inp => {
      const f = inp.dataset.set.split(':')[2];
      if (s[f] == null || s[f] === '') { const v = num(inp.placeholder); if (v != null) s[f] = v; }
    });
    if (s.r == null) { toast('Indique le nombre de reps'); return; }
    s.done = true; s.t = Date.now();
    const items = S.active.items;
    const isLastOfAll = items.every(i => i.sets.every(x => x.done));
    let g0 = ii; while (g0 > 0 && items[g0].ss) g0--;
    let g1 = ii; while (items[g1 + 1] && items[g1 + 1].ss) g1++;
    const nextInGroup = items.slice(ii + 1, g1 + 1).find(x => x.sets[si] && !x.sets[si].done);
    if (nextInGroup) {
      toast('🔗 Enchaîne : ' + ex(nextInGroup.exId).name);
      setTimeout(() => { const el = document.getElementById('ex-' + items.indexOf(nextInGroup)); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    } else if (S.settings.autoTimer && !isLastOfAll) {
      const rest = items[g1].rest;
      const groupLeft = items.slice(g0, g1 + 1).some(x => x.sets.some(y => !y.done && y !== s));
      Timer.start(rest, groupLeft ? `Récup · ${items.slice(g0, g1 + 1).map(x => ex(x.exId).name).join(' + ')}` : 'Récup · exercice suivant');
      if (g1 > g0 && groupLeft) setTimeout(() => { const el = document.getElementById('ex-' + g0); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
    }
    // propage la charge aux séries suivantes non faites si vides ou égales à l'ancienne
    it.sets.forEach((x, k) => { if (k > si && !x.done && !x.warm && (x.w == null)) x.w = s.w; });
    if (navigator.vibrate && S.settings.vibrate) navigator.vibrate(30);
  } else s.done = false;
  save(); vSession();
}

// --- Historique
function vHistory(id) {
  if (id) return vWorkout(id);
  const ws = doneWorkouts();
  let html = '<h1>Suivi</h1>' + suiviTabs('historique'), month = '';
  if (!ws.length) html += '<div class="empty"><div class="big">📅</div>Tes séances terminées apparaîtront ici.</div>';
  for (const w of ws) {
    const m = new Date(w.start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; const n = ws.filter(x => new Date(x.start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) === m).length; html += `<h2 style="text-transform:capitalize">${m} <span class="small mut">· ${n} séance${n > 1 ? 's' : ''}</span></h2>`; }
    html += workoutCard(w);
  }
  if (ws.length) html += `<button class="btn block" style="margin-top:16px" data-a="export-csv">Exporter l'historique (CSV / Excel)</button>`;
  app.innerHTML = html;
}
function vWorkout(id) {
  const w = S.workouts.find(x => x.id === id); if (!w) { location.hash = '#/historique'; return; }
  app.innerHTML = `<div class="row"><a class="icon-btn" href="#/historique">‹</a><h1 class="grow" style="font-size:24px">${esc(w.name)}</h1></div>${w.feel || w.comment ? `<div class="small" style="margin-bottom:6px">${w.feel ? `<span class="pill acc">Difficulté ${w.feel}/10</span> ` : ''}${w.comment ? `<span class="mut">« ${esc(w.comment)} »</span>` : ''}</div>` : ''}
    <div class="mut small">${new Date(w.start).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${new Date(w.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${w.programName ? ' · ' + esc(w.programName) : ''}${w.weekName ? ' · ' + esc(w.weekName) : ''}</div>
    <div class="stats" style="margin-top:12px"><div class="stat"><b>${fmtDur(w.end - w.start)}</b><span>durée</span></div><div class="stat"><b>${setCount(w)}</b><span>séries</span></div><div class="stat"><b>${fmtKg(Math.round(volume(w)))}</b><span>kg soulevés</span></div></div>
    ${w.items.map(it => { const e = ex(it.exId); let k = 0; return `<div class="card" style="margin-top:10px"><a href="#/exercice/${it.exId}" style="font-weight:700;text-decoration:none">${esc(e.name)}</a>
      <div style="margin-top:6px">${it.sets.map(s => `<div class="row small" style="padding:3px 0"><span class="${s.warm ? '' : 'mut'}" style="width:28px;${s.warm ? 'color:var(--warn)' : ''}">${s.warm ? 'É' : ++k}</span><span class="grow">${s.w ? fmtKg(s.w) + ' kg × ' : ''}${s.r ?? ''}${(e.type === 'temps' || /s$/.test(it.targetReps)) ? ' s' : ' reps'}</span>${s.w && s.r && !s.warm ? `<span class="dim tiny">1RM≈${Math.round(e1rm(s.w, s.r))}</span>` : ''}</div>`).join('')}</div></div>`; }).join('')}
    <div class="row" style="margin-top:16px"><button class="btn grow" data-a="redo" data-id="${w.id}">Refaire cette séance</button><button class="btn danger" data-a="del-workout" data-id="${w.id}">Supprimer</button></div>`;
}
function showSummary(w, prs) {
  modal(`<div style="text-align:center"><div style="font-size:50px">${prs.length ? '🏆' : '💪'}</div><h2>Séance terminée !</h2>
    <div class="stats" style="margin:14px 0"><div class="stat"><b>${fmtDur(w.end - w.start)}</b><span>durée</span></div><div class="stat"><b>${setCount(w)}</b><span>séries</span></div><div class="stat"><b>${fmtKg(Math.round(volume(w)))}</b><span>kg</span></div></div>
    ${prs.length ? `<div class="card" style="text-align:left"><b>Nouveaux records</b>${prs.map(p => `<div class="small" style="margin-top:5px">🏅 ${esc(p)}</div>`).join('')}</div>` : '<p class="mut small">Tes charges sont enregistrées : elles seront proposées à la prochaine séance.</p>'}
    <div style="text-align:left;margin-top:12px"><div class="small mut">Difficulté ressentie de la séance</div>
      <div class="row" id="feel" style="gap:4px;margin-top:6px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="pill" style="flex:1;padding:7px 0" data-f="${n}">${n}</button>`).join('')}</div>
      <div class="tiny dim" style="margin-top:3px">1 = très facile · 10 = maximal</div>
      <input type="text" id="wcom" placeholder="Note pour ton bilan (forme, douleur, sensations…)" style="margin-top:8px"></div>
    <button class="btn pri block" style="margin-top:14px" data-a="close">Enregistrer</button></div>`, () => {
      const c = document.getElementById('wcom'); const ww = S.workouts.find(x => x.id === w.id);
      if (ww) { if (c && c.value.trim()) ww.comment = c.value.trim(); save(); route(); }
    });
  const fe = document.getElementById('feel');
  fe.onclick = ev => { const b = ev.target.closest('[data-f]'); if (!b) return; const ww = S.workouts.find(x => x.id === w.id); ww.feel = +b.dataset.f; save(); fe.querySelectorAll('.pill').forEach(x => x.classList.toggle('acc', x === b)); };
}

// --- Exercices / progrès
let exFilter = '';
let lexScope = 'prog';
function programExIds(p) { const ids = new Set(); if (p) p.weeks.forEach(w => w.sessions.forEach(s => s.items.forEach(i => ids.add(i.exId)))); return ids; }
function vExercises() {
  const counts = {};
  for (const w of doneWorkouts()) for (const i of w.items) counts[i.exId] = (counts[i.exId] || 0) + 1;
  const q = Parser.norm(exFilter);
  const progIds = programExIds(S.programs.find(p => p.id === S.activeProgramId));
  if (!progIds.size && lexScope === 'prog') lexScope = 'all';
  const list = Object.values(S.exercises).filter(e => (lexScope === 'all' || (lexScope === 'prog' ? progIds.has(e.id) : e.muscle === lexScope)) && (!q || Parser.norm(e.name).includes(q) || Parser.norm(e.muscle).includes(q) || (e.aliases || []).some(a => a.includes(q))))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const missing = [...progIds].filter(id => !lexOf(ex(id))).length;
  app.innerHTML = `<h1>Lexique</h1>
    <div class="row"><input type="search" class="grow" id="exq" placeholder="Rechercher un exercice ou un muscle" value="${esc(exFilter)}"><button class="btn" data-a="new-ex">+</button></div>
    <div class="tabs" style="margin-top:10px" id="lexsc">${progIds.size ? `<button class="${lexScope === 'prog' ? 'on' : ''}" data-sc="prog">Mon programme</button>` : ''}<button class="${lexScope === 'all' ? 'on' : ''}" data-sc="all">Tous</button>${MUSCLES.map(m => `<button class="${lexScope === m ? 'on' : ''}" data-sc="${m}">${m}</button>`).join('')}</div>
    ${lexScope === 'prog' && missing ? `<div class="card" style="border-color:#f5b94166;margin-bottom:8px"><div class="small"><b>⚠️ ${missing} exercice${missing > 1 ? 's' : ''} sans fiche</b><br><span class="mut">Envoie le programme à Claude pour qu'il ajoute les fiches, ou décris-les toi-même (✎).</span></div></div>` : ''}
    <div class="card" style="padding:4px 12px">${list.map(e => { const L = lexOf(e); return `<a class="list-item tap" style="text-decoration:none;color:inherit" href="#/exercice/${e.id}">
      <div style="width:58px;flex:none">${Fig.has(L ? (e.lex || e.name) : '') ? Fig.svg(e.lex || e.name, 'thumb') : `<div class="thumb noimg">?</div>`}</div>
      <div class="grow"><div>${esc(e.name)}</div><div class="tiny dim">${esc(e.muscle)}${L ? '' : ' · <span style="color:var(--warn)">pas de fiche</span>'}</div></div>${counts[e.id] ? `<span class="pill acc">${counts[e.id]}</span>` : ''}<span class="dim">›</span></a>`; }).join('') || '<div class="empty small">Aucun exercice.</div>'}</div>`;
  $('#lexsc').onclick = ev => { const b = ev.target.closest('[data-sc]'); if (b) { lexScope = b.dataset.sc; vExercises(); } };
  const inp = $('#exq'); inp.oninput = () => { exFilter = inp.value; const pos = inp.selectionStart; vExercises(); const n = $('#exq'); n.focus(); n.setSelectionRange(pos, pos); };
}
function exHistory(exId) {
  const out = [];
  for (const w of doneWorkouts()) for (const i of w.items) if (i.exId === exId) {
    const sets = i.sets.filter(s => s.done && !s.warm); if (!sets.length) continue;
    out.push({ w, sets, maxW: Math.max(...sets.map(s => s.w || 0)), best1: Math.max(...sets.map(s => e1rm(s.w, s.r))), vol: sets.reduce((a, s) => a + (s.w || 0) * (s.r || 0), 0), maxR: Math.max(...sets.map(s => s.r || 0)) });
  }
  return out;
}
function vExercise(id) {
  const e = S.exercises[id]; if (!e) { location.hash = '#/lexique'; return; }
  const h = exHistory(id);
  const hasW = h.some(x => x.maxW > 0);
  const recW = h.reduce((a, x) => x.maxW > a.v ? { v: x.maxW, d: x.w.start } : a, { v: 0 });
  const rec1 = h.reduce((a, x) => x.best1 > a.v ? { v: x.best1, d: x.w.start } : a, { v: 0 });
  const recR = h.reduce((a, x) => x.maxR > a.v ? { v: x.maxR, d: x.w.start } : a, { v: 0 });
  const pts = h.slice().reverse().map(x => ({ t: x.w.start, v: hasW ? Math.round(x.best1 * 10) / 10 : x.maxR }));
  app.innerHTML = `<div class="row"><a class="icon-btn" href="#/lexique">‹</a><h1 class="grow" style="font-size:24px">${esc(e.name)}</h1><button class="icon-btn" data-a="edit-ex" data-id="${id}">✎</button></div>
    <div class="small mut">${esc(e.muscle)} · ${({ charge: 'Charge', pdc: 'Poids du corps', temps: 'Temps', plio: 'Pliométrie' })[e.type] || ''}</div>
    ${ficheHTML(e)}
    ${h.length ? '<h2>Tes performances</h2>' : ''}
    ${!h.length ? '' : `<div class="stats" style="margin-top:12px">
      ${hasW ? `<div class="stat"><b>${fmtKg(recW.v)}</b><span>charge max (kg)</span></div><div class="stat"><b>${fmtKg(Math.round(rec1.v * 10) / 10)}</b><span>1RM estimé</span></div>` : `<div class="stat"><b>${recR.v || '—'}</b><span>record reps</span></div>`}
      <div class="stat"><b>${h.length}</b><span>séances</span></div></div>`}
    ${pts.length >= 2 ? `<div class="card" style="margin-top:10px"><div class="small mut">${hasW ? '1RM estimé (kg)' : 'Reps max'} au fil des séances</div>${chart(pts)}</div>` : ''}
    ${hasW && rec1.v ? `<div class="card" style="margin-top:10px"><div class="small mut" style="margin-bottom:6px">Charges conseillées d'après ton 1RM estimé</div>
      <div class="row wrap small">${[[95, 2], [90, 3], [85, 5], [80, 7], [75, 9], [70, 11], [65, 14]].map(([pc, r]) => `<span class="pill">${pc}% · ${fmtKg(Math.round(rec1.v * pc / 100 / S.settings.inc) * S.settings.inc)} kg ≈ ${r} reps</span>`).join('')}</div></div>` : ''}
    ${h.length ? '<h2>Historique</h2>' : ''}
    ${h.map(x => `<a class="card" style="display:block;text-decoration:none;color:inherit" href="#/historique/${x.w.id}"><div class="row between small"><b>${fmtDate(x.w.start)}</b><span class="mut">${esc(x.w.name)}</span></div>
      <div class="small" style="margin-top:4px">${x.sets.map(s => (s.w ? fmtKg(s.w) + '×' : '') + (s.r ?? '')).join(' · ')}</div></a>`).join('')}`;
}
function chart(pts) {
  const W = 340, H = 150, P = 26;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1;
  const vs = pts.map(p => p.v), lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * 0.15 || 2;
  const y0 = lo - pad, y1 = hi + pad;
  const X = t => P + (t1 === t0 ? 0.5 : (t - t0) / (t1 - t0)) * (W - P - 8), Y = v => 8 + (1 - (v - y0) / (y1 - y0)) * (H - P - 8);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
  const ticks = [y0 + (y1 - y0) * 0.15, (y0 + y1) / 2, y1 - (y1 - y0) * 0.15];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    ${ticks.map(v => `<line x1="${P}" x2="${W - 4}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2e3340" stroke-dasharray="3 4"/><text x="${P - 4}" y="${Y(v) + 4}" fill="#6b7280" font-size="10" text-anchor="end">${Math.round(v)}</text>`).join('')}
    <path d="${d} L${X(pts[pts.length - 1].t)} ${H - P} L${X(t0)} ${H - P} Z" fill="#ff6b2c18"/>
    <path d="${d}" fill="none" stroke="#ff6b2c" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${pts.map(p => `<circle cx="${X(p.t)}" cy="${Y(p.v)}" r="3.2" fill="#ff9a5c"/>`).join('')}
    <text x="${P}" y="${H - 8}" fill="#6b7280" font-size="10">${fmtDateShort(t0)}</text><text x="${W - 4}" y="${H - 8}" fill="#6b7280" font-size="10" text-anchor="end">${fmtDateShort(t1)}</text></svg>`;
}

// --- Réglages
function vSettings() {
  const st = S.settings;
  const tg = (k, label, sub) => `<label class="list-item"><div class="grow">${label}${sub ? `<div class="tiny dim">${sub}</div>` : ''}</div><input type="checkbox" data-setting="${k}" ${st[k] ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--acc)"></label>`;
  app.innerHTML = `<div class="row"><a class="icon-btn" href="#/">‹</a><h1 class="grow">Réglages</h1></div>
    <div class="card" style="padding:4px 14px">
      ${tg('autoTimer', 'Lancer le minuteur à chaque série validée')}
      ${tg('sound', 'Bips de fin de récup', 'Compte à rebours 3-2-1 (iPhone : coupé si le mode silencieux est actif)')}
      ${tg('vibrate', 'Vibrations', 'Android uniquement')}
      ${tg('wake', 'Garder l\'écran allumé pendant la séance')}
      ${tg('notif', 'Notification si l\'appli est en arrière-plan', 'Selon le téléphone, peut ne pas se déclencher écran verrouillé')}
    </div>
    <div class="card"><div class="grid4" style="margin-top:0">
      <div><label>Récup par défaut (s)</label><input type="text" inputmode="numeric" value="${st.rest}" data-setting-n="rest"></div>
      <div><label>Progression (kg)</label><input type="text" inputmode="decimal" value="${fmtKg(st.inc)}" data-setting-n="inc"></div>
      <div><label>Barre (kg)</label><input type="text" inputmode="decimal" value="${fmtKg(st.bar)}" data-setting-n="bar"></div></div>
      <label class="f">Disques disponibles (kg, séparés par des espaces)</label><input type="text" value="${st.plates.map(fmtKg).join(' ')}" data-setting-plates></div>
    <div class="card"><div class="row"><div class="grow">Objectif de séances par semaine<div class="tiny dim">Sert au suivi de régularité</div></div><input type="text" inputmode="numeric" style="width:64px;text-align:center" value="${st.goal}" data-setting-n="goal"></div></div>
    <h2>Minuteur de l'iPhone</h2>
    <div class="card" style="padding:4px 14px">${tg('iphoneTimer', 'Afficher le bouton 📱 dans le minuteur', 'Envoie la récup au minuteur natif : compte à rebours sur l\'écran verrouillé + alarme, même appli fermée')}</div>
    <details class="card"><summary><b>Mise en place (une seule fois, 1 min)</b></summary><ol class="small mut" style="padding-left:18px;line-height:1.6">
      <li>Ouvre l'app <b>Raccourcis</b> → onglet <b>Raccourcis</b> → <b>+</b> en haut à droite.</li>
      <li>Touche le nom en haut → <b>Renommer</b> → tape exactement <b style="color:var(--txt)">${esc(st.shortcut)}</b> (sans espace ni accent).</li>
      <li>Touche <b>Ajouter une action</b>, cherche <b>Démarrer le minuteur</b> (app Horloge) et ajoute-la.</li>
      <li>Dans l'action, touche la durée (« 30 ») → choisis la variable <b>Entrée du raccourci</b>. Touche « minutes » → choisis <b>secondes</b>.</li>
      <li>Touche <b>OK</b>. C'est prêt : vérifie avec le bouton ci-dessous (il lance un minuteur de 10 s).</li></ol>
      <button class="btn block" data-a="test-shortcut">Tester le raccourci (10 s)</button>
      <p class="tiny dim">Si iOS dit « impossible de trouver le raccourci », le nom ne correspond pas : il doit être identique à celui-ci (majuscules comprises).</p>
      <label class="f">Nom du raccourci</label><input type="text" value="${esc(st.shortcut)}" data-setting-s="shortcut" autocapitalize="off" autocorrect="off"></details>
    <h2>Sauvegarde</h2>
    <div class="card"><p class="small mut" style="margin-top:0">Tes données restent sur ce téléphone. Exporte une sauvegarde régulièrement (Fichiers, iCloud, OneDrive…) ; elle permet aussi de passer sur un autre appareil.${S.lastBackup ? `<br>Dernière sauvegarde : ${fmtDate(S.lastBackup)}` : ''}</p>
      <div class="row"><button class="btn pri grow" data-a="backup">Exporter</button><button class="btn grow" data-a="restore">Restaurer</button></div></div>
    <h2>Installer sur l'iPhone</h2>
    <div class="card small mut">Dans Safari : bouton <b>Partager</b> → <b>Sur l'écran d'accueil</b>. L'appli s'ouvre alors en plein écran et fonctionne hors ligne.</div>
    <p class="tiny dim" style="text-align:center;margin-top:20px">Ma Muscu · ${Object.keys(S.exercises).length} exercices · ${S.workouts.length} séances</p>`;
}

// ---------- Lexique / fiches ----------
function lexOf(e) { return e && (LEX[e.lex] || LEX[e.name]) || null; }
function ficheHTML(e, compact) {
  const L = lexOf(e), key = e.lex || e.name;
  if (!L) return `<div class="card" style="margin-top:10px;border-color:#f5b94166"><div class="small"><b>Pas encore de fiche pour cet exercice.</b><br><span class="mut">Envoie le programme à Claude pour qu'il ajoute la fiche et le schéma, ou écris ta propre description avec ✎.</span></div>
    <a class="btn sm" style="margin-top:8px" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.name + ' exercice')}">Chercher une démo vidéo</a>${e.note ? `<div class="ex-note">📌 ${esc(e.note)}</div>` : ''}</div>`;
  return `<div class="card fiche" style="margin-top:10px">
    ${Fig.has(key) ? `<div class="fig-wrap">${Fig.svg(key, 'anim fig-big')}</div>` : ''}
    <div class="tiny" style="color:var(--acc2);margin-top:6px">${esc(L.m)}</div>
    <p style="margin:6px 0 8px">${esc(L.d)}</p>
    <div class="small"><b>✅ Consignes</b><ul>${L.c.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    ${!compact && L.e && L.e.length ? `<div class="small"><b>⚠️ Erreurs fréquentes</b><ul>${L.e.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${e.note ? `<div class="ex-note">📌 ${esc(e.note)}</div>` : ''}</div>`;
}
function ficheModal(id) {
  const e = ex(id);
  const m = modal(`<div class="row"><h2 class="grow" style="margin:0">${esc(e.name)}</h2><button class="icon-btn" data-a="close">✕</button></div><div class="tiny dim">${esc(e.muscle)}</div>${ficheHTML(e)}
    <a class="btn block" style="margin-top:10px" href="#/exercice/${e.id}" data-a="close">Voir mes performances</a>`);
  Fig.animate(m);
}
function sessionFichesModal(ids, title) {
  ids = [...new Set(ids)];
  const m = modal(`<div class="row"><h2 class="grow" style="margin:0">${esc(title || 'Exercices')}</h2><button class="icon-btn" data-a="close">✕</button></div>
    ${ids.map(id => { const e = ex(id); return `<h3 style="margin-top:16px;color:var(--acc2)">${esc(e.name)}</h3>${ficheHTML(e, true)}`; }).join('')}`);
  Fig.animate(m);
}
function sendToIphoneTimer() {
  if (!S.timer) return;
  const rem = Math.ceil((S.timer.end - Date.now()) / 1000);
  if (rem <= 2) return toast('Récup déjà terminée');
  runShortcut(rem);
}
function runShortcut(sec) {
  location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(S.settings.shortcut.trim().normalize('NFC'))}&input=text&text=${sec}`;
}

// ---------- Modales ----------
function modal(html, onClose) {
  closeModal();
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  bg._onClose = onClose; document.body.appendChild(bg);
  return bg.firstChild;
}
function closeModal() { const m = $('#modal'); if (m) { m._onClose && m._onClose(); m.remove(); } }

// Choix d'un exercice (bibliothèque + création)
function pickExercise(cb, title = 'Choisir un exercice') {
  const m = modal(`<h2>${title}</h2><input type="search" id="pkq" placeholder="Rechercher ou taper un nouveau nom…" autocomplete="off">
    <div class="row wrap" style="margin-top:8px" id="pkm">${['Tous', ...MUSCLES].map((x, i) => `<button class="pill ${i ? '' : 'acc'}" data-m="${x}">${x}</button>`).join('')}</div>
    <div id="pkl" style="margin-top:8px"></div>`);
  let mus = 'Tous';
  const draw = () => {
    const q = Parser.norm($('#pkq').value);
    const list = Object.values(S.exercises).filter(e => (mus === 'Tous' || e.muscle === mus) && (!q || Parser.norm(e.name).includes(q) || (e.aliases || []).some(a => Parser.norm(a).includes(q)))).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    $('#pkl').innerHTML = (q && !list.some(e => Parser.norm(e.name) === q) ? `<div class="list-item tap" data-new="1"><b style="color:var(--acc2)">+ Créer « ${esc($('#pkq').value.trim())} »</b></div>` : '')
      + list.map(e => `<div class="list-item tap" data-id="${e.id}"><div class="grow">${esc(e.name)}<div class="tiny dim">${esc(e.muscle)}</div></div></div>`).join('');
  };
  m.querySelector('#pkq').oninput = draw;
  m.querySelector('#pkm').onclick = ev => { const b = ev.target.closest('[data-m]'); if (!b) return; mus = b.dataset.m; m.querySelectorAll('#pkm .pill').forEach(x => x.classList.toggle('acc', x === b)); draw(); };
  m.querySelector('#pkl').onclick = ev => {
    const r = ev.target.closest('.list-item'); if (!r) return;
    let id = r.dataset.id;
    if (r.dataset.new) { const name = $('#pkq').value.trim(); const [muscle, type] = guessType(name); id = uid(); S.exercises[id] = { id, name: name.charAt(0).toUpperCase() + name.slice(1), muscle: mus !== 'Tous' ? mus : muscle, type, aliases: [], note: '' }; save(); }
    closeModal(); cb(id);
  };
  draw();
}
function editExercise(id) {
  const isNew = !id; const e = isNew ? { name: '', muscle: 'Corps entier', type: 'charge', note: '' } : S.exercises[id];
  const m = modal(`<h2>${isNew ? 'Nouvel exercice' : 'Modifier l\'exercice'}</h2>
    <label class="f">Nom</label><input type="text" id="en" value="${esc(e.name)}">
    <label class="f">Groupe musculaire</label><select id="em">${MUSCLES.map(x => `<option ${x === e.muscle ? 'selected' : ''}>${x}</option>`).join('')}</select>
    <label class="f">Type</label><select id="et">${[['charge', 'Charge (kg × reps)'], ['pdc', 'Poids du corps (+ lest)'], ['plio', 'Pliométrie'], ['temps', 'Temps (secondes)']].map(([k, l]) => `<option value="${k}" ${k === e.type ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <label class="f">Note permanente (réglage machine, placement…)</label><input type="text" id="eno" value="${esc(e.note || '')}">
    <div class="row" style="margin-top:16px">${!isNew ? '<button class="btn danger" id="edel">Supprimer</button>' : ''}<span class="grow"></span><button class="btn" data-a="close">Annuler</button><button class="btn pri" id="eok">OK</button></div>`);
  m.querySelector('#eok').onclick = () => {
    const name = $('#en').value.trim(); if (!name) return toast('Donne un nom');
    const o = isNew ? { id: uid(), aliases: [] } : S.exercises[id];
    Object.assign(o, { name, muscle: $('#em').value, type: $('#et').value, note: $('#eno').value.trim() });
    S.exercises[o.id] = o; save(); closeModal(); isNew ? location.hash = '#/exercice/' + o.id : route();
  };
  const del = m.querySelector('#edel');
  if (del) del.onclick = () => {
    const used = S.workouts.some(w => w.items.some(i => i.exId === id)) || S.programs.some(p => p.weeks.some(w => w.sessions.some(s => s.items.some(i => i.exId === id))));
    if (used) return toast('Exercice utilisé dans un programme ou l\'historique');
    if (confirm('Supprimer cet exercice ?')) { delete S.exercises[id]; save(); closeModal(); location.hash = '#/exercices'; }
  };
}
function exMenu(ii) {
  const it = S.active.items[ii], e = ex(it.exId);
  const m = modal(`<h2>${esc(e.name)}</h2>
    <label class="f">Temps de récup (secondes)</label>
    <div class="row">${[30, 60, 90, 120, 180, 240].map(s => `<button class="pill ${it.rest === s ? 'acc' : ''}" data-rest="${s}">${fmtRest(s)}</button>`).join('')}</div>
    <input type="text" inputmode="numeric" id="mr" value="${it.rest}" style="margin-top:8px">
    <label class="f">Consigne pour cette séance</label><input type="text" id="mn" value="${esc(it.note)}">
    <div class="stack" style="margin-top:14px">
      <button class="btn block" data-mm="replace">Remplacer l'exercice</button>
      <button class="btn block" data-mm="hist">Voir l'historique</button>
      <div class="row"><button class="btn grow" data-mm="up" ${ii === 0 ? 'disabled' : ''}>Monter</button><button class="btn grow" data-mm="down" ${ii === S.active.items.length - 1 ? 'disabled' : ''}>Descendre</button></div>
      <button class="btn block danger" data-mm="remove">Retirer de la séance</button>
      <button class="btn pri block" data-mm="ok">OK</button></div>`);
  m.querySelectorAll('[data-rest]').forEach(b => b.onclick = () => { $('#mr').value = b.dataset.rest; m.querySelectorAll('[data-rest]').forEach(x => x.classList.toggle('acc', x === b)); });
  const commit = () => { it.rest = num($('#mr').value) ?? it.rest; it.note = $('#mn').value; save(); };
  m.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => {
    commit(); const a = b.dataset.mm, items = S.active.items;
    if (a === 'replace') { closeModal(); pickExercise(id => { it.exId = id; save(); vSession(); }, 'Remplacer par…'); return; }
    if (a === 'hist') { closeModal(); location.hash = '#/exercice/' + it.exId; return; }
    if (a === 'up' && ii > 0) [items[ii - 1], items[ii]] = [items[ii], items[ii - 1]];
    if (a === 'down' && ii < items.length - 1) [items[ii + 1], items[ii]] = [items[ii], items[ii + 1]];
    if (a === 'remove') { if (!confirm('Retirer cet exercice ?')) return; items.splice(ii, 1); }
    save(); closeModal(); vSession();
  });
}
function platesModal(weight) {
  const m = modal(`<h2>Calcul des disques</h2><label class="f">Charge totale (kg)</label><input type="text" inputmode="decimal" id="pw" value="${weight ? fmtKg(weight) : ''}">
    <div id="pr"></div><p class="tiny dim">Barre de ${fmtKg(S.settings.bar)} kg · modifiable dans les réglages.</p><button class="btn block" data-a="close">Fermer</button>`);
  const colors = { 25: '#dc2626', 20: '#2563eb', 15: '#eab308', 10: '#16a34a', 5: '#e5e7eb', 2.5: '#374151', 1.25: '#9ca3af' };
  const draw = () => {
    const tot = num($('#pw').value) || 0; let side = (tot - S.settings.bar) / 2; const res = [];
    if (side < 0) { $('#pr').innerHTML = '<p class="mut small">Inférieur au poids de la barre.</p>'; return; }
    for (const p of [...S.settings.plates].sort((a, b) => b - a)) while (side >= p - 1e-9) { res.push(p); side -= p; }
    $('#pr').innerHTML = `<div class="plates">${res.map(p => `<div class="plate" style="height:${30 + p * 3}px;background:${colors[p] || '#6b7280'};color:${p === 5 ? '#111' : '#fff'}">${fmtKg(p)}</div>`).join('') || '<span class="mut">Barre seule</span>'}</div>
      <p style="text-align:center"><b>Par côté :</b> ${res.map(fmtKg).join(' + ') || '—'}${side > 0.01 ? `<br><span class="small" style="color:var(--warn)">Reste ${fmtKg(Math.round(side * 100) / 100)} kg / côté non faisable</span>` : ''}</p>`;
  };
  m.querySelector('#pw').oninput = draw; draw();
}

// Import d'un programme
function importModal() {
  const m = modal(`<h2>Importer un programme</h2>
    <div class="tabs" id="imt"><button class="on" data-t="pdf">PDF</button><button data-t="txt">Texte collé</button><button data-t="json">Fichier Ma Muscu</button></div>
    <div id="imb"></div><div id="imp"></div>`);
  const tabs = {
    pdf: `<p class="small mut">Choisis le PDF de ton programme. Le texte est extrait puis converti : tu pourras tout vérifier et corriger avant de valider.</p>
      <input type="file" accept="application/pdf,.pdf" id="imf" class="btn block">`,
    txt: `<p class="small mut">Colle ton programme (notes, mail, site…). Une ligne par exercice, par ex. :<br><span class="dim">Séance A<br>Squat 4x8 récup 2 min<br>Développé couché 4 séries de 6-8, repos 1'30</span></p>
      <textarea id="imx" style="min-height:180px" placeholder="Semaine 1&#10;Séance A&#10;Squat 4x8 récup 120s&#10;…"></textarea><button class="btn pri block" style="margin-top:8px" id="imgo">Analyser</button>`,
    json: `<p class="small mut">Fichier .json exporté depuis Ma Muscu (un programme), ou sauvegarde complète.</p><input type="file" accept=".json,application/json" id="imj" class="btn block">`,
  };
  const setTab = t => {
    m.querySelectorAll('#imt button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    $('#imb').innerHTML = tabs[t]; $('#imp').innerHTML = '';
    if (t === 'pdf') $('#imf').onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return;
      $('#imp').innerHTML = '<p class="mut">Lecture du PDF…</p>';
      try {
        const text = await Parser.pdfToText(f);
        if (text.replace(/\s/g, '').length < 20) { $('#imp').innerHTML = '<p style="color:var(--warn)">Ce PDF ne contient pas de texte lisible (image scannée ?). Ouvre-le, copie le texte ou recopie-le dans l\'onglet « Texte collé ».</p>'; return; }
        preview(text, f.name.replace(/\.pdf$/i, ''), true);
      } catch (e) { console.error(e); $('#imp').innerHTML = '<p style="color:var(--bad)">Impossible de lire ce PDF (connexion nécessaire la première fois).</p>'; }
    };
    if (t === 'txt') $('#imgo').onclick = () => preview($('#imx').value, 'Programme importé', false);
    if (t === 'json') $('#imj').onchange = async ev => { const f = ev.target.files[0]; if (f) importJSON(await f.text()); };
  };
  function preview(text, name, showText) {
    const res = Parser.parseText(text);
    const nItems = res.weeks.reduce((a, w) => a + w.sessions.reduce((b, s) => b + s.items.length, 0), 0);
    $('#imp').innerHTML = `${showText ? `<details style="margin-top:10px"><summary class="small mut">Texte extrait (modifiable)</summary><textarea id="imraw" style="min-height:200px;margin-top:6px">${esc(text)}</textarea><button class="btn sm" id="imre" style="margin-top:6px">Ré-analyser</button></details>` : ''}
      ${nItems ? `<label class="f">Nom du programme</label><input type="text" id="imn" value="${esc(name)}">
      <div class="small mut" style="margin:10px 0 4px">${res.weeks.length} semaine(s) · ${res.weeks.reduce((a, w) => a + w.sessions.length, 0)} séance(s) · ${nItems} exercices détectés</div>
      <div class="card" style="max-height:300px;overflow:auto;padding:10px">${res.weeks.map(w => `<div class="small" style="font-weight:700;color:var(--acc2);margin-top:4px">${esc(w.name)}</div>${w.sessions.map(s => `<div class="small" style="margin:6px 0 2px;font-weight:600">${esc(s.name)}</div>${s.items.map(i => `<div class="tiny mut">• ${esc(i.name)}${(() => { const f = findExerciseByName(i.name); return f && lexOf(f) ? '' : ' <span style="color:var(--warn)">⚠️ pas de fiche</span>'; })()} — ${i.sets}×${esc(i.reps)}${i.rest ? ' · ' + fmtRest(i.rest) : ''}${i.weight != null ? ' · ' + esc(i.weight) + (typeof i.weight === 'number' ? ' kg' : '') : ''}${i.note ? ' · ' + esc(i.note) : ''}</div>`).join('')}`).join('')}`).join('')}</div>
      <button class="btn pri block" style="margin-top:10px" id="imok">Créer le programme</button>`
      : `<p style="color:var(--warn)" class="small">Aucun exercice reconnu. Vérifie que chaque exercice a un format du type « Squat 4x8 » ou « 4 séries de 8 ».</p>`}`;
    const re = $('#imre'); if (re) re.onclick = () => preview($('#imraw').value, $('#imn') ? $('#imn').value : name, true);
    const ok = $('#imok'); if (ok) ok.onclick = () => {
      const p = { id: uid(), name: $('#imn').value.trim() || name, notes: 'Importé le ' + new Date().toLocaleDateString('fr-FR'), pos: { w: 0, s: 0 },
        weeks: res.weeks.map(w => ({ id: uid(), name: w.name, sessions: w.sessions.map(s => ({ id: uid(), name: s.name, items: s.items.map(i => ({ id: uid(), exId: getOrCreateExercise(i.name), sets: i.sets, reps: i.reps, rest: i.rest ?? S.settings.rest, weight: i.weight, note: i.note })) })) })) };
      S.programs.push(p); S.activeProgramId = p.id; save(); closeModal(); location.hash = '#/programme/' + p.id;
      const miss = [...programExIds(p)].filter(id => !lexOf(ex(id))).length;
      toast(miss ? `Programme créé · ${miss} exercice(s) sans fiche à vérifier` : 'Programme créé : toutes les fiches sont dispo dans le Lexique', 3500);
    };
  }
  m.querySelector('#imt').onclick = ev => { const b = ev.target.closest('[data-t]'); if (b) setTab(b.dataset.t); };
  setTab('pdf');
}
function importJSON(txt) {
  let d; try { d = JSON.parse(txt); } catch (e) { return toast('Fichier invalide'); }
  if (d.app === 'ma-muscu' && d.kind === 'backup') {
    if (!confirm(`Restaurer cette sauvegarde (${d.data.workouts.length} séances, ${d.data.programs.length} programmes) ? Les données actuelles seront remplacées.`)) return;
    S = d.data; S.settings = { ...DEFAULT_SETTINGS, ...(S.settings || {}) }; save(); closeModal(); location.hash = '#/'; route(); toast('Sauvegarde restaurée'); return;
  }
  if (d.app === 'ma-muscu' && d.kind === 'program') {
    const map = {};
    for (const e of Object.values(d.exercises || {})) { const f = findExerciseByName(e.name); if (f) map[e.id] = f.id; else { const id = uid(); S.exercises[id] = { ...e, id }; map[e.id] = id; } }
    const p = reId(clone(d.program)); p.weeks.forEach(w => { reId(w); w.sessions.forEach(s => s.items.forEach(i => i.exId = map[i.exId] || i.exId)); }); p.pos = { w: 0, s: 0 };
    S.programs.push(p); save(); closeModal(); location.hash = '#/programme/' + p.id; toast('Programme importé'); return;
  }
  toast('Format non reconnu');
}
async function shareOrDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const file = new File([blob], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return true; } catch (e) { if (e.name === 'AbortError') return false; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); return true;
}
function csv() {
  const rows = [['Date', 'Séance', 'Programme', 'Exercice', 'Série', 'Échauffement', 'Charge (kg)', 'Reps/sec', '1RM estimé']];
  for (const w of doneWorkouts().reverse()) for (const i of w.items) { let k = 0; for (const s of i.sets) rows.push([new Date(w.start).toLocaleString('fr-FR'), w.name, w.programName || '', ex(i.exId).name, s.warm ? 'É' : ++k, s.warm ? 'oui' : '', fmtKg(s.w), s.r ?? '', s.w && s.r ? fmtKg(Math.round(e1rm(s.w, s.r) * 10) / 10) : '']); }
  return '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
}

// ---------- Actions (délégation) ----------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  const d = b.dataset, a = d.a;
  Timer.unlockAudio();
  const C = ctx(d);
  switch (a) {
    case 'close': closeModal(); break;
    case 'fiche': ficheModal(d.id); break;
    case 'session-fiches': sessionFichesModal(C.s.items.map(i => i.exId), C.s.name); break;
    case 'timer-iphone': sendToIphoneTimer(); break;
    case 'test-shortcut': runShortcut(10); break;
    case 'start': startWorkout(d.p, d.w, d.s); break;
    case 'start-free': startWorkout(); break;
    case 'pick-session': {
      const p = S.programs.find(x => x.id === d.p);
      modal(`<h2>Choisir la séance</h2>${p.weeks.map(w => `${p.weeks.length > 1 ? `<div class="small mut" style="margin-top:10px">${esc(w.name)}</div>` : ''}${w.sessions.map(s => `<div class="list-item tap" data-a="start" data-p="${p.id}" data-w="${w.id}" data-s="${s.id}"><div class="grow">${esc(s.name)}<div class="tiny dim">${s.items.length} exercices</div></div><span>▶</span></div>`).join('')}`).join('')}`);
      break;
    }
    case 'new-program': { const p = newProgram(); location.hash = '#/programme/' + p.id; break; }
    case 'import': importModal(); break;
    case 'set-active': S.activeProgramId = d.p; save(); route(); toast('Programme actif'); break;
    case 'del-program': if (confirm('Supprimer ce programme ? (l\'historique est conservé)')) { S.programs = S.programs.filter(x => x.id !== d.p); if (S.activeProgramId === d.p) S.activeProgramId = S.programs[0]?.id || null; save(); location.hash = '#/programmes'; } break;
    case 'export-program': {
      const exs = {}; C.p.weeks.forEach(w => w.sessions.forEach(s => s.items.forEach(i => exs[i.exId] = ex(i.exId))));
      shareOrDownload(C.p.name.replace(/[^\w\-àâéèêëîïôûùç ]+/gi, '') + '.json', JSON.stringify({ app: 'ma-muscu', kind: 'program', program: C.p, exercises: exs }, null, 1), 'application/json'); break;
    }
    case 'week-tab': curWeek[d.p] = +d.i; route(); break;
    case 'add-week': { const p = C.p; p.weeks.push({ id: uid(), name: 'Semaine ' + (p.weeks.length + 1), sessions: [{ id: uid(), name: 'Séance A', items: [] }] }); curWeek[p.id] = p.weeks.length - 1; save(); route(); break; }
    case 'dup-week': { const p = C.p, i = p.weeks.indexOf(C.w); const nw = reId(clone(C.w)); nw.sessions.forEach(s => { reId(s); }); nw.name = 'Semaine ' + (p.weeks.length + 1); p.weeks.splice(i + 1, 0, nw); curWeek[p.id] = i + 1; save(); route(); toast('Semaine dupliquée : ajuste séries/reps'); break; }
    case 'del-week': if (confirm(`Supprimer « ${C.w.name} » ?`)) { C.p.weeks = C.p.weeks.filter(x => x !== C.w); curWeek[C.p.id] = 0; save(); route(); } break;
    case 'add-session': C.w.sessions.push({ id: uid(), name: 'Séance ' + String.fromCharCode(65 + C.w.sessions.length), items: [] }); save(); route(); break;
    case 'dup-session': { const i = C.w.sessions.indexOf(C.s); const ns = reId(clone(C.s)); ns.name += ' (copie)'; C.w.sessions.splice(i + 1, 0, ns); save(); route(); break; }
    case 'del-session': if (confirm(`Supprimer « ${C.s.name} » ?`)) { C.w.sessions = C.w.sessions.filter(x => x !== C.s); save(); route(); } break;
    case 'mv-session': { const arr = C.w.sessions, i = arr.indexOf(C.s), j = i + +d.d; if (j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; save(); route(); } break; }
    case 'add-item': pickExercise(id => { C.s.items.push({ id: uid(), exId: id, sets: 3, reps: '8-10', rest: S.settings.rest, weight: null, note: '' }); save(); route(); }); break;
    case 'pick-ex': pickExercise(id => { C.i.exId = id; save(); route(); }); break;
    case 'ss-toggle': C.i.ss = !C.i.ss; save(); route(); break;
    case 'del-item': C.s.items = C.s.items.filter(x => x !== C.i); save(); route(); break;
    case 'mv-item': { const arr = C.s.items, i = arr.indexOf(C.i), j = i + +d.d; if (j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; save(); route(); } break; }
    // séance
    case 'check': checkSet(+d.i, +d.s); break;
    case 'toggle-warm': { const s = S.active.items[+d.i].sets[+d.s]; s.warm = !s.warm; save(); vSession(); break; }
    case 'add-set': { const it = S.active.items[+d.i]; const last = it.sets[it.sets.length - 1]; it.sets.push({ w: last ? last.w : null, r: null, done: false, warm: false }); save(); vSession(); break; }
    case 'del-set': { const it = S.active.items[+d.i]; const k = it.sets.map(s => s.done).lastIndexOf(false); it.sets.splice(k >= 0 ? k : it.sets.length - 1, 1); save(); vSession(); break; }
    case 'timer-manual': { const it = S.active.items[+d.i]; Timer.start(it.rest, 'Récup · ' + ex(it.exId).name); break; }
    case 'timer-add': Timer.add(+d.v); break;
    case 'timer-stop': Timer.stop(); break;
    case 'ex-menu': exMenu(+d.i); break;
    case 'plates': { const it = S.active.items[+d.i]; const s = it.sets.find(x => !x.done) || it.sets[it.sets.length - 1]; platesModal(s && s.w); break; }
    case 'sess-add-ex': pickExercise(id => { S.active.items.push(makeItem({ exId: id, sets: 3, reps: '', rest: S.settings.rest }, S.active.id)); save(); vSession(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 50); }); break;
    case 'finish': finishWorkout(); break;
    case 'cancel-workout': if (confirm('Abandonner la séance ? Rien ne sera enregistré.')) { S.active = null; save(); Timer.stop(); updateWakeLock(); location.hash = '#/'; } break;
    // historique
    case 'del-workout': if (confirm('Supprimer cette séance de l\'historique ?')) { S.workouts = S.workouts.filter(x => x.id !== d.id); save(); location.hash = '#/historique'; } break;
    case 'redo': {
      const w = S.workouts.find(x => x.id === d.id);
      if (S.active && !confirm('Une séance est en cours. La remplacer ?')) break;
      const nw = { id: uid(), start: Date.now(), end: null, name: w.name, programName: w.programName, weekName: w.weekName, note: w.note || '', items: [] };
      nw.items = w.items.map(i => makeItem({ exId: i.exId, sets: i.sets.filter(s => !s.warm).length || 1, reps: i.targetReps, rest: i.rest, weight: i.targetWeight, note: i.note, ss: i.ss }, nw.id));
      S.active = nw; save(); location.hash = '#/seance'; break;
    }
    case 'export-csv': shareOrDownload('ma-muscu-historique.csv', csv(), 'text/csv'); break;
    // exercices / réglages
    case 'new-ex': editExercise(); break;
    case 'edit-ex': editExercise(d.id); break;
    case 'backup': shareOrDownload(`ma-muscu-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'ma-muscu', kind: 'backup', date: Date.now(), data: S }), 'application/json').then(ok => { if (ok) { S.lastBackup = Date.now(); save(); route(); } }); break;
    case 'restore': { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => i.files[0] && importJSON(await i.files[0].text()); i.click(); break; }
  }
});
// Saisie : séries en cours
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.set && S.active) {
    const [ii, si, f] = t.dataset.set.split(':'); const s = S.active.items[+ii]?.sets[+si]; if (!s) return;
    s[f] = num(t.value); save();
  }
});
// Saisie : éditeur de programme et réglages
document.addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (d.bind) {
    const C = ctx(d); const v = t.value;
    switch (d.bind) {
      case 'pname': C.p.name = v.trim() || 'Programme'; break;
      case 'pnotes': C.p.notes = v; break;
      case 'wname': C.w.name = v.trim() || 'Semaine'; save(); route(); return;
      case 'sname': C.s.name = v.trim() || 'Séance'; break;
      case 'snote': C.s.note = v; break;
      case 'it-sets': C.i.sets = Math.max(1, Math.min(20, parseInt(v) || 1)); t.value = C.i.sets; break;
      case 'it-reps': C.i.reps = v.trim(); break;
      case 'it-rest': { const r = Parser.parseRest(v); C.i.rest = r ?? S.settings.rest; t.value = C.i.rest; break; }
      case 'it-weight': { const n = num(v); C.i.weight = v.trim() === '' ? null : (/%|rpe|rir/i.test(v) ? v.trim().replace(/^rpe/i, 'RPE').replace(/^rir/i, 'RIR') : n); break; }
      case 'it-note': C.i.note = v.trim(); break;
    }
    save(); return;
  }
  if (d.setting) {
    S.settings[d.setting] = t.checked;
    if (d.setting === 'notif' && t.checked && 'Notification' in window) Notification.requestPermission().then(p => { if (p !== 'granted') { S.settings.notif = false; save(); route(); toast('Notifications refusées'); } });
    if (d.setting === 'notif' && t.checked && !('Notification' in window)) { S.settings.notif = false; toast('Installe d\'abord l\'appli sur l\'écran d\'accueil'); route(); }
    save(); return;
  }
  if (d.settingN) { const n = num(t.value); if (n != null && n > 0) S.settings[d.settingN] = n; save(); return; }
  if (d.settingS) { S.settings[d.settingS] = t.value.trim() || DEFAULT_SETTINGS[d.settingS]; save(); route(); return; }
  if ('settingPlates' in d) { const ps = t.value.split(/[\s;]+/).map(num).filter(x => x > 0); if (ps.length) S.settings.plates = ps; save(); }
});
// Valider la saisie avec "Entrée" sur le clavier
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset.set) { e.preventDefault(); const [ii, si] = e.target.dataset.set.split(':'); e.target.blur(); checkSet(+ii, +si); }
});

// ---------- Démarrage ----------
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
route();
