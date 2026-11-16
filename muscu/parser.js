// Lecture d'un programme depuis un PDF ou du texte collé.
// Reconnaît les formats courants : "Squat 4x8 récup 90s", "Squat : 4 séries de 6-8 reps, 2 min",
// "Développé couché 4 × 10 @ 60 kg r=1'30", tableaux "Squat  4  8  90", titres "Semaine 2", "Séance A", "Jour 1"...

const Parser = (() => {
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  function parseRest(s) {
    // 1'30 / 1'30" / 1min30 / 90s / 2 min / 1:30 / r=90
    let m;
    if ((m = s.match(/(\d+)\s*(?:'|’|min|mn|m)\s*(\d{1,2})?\s*(?:"|”|s|sec)?/i)) && !/^\d+\s*m$/i.test(m[0].trim()) ) return (+m[1]) * 60 + (+(m[2] || 0));
    if ((m = s.match(/(\d+):(\d{2})/))) return (+m[1]) * 60 + (+m[2]);
    if ((m = s.match(/(\d+)\s*(?:s|sec|secondes?|"|”)\b/i))) return +m[1];
    if ((m = s.match(/(\d+)/))) { const v = +m[1]; return v <= 5 ? v * 60 : v; }
    return null;
  }

  const REST_RE = /(?:r[ée]cup(?:[ée]ration)?|repos|rest|pause|\br)\s*[:=]?\s*(\d+\s*(?:'|’|:|min|mn)\s*\d{0,2}\s*(?:"|”|s|sec)?|\d+\s*(?:s|sec|secondes?|"|”|min|mn|')?)/i;
  const SETS_RE = /(\d{1,2})\s*(?:x|×|\*|séries?\s*(?:de|x|×)?|series?\s*(?:de|x|×)?|sets?\s*(?:of|x|×)?)\s*(\d{1,3}(?:\s*(?:-|–|à|a)\s*\d{1,3}(?!\d|[.,]\d|\s*(?:kg|%)))?|max|amrap|échec|echec)\s*(s\b|sec\b|"|”|m\b|reps?|rép(?:étition)?s?|rep(?:etition)?s?|contacts?|sauts?|\/\s*(?:c[ôo]t[ée]|jambe|bras))?/i;
  const WEIGHT_RE = /(?:@|à|a|avec)?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(kg|%)/i;
  const WEEK_RE = /^(?:semaine|sem\.?|week|s)\s*(\d{1,2})\b(.*)$/i;
  const SESSION_RE = /^(?:s[ée]ance|seance|jour|day|workout|entra[iî]nement|training|session|full\s*body|upper|lower|push|pull|legs|haut du corps|bas du corps|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i;
  const TABLE_RE = /^(.+?)\s{1,}(\d{1,2})\s{1,}(\d{1,3}(?:\s*[-–]\s*\d{1,3})?|max)\s{1,}(\d+\s*(?:'|’|:|min|mn|s|sec|")?\s*\d{0,2}"?)\s*$/i;

  function cleanName(s) {
    return s.replace(/^[\s•·\-–—*>▪●○■□✓✔]+/, '')
      .replace(/^(?:[a-h]\d?\s*[).:-]|\d{1,2}\s*[).:-]|\d{1,2}\s+)\s*/i, '')
      .replace(/[\s:–—\-|,;(]+$/, '').replace(/\s{2,}/g, ' ').trim();
  }

  function parseExerciseLine(line) {
    let m = line.match(SETS_RE), name, sets, reps, unit = '';
    if (m) {
      name = cleanName(line.slice(0, m.index));
      sets = +m[1]; reps = m[2].replace(/\s+/g, '').replace(/[–à]/g, '-').replace(/^a$/, '');
      unit = (m[3] || '').toLowerCase();
      if (/^(s|sec|"|”)$/.test(unit)) reps += 's';
      if (/^m$/.test(unit)) reps += 'm';
      if (/c[ôo]t|jambe|bras/.test(unit)) reps += '/côté';
      if (!name) { // format "4x8 Squat"
        const after = line.slice(m.index + m[0].length);
        name = cleanName(after.replace(REST_RE, '').replace(WEIGHT_RE, ''));
      }
    } else if ((m = line.match(TABLE_RE))) {
      name = cleanName(m[1]); sets = +m[2]; reps = m[3].replace(/\s+/g, '');
      const rest = parseRest(m[4]);
      return name ? { name, sets, reps, rest, weight: null, note: '' } : null;
    } else return null;
    if (!name || name.length < 2 || sets < 1 || sets > 20) return null;
    let rest = null; const rm = line.match(REST_RE); if (rm) rest = parseRest(rm[1]);
    let weight = null; const wm = line.slice(m.index).match(WEIGHT_RE);
    if (wm) weight = wm[2] === '%' ? wm[1] + '%' : parseFloat(wm[1].replace(',', '.'));
    let note = '';
    const tm = line.match(/tempo\s*[:=]?\s*([\dx]{3,5})/i); if (tm) note = 'Tempo ' + tm[1];
    const rpe = line.match(/\b(rpe|rir)\s*[:=]?\s*(\d+(?:[.,]\d)?)/i); if (rpe) note = (note ? note + ' · ' : '') + rpe[1].toUpperCase() + ' ' + rpe[2];
    return { name, sets, reps, rest, weight, note };
  }

  // Texte -> { weeks:[{name, sessions:[{name, items:[...]}]}] }
  function parseText(text) {
    const lines = text.split(/\r?\n/).map(l => l.replace(/\t/g, '  ').replace(/ /g, ' ').trim()).filter(Boolean);
    const weeks = []; let week = null, session = null, lastItem = null;
    const ensureWeek = () => { if (!week) { week = { name: 'Semaine 1', sessions: [] }; weeks.push(week); } };
    const ensureSession = () => { ensureWeek(); if (!session) { session = { name: 'Séance ' + String.fromCharCode(65 + week.sessions.length), items: [] }; week.sessions.push(session); } };

    for (const raw of lines) {
      const line = raw.replace(/\s{3,}/g, '   ');
      const wk = line.match(WEEK_RE);
      if (wk && line.length < 60 && !SETS_RE.test(line)) {
        const label = cleanName(line);
        week = { name: label || 'Semaine ' + wk[1], sessions: [] }; weeks.push(week); session = null; lastItem = null; continue;
      }
      const ex = parseExerciseLine(line);
      if (ex) { ensureSession(); session.items.push(ex); lastItem = ex; continue; }
      if (SESSION_RE.test(line) && line.length < 70) {
        ensureWeek(); session = { name: cleanName(line) || line, items: [] }; week.sessions.push(session); lastItem = null; continue;
      }
      // ligne seule avec un repos -> s'applique au dernier exercice
      const rm = line.match(REST_RE);
      if (rm && lastItem && !lastItem.rest && line.length < 40) { lastItem.rest = parseRest(rm[1]); continue; }
      // titre court terminé par ":" -> nouvelle séance
      if (/:$/.test(line) && line.length < 50 && !/\d+\s*x/i.test(line)) {
        ensureWeek(); session = { name: cleanName(line), items: [] }; week.sessions.push(session); lastItem = null; continue;
      }
      // consigne courte après un exercice -> note
      if (lastItem && line.length < 90 && /^(?:\(|→|->|consigne|note|tempo|rpe|rir|charge|explosi|contr[ôo]l|lent|pause|superset|bi-?set)/i.test(line)) {
        lastItem.note = (lastItem.note ? lastItem.note + ' · ' : '') + line.replace(/^[(→\->\s]+|\)$/g, '');
      }
    }
    // nettoyage : retire semaines/séances vides
    const out = weeks.map(w => ({ ...w, sessions: w.sessions.filter(s => s.items.length) })).filter(w => w.sessions.length);
    return { weeks: out };
  }

  // PDF -> texte avec reconstruction des lignes (pdf.js chargé à la demande)
  let pdfjs = null;
  async function loadPdfjs() {
    if (pdfjs) return pdfjs;
    const base = new URL('vendor/', location.href).href;
    pdfjs = await import(base + 'pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
    return pdfjs;
  }
  async function pdfToText(file) {
    const lib = await loadPdfjs();
    const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const rows = [];
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const y = it.transform[5], x = it.transform[4];
        let row = rows.find(r => Math.abs(r.y - y) < 3.5);
        if (!row) { row = { y, parts: [] }; rows.push(row); }
        row.parts.push({ x, s: it.str, w: it.width || 0 });
      }
      rows.sort((a, b) => b.y - a.y);
      for (const r of rows) {
        r.parts.sort((a, b) => a.x - b.x);
        let line = '', end = null;
        for (const pt of r.parts) {
          if (end !== null) { const gap = pt.x - end; line += gap > 14 ? '   ' : gap > 1.5 ? ' ' : ''; }
          line += pt.s; end = pt.x + pt.w;
        }
        out.push(line.trim());
      }
      out.push('');
    }
    return out.join('\n');
  }

  return { parseText, pdfToText, norm, parseRest };
})();
