// Schémas animés des exercices : bonhomme vu de profil, calculé à partir d'angles.
// Angles absolus en degrés : 0 = vers le bas, 90 = vers l'avant (droite), 180 = vers le haut, -90 = vers l'arrière.
// Pose : { root:'A'|'P'|'W'|'K'|'T', at:[x,y], t (tronc), hd (tête), th/sh/ft (cuisse/tibia/pied), ua/fa (bras/avant-bras),
//          th2/sh2/ft2, ua2/fa2 (membres côté opposé, dessinés en retrait) }
const Fig = (() => {
  const L = { t: 27, neck: 3.5, head: 5.5, th: 21, sh: 20, ft: 6.5, ua: 14, fa: 13 };
  const FLOOR = 94;
  const rad = a => a * Math.PI / 180;
  const v = (a, l) => [Math.sin(rad(a)) * l, Math.cos(rad(a)) * l];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];

  function solve(p) {
    const o = {}; const P = [0, 0];
    o.P = P;
    o.S = add(P, v(p.t, L.t));
    o.H = add(o.S, v(p.hd ?? p.t, L.neck + L.head));
    o.K = add(P, v(p.th, L.th)); o.A = add(o.K, v(p.sh, L.sh)); o.T = add(o.A, v(p.ft ?? 90, L.ft));
    o.E = add(o.S, v(p.ua, L.ua)); o.W = add(o.E, v(p.fa, L.fa));
    if (p.th2 != null) { o.K2 = add(P, v(p.th2, L.th)); o.A2 = add(o.K2, v(p.sh2, L.sh)); o.T2 = add(o.A2, v(p.ft2 ?? 90, L.ft)); }
    if (p.ua2 != null) { o.E2 = add(o.S, v(p.ua2, L.ua)); o.W2 = add(o.E2, v(p.fa2, L.fa)); }
    const r = o[p.root || 'A']; const at = p.at || [55, FLOOR];
    const d = [at[0] - r[0], at[1] - r[1]];
    for (const k in o) o[k] = add(o[k], d);
    return o;
  }
  const lerp = (a, b, k) => {
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
    if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => lerp(x, b[i], k));
    return k < 0.5 ? a : b;
  };
  function mix(A, B, k) { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) o[key] = (key in A && key in B) ? lerp(A[key], B[key], k) : (A[key] ?? B[key]); return o; }

  const line = (a, b, w, c, extra = '') => `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const circ = (p, r, c, extra = '') => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r}" fill="${c}" ${extra}/>`;
  const C = { body: '#eef0f4', back: '#7b8394', eq: '#ff6b2c', eq2: '#9aa1b0', dim: '#3a404d' };

  function props(list, o, phase) {
    let s = '';
    for (const pr of list || []) {
      const at = k => typeof k === 'string' ? add(o[k], pr.off || [0, 0]) : k;
      switch (pr.type) {
        case 'bench': s += `<rect x="${pr.x1}" y="${pr.y}" width="${pr.x2 - pr.x1}" height="4" rx="1.5" fill="${C.dim}"/>` + line([pr.x1 + 4, pr.y + 4], [pr.x1 + 4, FLOOR], 2.5, C.dim) + line([pr.x2 - 4, pr.y + 4], [pr.x2 - 4, FLOOR], 2.5, C.dim); break;
        case 'pad': { const a = add(o[pr.a], pr.off), b = add(o[pr.b], pr.off); s += line(a, b, 5, C.dim) + line([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], [(a[0] + b[0]) / 2, FLOOR], 2.5, C.dim); break; }
        case 'box': s += `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${FLOOR - pr.y}" rx="1.5" fill="${C.dim}"/>`; break;
        case 'pull': s += line([pr.x1, pr.y], [pr.x2, pr.y], 2.5, C.eq2) + line([pr.x1, pr.y], [pr.x1, FLOOR], 2, C.dim) + line([pr.x2, pr.y], [pr.x2, FLOOR], 2, C.dim); break;
        case 'bar': { const p = at(pr.at); s += circ(p, pr.r || 7.5, 'none', `stroke="${C.eq}" stroke-width="2.6"`) + circ(p, 1.6, C.eq); break; }
        case 'db': { const p = at(pr.at); s += line([p[0] - 4.5, p[1]], [p[0] + 4.5, p[1]], 2, C.eq) + circ([p[0] - 4.5, p[1]], 2.6, C.eq) + circ([p[0] + 4.5, p[1]], 2.6, C.eq); break; }
        case 'kb': { const p = at(pr.at); s += circ([p[0], p[1] + 5], 4.2, C.eq) + `<path d="M${p[0] - 2.5} ${p[1] + 2} Q${p[0]} ${p[1] - 3} ${p[0] + 2.5} ${p[1] + 2}" stroke="${C.eq}" stroke-width="1.6" fill="none"/>`; break; }
        case 'mb': { const p = at(pr.at); s += circ(p, pr.r || 5, C.eq); break; }
        case 'plate': { const p = at(pr.at); s += circ(p, 5, 'none', `stroke="${C.eq}" stroke-width="2.4"`); break; }
        case 'cable': { const p = at(pr.to); s += circ(pr.from, 2.4, C.eq2) + line(pr.from, p, 1, C.eq2) + (pr.handle ? line([p[0], p[1] - 2.5], [p[0], p[1] + 2.5], 2, C.eq) : ''); if (pr.post) s += line([pr.from[0], 6], [pr.from[0], FLOOR], 3, C.dim); break; }
        case 'band': { const p = at(pr.to); s += line(pr.from, p, 1.4, C.eq, 'stroke-dasharray="2.5 2"') + circ(pr.from, 1.8, C.eq2); break; }
        case 'lm': { const p = at(pr.at); const dx = p[0] - pr.anchor[0], dy = p[1] - pr.anchor[1], n = Math.hypot(dx, dy); const end = [p[0] + dx / n * 7, p[1] + dy / n * 7]; s += line(pr.anchor, end, 2.2, C.eq2) + circ(end, 5, 'none', `stroke="${C.eq}" stroke-width="2.4"`); break; }
        case 'seat': s += `<rect x="${pr.x}" y="${pr.y}" width="${pr.w}" height="4" rx="1.5" fill="${C.dim}"/>` + line([pr.x + pr.w / 2, pr.y + 4], [pr.x + pr.w / 2, FLOOR], 3, C.dim) + (pr.back ? line([pr.x + (pr.backX ?? 0), pr.y], [pr.x + (pr.backX ?? 0) + (pr.backDx ?? -6), pr.y - pr.back], 4, C.dim) : ''); break;
        case 'roller': { const p = at(pr.at); s += circ(p, 3.2, C.eq2); break; }
        case 'sled': s += `<path d="M${pr.x} ${pr.y} l${pr.w} ${-pr.w * 0.8}" stroke="${C.dim}" stroke-width="5" stroke-linecap="round"/>`; break;
        case 'rope': { const a = o.W, b = o.W2 || o.W; const top = phase < 0.5; s += `<path d="M${a[0]} ${a[1]} Q${a[0] + (top ? -2 : 4)} ${top ? o.H[1] - 22 : FLOOR + 6} ${b[0] + 2} ${b[1]}" stroke="${C.eq}" stroke-width="1.2" fill="none"/>`; break; }
        case 'hoop': s += line([pr.x, pr.y], [pr.x + 9, pr.y], 2, C.eq) + line([pr.x + 9, pr.y - 10], [pr.x + 9, FLOOR], 2, C.dim); break;
        case 'cone': s += `<path d="M${pr.x - 3} ${FLOOR} L${pr.x} ${FLOOR - 7} L${pr.x + 3} ${FLOOR}Z" fill="${C.eq}"/>`; break;
        case 'arrow': { const [a, b] = pr.pts; s += line(a, b, 1.3, C.eq, 'stroke-dasharray="2 2" opacity=".8"') + circ(b, 1.6, C.eq, 'opacity=".8"'); break; }
        case 'wheel': { const p = at(pr.at); s += circ(p, 4.5, 'none', `stroke="${C.eq}" stroke-width="2.4"`); break; }
        case 'line': s += line(pr.a, pr.b, pr.w || 3, C.dim); break;
      }
    }
    return s;
  }
  function drawFrame(def, k, phase) {
    const p = mix(def.A, def.B || def.A, k);
    const o = solve(p);
    const before = props((def.props || []).filter(x => !x.front), o, phase);
    const after = props((def.props || []).filter(x => x.front), o, phase);
    let s = line([2, FLOOR + 2.5], [118, FLOOR + 2.5], 1.2, '#2e3340') + before;
    if (o.K2) s += line(o.P, o.K2, 4.2, C.back) + line(o.K2, o.A2, 4, C.back) + line(o.A2, o.T2, 3.2, C.back);
    if (o.E2) s += line(o.S, o.E2, 3.6, C.back) + line(o.E2, o.W2, 3.4, C.back);
    s += line(o.P, o.S, 6, C.body) + line(o.S, add(o.S, v(p.hd ?? p.t, L.neck)), 3.5, C.body) + circ(o.H, L.head, C.body);
    s += line(o.P, o.K, 4.8, C.body) + line(o.K, o.A, 4.4, C.body) + line(o.A, o.T, 3.4, C.body);
    s += line(o.S, o.E, 4, C.body) + line(o.E, o.W, 3.6, C.body);
    return s + after;
  }
  const ease = x => 0.5 - Math.cos(x * Math.PI) / 2;
  function svg(name, cls = '', k = 0.5) {
    const def = DEFS[name]; if (!def) return '';
    return `<svg class="${cls}" viewBox="0 -14 120 114" data-fig="${encodeURIComponent(name)}">${drawFrame(def, def.B ? k : 0, k)}</svg>`;
  }
  let raf = null;
  function animate(root = document) {
    cancelAnimationFrame(raf);
    const els = [...root.querySelectorAll('svg[data-fig].anim')];
    if (!els.length) return;
    const t0 = performance.now();
    const step = now => {
      for (const el of els) {
        if (!el.isConnected) continue;
        const def = DEFS[decodeURIComponent(el.dataset.fig)]; if (!def || !def.B) continue;
        const per = (def.dur || 2.6) * 1000; const ph = ((now - t0) % per) / per;
        let k;
        if (def.hold) k = ph < 0.35 ? ease(ph / 0.35) : ph < 0.55 ? 1 : ph < 0.9 ? 1 - ease((ph - 0.55) / 0.35) : 0;
        else k = ph < 0.5 ? ease(ph * 2) : 1 - ease((ph - 0.5) * 2);
        el.innerHTML = drawFrame(def, k, ph);
      }
      if (els.some(e => e.isConnected)) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // ---------- Poses de base ----------
  const ST = { root: 'A', at: [56, FLOOR], t: 180, th: 0, sh: 0, ft: 90, ua: 0, fa: 0 };
  const P = (base, o) => ({ ...base, ...o });
  const lieBack = (o) => P({ root: 'P', at: [62, 70], t: -90, hd: -90, th: 70, sh: 0, ft: 90, ua: 180, fa: 180 }, o);
  const DEFS = {};
  const D = (names, A, B, props, opts = {}) => { for (const n of [].concat(names)) DEFS[n] = { A, B, props, ...opts }; };

  // Poussée horizontale
  D('Développé couché', lieBack({ ua: 178, fa: 178 }), lieBack({ ua: 25, fa: 172 }), [{ type: 'bench', x1: 22, x2: 66, y: 72 }, { type: 'bar', at: 'W', front: 1 }]);
  D('Développé couché haltères', lieBack({ ua: 175, fa: 180 }), lieBack({ ua: 30, fa: 168 }), [{ type: 'bench', x1: 22, x2: 66, y: 72 }, { type: 'db', at: 'W', front: 1 }]);
  const incl = o => P({ root: 'P', at: [62, 66], t: -132, hd: -150, th: 80, sh: 5, ft: 90 }, o);
  D('Développé incliné', incl({ ua: 168, fa: 168 }), incl({ ua: 30, fa: 160 }), [{ type: 'pad', a: 'P', b: 'S', off: [-2.5, 4] }, { type: 'seat', x: 54, y: 68, w: 14 }, { type: 'bar', at: 'W', front: 1 }]);
  D('Développé incliné haltères', incl({ ua: 165, fa: 175 }), incl({ ua: 35, fa: 160 }), [{ type: 'pad', a: 'P', b: 'S', off: [-2.5, 4] }, { type: 'seat', x: 54, y: 68, w: 14 }, { type: 'db', at: 'W', front: 1 }]);
  D('Écarté haltères', lieBack({ ua: 178, fa: 178 }), lieBack({ ua: 95, fa: 120, ua2: -95, fa2: -120 }), [{ type: 'bench', x1: 22, x2: 66, y: 72 }, { type: 'db', at: 'W', front: 1 }]);
  const plank = o => P({ root: 'A', at: [100, FLOOR - 6], t: -112, hd: -105, th: 70, sh: 70, ft: 10 }, o);
  D('Pompes', plank({ ua: 0, fa: 0 }), plank({ t: -99, hd: -95, th: 81, sh: 81, ua: 60, fa: -30 }), []);
  D('Dips', P(ST, { root: 'W', at: [58, 46], t: 176, th: 10, sh: -70, ft: 20, ua: 0, fa: 0 }), P(ST, { root: 'W', at: [58, 46], t: 160, th: 20, sh: -60, ft: 30, ua: -75, fa: 5 }), [{ type: 'line', a: [48, 48], b: [72, 48], w: 3 }, { type: 'line', a: [70, 48], b: [70, 94], w: 2.5 }]);

  // Tirage
  const hang = o => P({ root: 'W', at: [58, 12], t: 180, th: 8, sh: -20, ft: 70, ua: 178, fa: 178 }, o);
  D('Tractions', hang({}), hang({ ua: -40, fa: 170, th: 15, sh: -25 }), [{ type: 'pull', x1: 30, x2: 86, y: 11 }]);
  D('Inverted row', P({ root: 'A', at: [100, FLOOR], t: -112, hd: -112, th: 68, sh: 68, ft: 170, ua: 170, fa: 170 }), P({ root: 'A', at: [100, FLOOR], t: -140, hd: -120, th: 45, sh: 45, ft: 170, ua: 30, fa: 170 }), [{ type: 'pull', x1: 14, x2: 50, y: 42 }]);
  D('Tirage vertical', P({ root: 'P', at: [55, 66], t: 185, th: 90, sh: 5, ua: 175, fa: 175 }), P({ root: 'P', at: [55, 66], t: 195, th: 90, sh: 5, ua: -30, fa: 165 }), [{ type: 'seat', x: 46, y: 68, w: 18 }, { type: 'cable', from: [60, 4], to: 'W', handle: 1 }, { type: 'roller', at: [66, 62] }]);
  const hinge = o => P(ST, { t: 118, th: -12, sh: 8, ua: 0, fa: 0, ...o });
  D('Rowing barre', hinge({}), hinge({ ua: -45, fa: 30 }), [{ type: 'bar', at: 'W', front: 1 }]);
  D('Rowing haltère', P(ST, { at: [36, FLOOR], t: 100, hd: 105, th: -8, sh: 8, th2: 15, sh2: 0, ua2: 5, fa2: 5, ua: 0, fa: 0 }), P(ST, { at: [36, FLOOR], t: 100, hd: 105, th: -8, sh: 8, th2: 15, sh2: 0, ua2: 5, fa2: 5, ua: -60, fa: 15 }), [{ type: 'bench', x1: 62, x2: 98, y: 68 }, { type: 'db', at: 'W', front: 1 }]);
  D('Tirage horizontal', P({ root: 'P', at: [45, 78], t: 165, th: 90, sh: 75, ft: 160, ua: 90, fa: 90 }), P({ root: 'P', at: [45, 78], t: 182, th: 90, sh: 75, ft: 160, ua: -50, fa: 75 }), [{ type: 'seat', x: 34, y: 80, w: 20 }, { type: 'cable', from: [104, 76], to: 'W', handle: 1 }, { type: 'line', a: [92, 80], b: [96, 92], w: 3 }]);
  D('Face pull', P(ST, { ua: 92, fa: 92 }), P(ST, { ua: -60, fa: 165 }), [{ type: 'cable', from: [104, 42], to: 'W', handle: 1, post: 1 }]);

  // Épaules / bras
  D('Développé militaire', P(ST, { ua: -30, fa: 170 }), P(ST, { ua: 178, fa: 178 }), [{ type: 'bar', at: 'W', front: 1 }]);
  D('Développé épaules haltères', P({ root: 'P', at: [55, 66], t: 180, th: 90, sh: 5, ua: -60, fa: 175 }), P({ root: 'P', at: [55, 66], t: 180, th: 90, sh: 5, ua: 175, fa: 178 }), [{ type: 'seat', x: 44, y: 68, w: 18, back: 26, backX: 1, backDx: -2 }, { type: 'db', at: 'W', front: 1 }]);
  D('Élévations latérales', P(ST, { ua: 4, fa: 6 }), P(ST, { ua: 88, fa: 92 }), [{ type: 'db', at: 'W', front: 1 }]);
  D('Élévation latérale iso 90°', P(ST, { ua: 88, fa: 90 }), P(ST, { ua: 90, fa: 92 }), [{ type: 'band', from: [57, FLOOR], to: 'W', front: 1 }], { dur: 1.2 });
  D('Landmine press', P(ST, { at: [50, FLOOR], t: 170, th: 0, sh: 3, ua: -10, fa: 165 }), P(ST, { at: [50, FLOOR], t: 170, th: 0, sh: 3, ua: 140, fa: 140 }), [{ type: 'lm', anchor: [6, FLOOR], at: 'W', front: 1 }]);
  D('Curl barre', P(ST, { ua: 3, fa: 3 }), P(ST, { ua: 8, fa: 165 }), [{ type: 'bar', at: 'W', front: 1, r: 6 }]);
  D(['Curl haltères', 'Curl marteau'], P(ST, { ua: 3, fa: 3 }), P(ST, { ua: 8, fa: 165 }), [{ type: 'db', at: 'W', front: 1 }]);
  D('Extension triceps poulie', P(ST, { t: 172, ua: 8, fa: 150 }), P(ST, { t: 172, ua: 8, fa: 8 }), [{ type: 'cable', from: [72, 6], to: 'W', handle: 1, post: 1 }]);
  D('Barre au front', lieBack({ ua: 165, fa: 165 }), lieBack({ ua: 150, fa: -80 }), [{ type: 'bench', x1: 22, x2: 66, y: 72 }, { type: 'bar', at: 'W', front: 1, r: 6 }]);

  // Jambes
  const sqTop = o => P(ST, { ua: -40, fa: 150, ...o });
  const sqBot = o => P(ST, { t: 142, th: 98, sh: -28, ua: -10, fa: 130, ...o });
  D('Squat', sqTop({}), sqBot({}), [{ type: 'bar', at: 'S', off: [-2, -2], front: 1 }]);
  D('Front squat', sqTop({ ua: 95, fa: -95 }), sqBot({ t: 160, th: 102, sh: -32, ua: 110, fa: -80 }), [{ type: 'bar', at: 'S', off: [4, 0], front: 1 }]);
  D('Goblet squat', sqTop({ ua: 40, fa: 175 }), sqBot({ t: 158, th: 102, sh: -32, ua: 70, fa: 170 }), [{ type: 'kb', at: 'W', off: [0, -4], front: 1 }]);
  D('Squat bulgare', P({ root: 'A', at: [66, FLOOR], t: 175, th: 8, sh: 0, th2: -20, sh2: 40, ft2: -170, ua: 0, fa: 0 }), P({ root: 'A', at: [66, FLOOR], t: 165, th: 85, sh: -15, th2: -25, sh2: -100, ft2: -170, ua: 0, fa: 0 }), [{ type: 'bench', x1: 18, x2: 38, y: 68 }, { type: 'db', at: 'W', front: 1 }]);
  D('Fentes', P({ ...ST, at: [64, FLOOR], th2: 0, sh2: 0 }), P({ root: 'A', at: [72, FLOOR], t: 178, th: 85, sh: 0, th2: -28, sh2: -95, ft2: 150, ua: 0, fa: 0 }), [{ type: 'db', at: 'W', front: 1 }]);
  D('Step-up', P({ root: 'A', at: [70, 72], t: 165, th: 95, sh: -10, th2: 5, sh2: 0, ua: 0, fa: 0, ft2: 90 }), P({ root: 'A', at: [70, 72], t: 180, th: 0, sh: 0, th2: 75, sh2: -40, ft2: 60, ua: 0, fa: 0 }), [{ type: 'box', x: 60, y: 72, w: 30 }, { type: 'db', at: 'W', front: 1 }]);
  D('Presse à cuisses', P({ root: 'P', at: [38, 74], t: -128, hd: -150, th: 160, sh: 40, ft: 130, ua: 20, fa: 60 }), P({ root: 'P', at: [38, 74], t: -128, hd: -150, th: 140, sh: 135, ft: 225, ua: 20, fa: 60 }), [{ type: 'pad', a: 'P', b: 'S', off: [-1, 4] }, { type: 'sled', x: 56, y: 70, w: 22 }, { type: 'line', a: [30, 78], b: [44, 78], w: 4 }]);
  D('Leg extension', P({ root: 'P', at: [50, 66], t: 185, th: 90, sh: 5, ua: 15, fa: 30 }), P({ root: 'P', at: [50, 66], t: 185, th: 90, sh: 85, ft: 175, ua: 15, fa: 30 }), [{ type: 'seat', x: 40, y: 68, w: 26, back: 26, backX: 1, backDx: -3 }, { type: 'roller', at: 'A', off: [2, 2], front: 1 }]);
  D('Soulevé de terre', P(ST, { t: 128, th: 60, sh: -22, ua: 0, fa: 0 }), P(ST, { t: 180, ua: 2, fa: 2 }), [{ type: 'bar', at: 'W', off: [0, 1], front: 1 }]);
  D(['Soulevé de terre roumain'], P(ST, { ua: 2, fa: 2 }), hinge({ t: 105, th: -14, sh: 10, ua: 0, fa: 0 }), [{ type: 'bar', at: 'W', front: 1 }]);
  D('Trap bar deadlift', P(ST, { t: 140, th: 75, sh: -25, ua: 0, fa: 0 }), P(ST, { ua: 0, fa: 0 }), [{ type: 'bar', at: 'W', front: 1 }]);
  D('Leg curl', P({ root: 'P', at: [48, 72], t: -95, hd: -90, th: 95, sh: 92, ft: 0, ua: -150, fa: 170 }), P({ root: 'P', at: [48, 72], t: -95, hd: -90, th: 95, sh: -165, ft: 115, ua: -150, fa: 170 }), [{ type: 'bench', x1: 14, x2: 74, y: 75 }, { type: 'roller', at: 'A', off: [0, -3], front: 1 }]);
  D(['Nordic hamstring'], P({ root: 'K', at: [62, 91], t: 180, th: 0, sh: -90, ft: -10, ua: 0, fa: 40 }), P({ root: 'K', at: [62, 91], t: 118, hd: 115, th: -62, sh: -90, ft: -10, ua: 70, fa: 90 }), [{ type: 'roller', at: 'A', off: [0, -3.5], front: 1 }], { hold: 1, dur: 3.4 });
  D('Hip thrust', P({ root: 'A', at: [92, FLOOR], t: -118, hd: -100, th: 118, sh: 10, ua: 70, fa: 100 }), P({ root: 'A', at: [92, FLOOR], t: -92, hd: -60, th: 90, sh: 0, ua: 88, fa: 95 }), [{ type: 'bench', x1: 22, x2: 44, y: 68 }, { type: 'bar', at: 'P', off: [0, -6], front: 1, r: 7 }]);
  D(['Mollets debout'], P(ST, {}), P(ST, { at: [58, FLOOR - 5], ft: 140 }), [{ type: 'line', a: [62, FLOOR], b: [72, FLOOR], w: 3 }]);
  D(['Mollets unilatéral'], P(ST, { th2: 40, sh2: -50, ft2: 70 }), P(ST, { at: [58, FLOOR - 5], ft: 140, th2: 40, sh2: -50, ft2: 70 }), [{ type: 'db', at: 'W', front: 1 }]);

  // Gainage / core
  const forearm = o => P({ root: 'A', at: [100, FLOOR - 6], t: -98, hd: -96, th: 82, sh: 82, ft: 10, ua: 0, fa: -90 }, o);
  D('Gainage', forearm({}), null, []);
  D('Gainage latéral', P({ root: 'A', at: [100, FLOOR - 2], t: -100, hd: -98, th: 80, sh: 80, ft: 90, ua: 0, fa: -90, ua2: 120, fa2: 130 }), P({ root: 'A', at: [100, FLOOR - 2], t: -100, hd: -98, th: 80, sh: 80, ft: 90, ua: 0, fa: -90, ua2: 180, fa2: 180 }), []);
  D('Copenhagen plank', P({ root: 'A', at: [98, 70], t: -84, hd: -84, th: 96, sh: 96, ft: 90, ua: 0, fa: -90, th2: 140, sh2: 160, ft2: 90 }), P({ root: 'A', at: [98, 70], t: -88, hd: -88, th: 92, sh: 92, ft: 90, ua: 0, fa: -90, th2: 140, sh2: 160, ft2: 90 }), [{ type: 'bench', x1: 90, x2: 114, y: 72 }], { dur: 1.6 });
  D('Pallof press', P(ST, { ua: 30, fa: 100 }), P(ST, { ua: 90, fa: 90 }), [{ type: 'cable', from: [10, 52], to: 'W', handle: 1, post: 1 }]);
  D('Relevés de jambes', hang({ th: 0, sh: 0 }), hang({ th: 95, sh: 90 }), [{ type: 'pull', x1: 30, x2: 86, y: 11 }]);
  D('Dead bug', P({ root: 'P', at: [66, 89], t: -90, hd: -90, th: 180, sh: 90, ft: 180, ua: 180, fa: 180, th2: 180, sh2: 90, ft2: 180, ua2: 180, fa2: 180 }), P({ root: 'P', at: [66, 89], t: -90, hd: -90, th: 92, sh: 90, ft: 90, ua: -95, fa: -95, th2: 180, sh2: 90, ft2: 180, ua2: 180, fa2: 180 }), []);
  D('Ab wheel', P({ root: 'K', at: [40, 91], t: 150, hd: 140, th: -20, sh: -90, ft: -10, ua: 0, fa: 0 }), P({ root: 'K', at: [40, 91], t: 97, hd: 97, th: -85, sh: -90, ft: -10, ua: 96, fa: 96 }), [{ type: 'wheel', at: 'W', off: [0, 1], front: 1 }]);
  D('Bûcheron', P(ST, { at: [52, FLOOR], t: 175, ua: -35, fa: -30, th: 5, sh: -5 }), P(ST, { at: [52, FLOOR], t: 175, ua: 140, fa: 140 }), [{ type: 'cable', from: [14, 86], to: 'W', handle: 1, post: 0 }]);

  // Corps entier
  D('Farmer walk', P({ ...ST, th: -15, sh: -5, th2: 20, sh2: 5, ua: 0, fa: 0 }), P({ ...ST, th: 20, sh: 5, th2: -15, sh2: -5, ua: 0, fa: 0 }), [{ type: 'kb', at: 'W', off: [0, -2], front: 1 }], { dur: 1.2 });
  D('Kettlebell swing', P(ST, { t: 118, th: 25, sh: -18, ua: -20, fa: -25 }), P(ST, { ua: 90, fa: 92 }), [{ type: 'kb', at: 'W', off: [0, -2], front: 1 }], { dur: 1.6 });
  D('Power clean', P(ST, { t: 130, th: 55, sh: -20, ua: 0, fa: 0 }), P(ST, { at: [56, FLOOR], t: 175, th: 30, sh: -25, ua: 70, fa: -110 }), [{ type: 'bar', at: 'W', front: 1 }]);

  // Pliométrie
  const crouch = o => P(ST, { t: 140, th: 80, sh: -25, ua: -45, fa: -30, ...o });
  D('Box jump', crouch({ at: [40, FLOOR] }), P(ST, { at: [72, 68], t: 155, th: 85, sh: -20, ua: 60, fa: 80 }), [{ type: 'box', x: 60, y: 68, w: 30 }]);
  D(['Squat jump', 'Countermovement jump'], crouch({}), P(ST, { at: [56, 74], ft: 175, ua: 178, fa: 178 }), [], { dur: 1.6 });
  D('Depth jump', P(ST, { at: [28, 68] }), crouch({ at: [56, FLOOR] }), [{ type: 'box', x: 14, y: 68, w: 22 }], { dur: 2 });
  D('Depth drop', P(ST, { at: [28, 68], ua: -20, fa: -10 }), crouch({ at: [58, FLOOR], t: 150, th: 70, sh: -18, ua: -40, fa: 10 }), [{ type: 'box', x: 14, y: 68, w: 22 }], { dur: 2, hold: 1 });
  D('Single leg drop', P(ST, { at: [28, 68], th2: 60, sh2: -60, ft2: 60, ua: -20, fa: -10 }), P(ST, { at: [58, FLOOR], t: 152, th: 70, sh: -18, th2: 40, sh2: -50, ft2: 60, ua: -40, fa: 10 }), [{ type: 'box', x: 14, y: 68, w: 22 }], { dur: 2, hold: 1 });
  D('Broad jump', crouch({ at: [28, FLOOR] }), P(ST, { at: [86, FLOOR - 4], t: 155, th: 95, sh: -10, ua: 120, fa: 120 }), [{ type: 'arrow', pts: [[34, 70], [80, 70]] }], { dur: 1.8 });
  D('Bondissements', P(ST, { at: [36, FLOOR], t: 165, th: -25, sh: -10, th2: 90, sh2: -10, ua: 80, fa: 100, ua2: -60, fa2: -30 }), P(ST, { at: [80, FLOOR - 8], t: 165, th: 90, sh: -10, th2: -25, sh2: -60, ua: -60, fa: -30, ua2: 80, fa2: 100 }), [], { dur: 1.3 });
  D('Pogo jumps', P(ST, { ft: 120, ua: -15, fa: 20 }), P(ST, { at: [56, FLOOR - 10], ft: 125, ua: -15, fa: 20 }), [], { dur: 0.7 });
  D('Sauts latéraux', crouch({ at: [34, FLOOR], t: 155, th: 60, sh: -20 }), P(ST, { at: [80, FLOOR - 6], t: 170, th: 20, sh: -30, ua: 60, fa: 60 }), [{ type: 'arrow', pts: [[38, 60], [76, 60]] }], { dur: 1.4 });
  D('Lancer médecine-ball', crouch({ ua: 140, fa: 160 }), P(ST, { ua: 140, fa: 140, ft: 150, at: [58, FLOOR - 2] }), [{ type: 'mb', at: 'W', front: 1 }], { dur: 1.6 });
  D('Décélération', P(ST, { at: [36, FLOOR], t: 165, th: 50, sh: -15, th2: -40, sh2: -60, ua: 60, fa: 80, ua2: -60, fa2: -40 }), P(ST, { at: [68, FLOOR], t: 145, th: 85, sh: -25, th2: -30, sh2: -85, ft2: 150, ua: -40, fa: 20, ua2: 40, fa2: 60 }), [{ type: 'band', from: [6, 54], to: 'P' }], { dur: 1.6, hold: 1 });

  // Cardio / terrain
  const run1 = { root: 'A', at: [56, FLOOR], t: 165, th: 60, sh: -30, th2: -35, sh2: -80, ft2: 150, ua: -50, fa: 30, ua2: 60, fa2: 150 };
  const run2 = { root: 'A', at: [60, FLOOR], t: 165, th: -35, sh: -20, th2: 60, sh2: -30, ft2: 90, ua: 60, fa: 150, ua2: -50, fa2: 30 };
  D(['Sprint', 'Run 10"/20"'], run1, run2, [{ type: 'cone', x: 14 }, { type: 'cone', x: 104 }], { dur: 0.8 });
  D('Corde à sauter', P(ST, { ft: 120, ua: 20, fa: 80, ua2: 20, fa2: 80 }), P(ST, { at: [56, FLOOR - 7], ft: 125, ua: 20, fa: 80, ua2: 20, fa2: 80 }), [{ type: 'rope' }], { dur: 0.8 });
  D('Shoot sous fatigue', P(ST, { t: 175, th: 40, sh: -30, ua: 60, fa: 170 }), P(ST, { at: [56, FLOOR - 6], ft: 160, ua: 165, fa: 175 }), [{ type: 'mb', at: 'W', off: [0, -4], front: 1, r: 4.5 }, { type: 'hoop', x: 96, y: 22 }], { dur: 1.6 });

  return { svg, animate, has: n => !!DEFS[n], names: () => Object.keys(DEFS) };
})();
