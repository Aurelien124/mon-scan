/* ================= MOTEUR COSMÉTIQUES ET MÉNAGER =================
   Analyse une fiche Open Beauty Facts / Open Products Facts avec la base kbc.js.
   Utilisé par index.html et par tests/check.js. Ne contient pas de contenu : tout est dans kbc.js. */
const cnorm = x => String(x==null?"":x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
  .replace(/œ/g,"oe").replace(/æ/g,"ae").replace(/[’`´]/g,"'").replace(/\s+/g," ").trim();

/* Découpe une liste INCI en ingrédients (en gardant les parenthèses d'un même ingrédient). */
function splitInci(txt){
  const s = cnorm(txt).replace(/^(ingredients?|ingredienti|composition|inci)\s*[:\-]\s*/,"");
  const out = []; let cur = "", depth = 0;
  for(const ch of s){
    if(ch==="("||ch==="[") depth++;
    if(ch===")"||ch==="]") depth = Math.max(0,depth-1);
    if(depth===0 && /[,;•·]/.test(ch)){ if(cur.trim()) out.push(cur.trim()); cur=""; continue; }
    cur += ch;
  }
  if(cur.trim()) out.push(cur.trim());
  return out.map(t=>t.replace(/^[\s.*\-]+|[\s.*]+$/g,"").replace(/\*+/g,"").trim()).filter(t=>t && t.length<120);
}

/* Variantes testées pour un ingrédient : tel quel, sans parenthèses, et chaque nom entre parenthèses. */
function variants(tok){
  const v = new Set([tok]);
  const base = tok.replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g," ").replace(/\s+/g," ").trim();
  if(base) v.add(base);
  for(const m of tok.matchAll(/[\(\[]([^\)\]]+)[\)\]]/g)) for(const part of m[1].split(/[,\/]| and /)) if(part.trim()) v.add(part.trim());
  return [...v];
}

function inciText(p){ return p.ingredients_text_fr || p.ingredients_text_en || p.ingredients_text || ""; }

/* Repère les familles d'ingrédients. Renvoie la liste des correspondances, regroupées par famille. */
function matchIngredients(p){
  const toks = splitInci(inciText(p));
  const hits = new Map();
  toks.forEach((tok,pos)=>{
    const vs = variants(tok);
    const found = INGC.filter(g=>vs.some(v=>g.re.test(v)));
    const precise = found.some(g=>!g.gen);
    for(const g of found){
      if(g.gen && precise) continue;
      {
        if(!hits.has(g.id)) hits.set(g.id,{g, items:[], first:pos});
        const h = hits.get(g.id); if(!h.items.includes(tok)) h.items.push(tok);
      }
    }
  });
  return {toks, hits:[...hits.values()]};
}

/* Famille de produit d'après le nom et les catégories. */
function findCFam(p){
  const txt = cnorm([p.product_name_fr,p.product_name,p.generic_name_fr,p.generic_name,(p.categories_tags||[]).join(" "),p.categories].filter(Boolean).join(" . "));
  const pref = p._src==="product" ? CFAM.filter(f=>f.t==="menager").concat(CFAM.filter(f=>f.t!=="menager")) : CFAM;
  return pref.find(f=>f.re.test(txt)) || null;
}

function brandsOf(p){ return cnorm(p.brands||"").split(/\s*,\s*/).filter(Boolean); }
const bnorm = b => cnorm(b).replace(/[^a-z0-9+.' ]/g," ").replace(/\s+/g," ").trim();
function sameBrand(a,b){ const x=bnorm(a), y=bnorm(b); return x===y || (y.length>=4 && (x.startsWith(y+" ")||x.endsWith(" "+y))); }

function lftBrand(p){
  for(const b of brandsOf(p)){ const m = LFT_MARQUES.find(e=>sameBrand(b,e[0])); if(m) return m; }
  return null;
}
function lftProduct(p){
  const name = cnorm([p.product_name_fr,p.product_name].filter(Boolean).join(" "));
  const words = name.split(/[^a-z0-9]+/).filter(w=>w.length>2);
  for(const b of brandsOf(p)){
    for(const e of LFT_PRODUITS){
      if(!sameBrand(b,e[0])) continue;
      const need = e[1].split(/[^a-z0-9]+/).filter(w=>w.length>2);
      const ok = need.filter(w=>words.some(x=>x.startsWith(w.slice(0,Math.max(4,w.length-2))))).length;
      if(need.length && ok>=Math.min(2,need.length)) return e;
    }
  }
  return null;
}
function isPartner(marque){ return LFT_PARTENAIRES.some(x=>sameBrand(marque,x)); }

/* Note indicative de l'appli (0-100) et verdict. */
function analyseCosmetic(p, opts){
  const o = Object.assign({lft:true, lftScore:true}, opts||{});
  const {toks, hits} = matchIngredients(p);
  const offHits = hits.filter(h=>h.g.off && h.g.off[0]>=1).sort((a,b)=>b.g.off[0]-a.g.off[0]);
  const lftHits = o.lft ? hits.filter(h=>h.g.lft && h.g.lft[0]>0).sort((a,b)=>b.g.lft[0]-a.g.lft[0]||a.first-b.first) : [];
  const lftOk = o.lft ? hits.filter(h=>h.g.lft && h.g.lft[0]<0) : [];
  let score = null;
  if(toks.length){
    score = 100;
    const interdit = offHits.some(h=>h.g.off[0]===3);
    score -= Math.min(30, 10*offHits.filter(h=>h.g.off[0]===2).length);
    score -= Math.min(10, 5*offHits.filter(h=>h.g.off[0]===1).length);
    if(o.lftScore){
      score -= Math.min(45, 12*lftHits.filter(h=>h.g.lft[0]===2).length);
      score -= Math.min(15, 4*lftHits.filter(h=>h.g.lft[0]===1).length);
    }
    score = Math.max(0, score);
    if(interdit) score = Math.min(score, 10);
  }
  return {toks, hits, offHits, lftHits, lftOk, score,
          interdit: offHits.some(h=>h.g.off[0]===3),
          fam: findCFam(p), marque: lftBrand(p), produit: lftProduct(p)};
}

if(typeof module!=="undefined") module.exports = {cnorm, splitInci, variants, matchIngredients, findCFam, lftBrand, lftProduct, isPartner, analyseCosmetic};
