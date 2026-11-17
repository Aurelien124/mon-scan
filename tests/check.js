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

// ---------- Cosmétiques et ménager (kbc.js + cosmo.js) ----------
{
  const csrc = fs.readFileSync(path.join(__dirname, "..", "kbc.js"), "utf8") + fs.readFileSync(path.join(__dirname, "..", "cosmo.js"), "utf8").replace(/if\(typeof module[\s\S]*$/, "");
  const C = new Function(csrc + "; return {INGC, CFAM, SRC, LFT_MARQUES, LFT_PRODUITS, JOURNAL_C, analyseCosmetic};")();
  const e2 = [], ids2 = new Set();
  for (const g of C.INGC) {
    const w = m => e2.push(`[kbc ${g.id || "?"}] ${m}`);
    if (!g.id || !g.nom) w("id ou nom manquant");
    if (ids2.has(g.id)) w("id en double"); ids2.add(g.id);
    if (!(g.re instanceof RegExp) || /[àâäéèêëîïôöùûüçœ]/i.test(g.re.source)) w("re doit être une regex sans accents");
    if (g.off !== null && !(Array.isArray(g.off) && [0,1,2,3].includes(g.off[0]) && g.off[1] && Array.isArray(g.off[2]) && g.off[2].length && g.off[2].every(i => C.SRC[i]))) w("off invalide (niveau 0-3, texte, sources existantes)");
    if (g.lft !== null && !(Array.isArray(g.lft) && [-1,1,2].includes(g.lft[0]) && g.lft[1] && /^https:\/\/lafamilletortue\.fr\//.test(g.lft[2]))) w("lft invalide (niveau, raison, URL lafamilletortue.fr)");
    if (!g.off && !g.lft) w("ni statut officiel ni avis La Famille Tortue");
  }
  for (const s of C.SRC) if (!s[0] || !/^https:\/\//.test(s[1])) e2.push(`[kbc SRC] source invalide : ${s[0]}`);
  for (const f of C.CFAM) {
    if (!f.id || !f.title || !["cosmetique","menager"].includes(f.t) || !(f.re instanceof RegExp)) e2.push(`[cfam ${f.id}] champs invalides`);
    if (!f.tips.length || !f.alts.length) e2.push(`[cfam ${f.id}] conseils ou alternatives vides`);
    for (const a of f.alts) if (a.length !== 4 || !/^\d{4}\/\d{2}\/\d{2}\//.test(a[2])) e2.push(`[cfam ${f.id}] alternative invalide : ${a[0]}`);
  }
  for (const m of C.LFT_MARQUES.concat(C.LFT_PRODUITS)) if (!/^\d{4}\/\d{2}\/\d{2}\//.test(m[m.length - 1])) e2.push(`[lft] chemin d'article invalide : ${m[0]}`);
  if (!C.JOURNAL_C.length || C.JOURNAL_C.some(j => !/^\d{4}-\d{2}-\d{2}$/.test(j[0]) || !j[1])) e2.push("JOURNAL_C invalide");
  // Cas témoins du moteur
  const t1 = C.analyseCosmetic({product_name: "Shampoing", categories_tags: ["en:shampoos"], ingredients_text: "Aqua, Sodium Laureth Sulfate, Cyclopentasiloxane, Perfluorohexane, Limonene"});
  if (!t1.interdit || t1.score > 10 || t1.doubtful || !t1.hits.some(h => h.g.id === "cyclo") || t1.hits.some(h => h.g.id === "silicones") || !t1.fam || t1.fam.id !== "shampoing") e2.push("moteur : cas témoin 1 incorrect");
  const t2 = C.analyseCosmetic({product_name: "Savon", ingredients_text: "Sodium Olivate, Aqua, Sodium Chloride"});
  if (t2.score !== 100 || !t2.lftOk.length) e2.push("moteur : cas témoin 2 incorrect");
  if (e2.length) { console.error(e2.join("\n")); process.exit(1); }
  console.log(`OK : ${C.INGC.length} familles d'ingrédients, ${C.CFAM.length} familles de produits, ${C.LFT_MARQUES.length} marques et ${C.LFT_PRODUITS.length} produits analysés par La Famille Tortue.`);
}
