// Vérifie que kb.js est valide et cohérent. Lancer : node tests/check.js
const fs = require("fs"), path = require("path");
const code = fs.readFileSync(path.join(__dirname, "..", "kb.js"), "utf8");
const { KB, JOURNAL } = new Function(code + "; return {KB, JOURNAL};")();
const errs = [], ids = new Set(), TYPES = ["good", "info", "warn", "bad"];
for (const g of KB) {
  const w = m => errs.push(`[${g.id || "?"}] ${m}`);
  for (const k of ["id", "g", "title", "sub", "lead"]) if (typeof g[k] !== "string" || !g[k]) w(`champ manquant : ${k}`);
  if (ids.has(g.id)) w("id en double"); ids.add(g.id);
  if (g.verif !== 0 && g.verif !== 1) w("verif doit valoir 0 ou 1");
  if (!Array.isArray(g.cats) || !g.cats.length) w("cats vide");
  if (!(g.kw instanceof RegExp)) w("kw doit être une expression régulière");
  if (!Array.isArray(g.rank) || !g.rank.length || g.rank.some(r => r.length !== 2)) w("rank invalide");
  if (!Array.isArray(g.last) || g.last.length !== 2) w("last invalide");
  for (const k of ["pieges", "gestes"]) if (!Array.isArray(g[k]) || !g[k].length) w(`${k} vide`);
  if (!Array.isArray(g.sources) || !g.sources.length || g.sources.some(s => !/^https:\/\//.test(s[1]))) w("sources invalides (https requis)");
  if (g.verif === 1 && g.sources.length < 2) w("une fiche vérifiée doit citer au moins 2 sources");
  for (const s of g.sig || []) {
    if (!TYPES.includes(s.t)) w(`type d'indice inconnu : ${s.t}`);
    if (!s.m) w("indice sans message");
    if (!(s.re || s.ing || s.add || s.nut)) w(`indice sans condition : ${s.m}`);
    for (const k of ["re", "re2", "ing", "ing2", "not"]) if (s[k] && (!(s[k] instanceof RegExp) || /[àâäéèêëîïôöùûüçœ]/i.test(s[k].source))) w(`${k} doit être une regex sans accents : ${s.m}`);
  }
  for (const m of g.miss || []) if (!(m.un instanceof RegExp) || !m.m) w("miss invalide");
}
if (!Array.isArray(JOURNAL) || !JOURNAL.length || JOURNAL.some(j => !/^\d{4}-\d{2}-\d{2}$/.test(j[0]) || !j[1])) errs.push("JOURNAL invalide");
if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
console.log(`OK : ${KB.length} familles, ${KB.filter(g => g.verif).length} vérifiées, ${JOURNAL.length} entrée(s) au journal.`);
