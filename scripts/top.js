// Calcule les Top 10 par famille de produits et écrit top.json.
// Lancé chaque semaine par .github/workflows/top.yml (les serveurs GitHub peuvent joindre les bases Open Facts).
// Les notes sont calculées avec le moteur de l'appli (index.html, kb.js, kbc.js, cosmo.js), réglages par défaut.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");

/* ---------- Moteur de l'appli ---------- */
const ctx = vm.createContext({console});
for(const f of ["kb.js","kbc.js","cosmo.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT,f),"utf8"), ctx, {filename:f});
const html = fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const a = html.indexOf('"use strict";\n/* ---------- Données de référence');
const b = html.indexOf("/* ---------- Affichage produit");
if(a<0 || b<0) throw new Error("Moteur introuvable dans index.html");
vm.runInContext(html.slice(a,b), ctx, {filename:"index.html"});
const analyse = vm.runInContext("analyse", ctx);
const analyseCosmetic = vm.runInContext("analyseCosmetic", ctx);
const findFamily = vm.runInContext("findFamily", ctx), familyCheck = vm.runInContext("familyCheck", ctx);
// Bonus de départage tiré des règles de la fiche famille (kb.js) : bon +1, à surveiller -1, à limiter -2.
function famBonus(p, adds){
  const fam = findFamily(p); if(!fam) return 0;
  return familyCheck(p, fam, adds).hits.reduce((t,h)=>t+(h.t==="good"?1:h.t==="warn"?-1:h.t==="bad"?-2:0),0);
}
const W = [60,30,0,10];
const CFAM = vm.runInContext("CFAM", ctx), findCFam = vm.runInContext("findCFam", ctx);
const BRAND_CACHE = {};
const slug = x => String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
// Famille du Top -> famille de produits de kbc.js : ses marques recommandées par La Famille Tortue sont ajoutées aux candidats,
// même si elles ne sont pas parmi les plus scannées. PLUS : marques ajoutées à la demande de l'utilisateur.
const CMAP = {douche:"douche", savon:"douche", shampoing:"shampoing", "apres-shampoing":"shampoing", deo:"deo", dentifrice:"dentifrice",
  solaire:"solaire", visage:"visage", corps:"corps", mains:"corps", demaq:"demaq", lessive:"lessive", "lave-vaisselle":"vaisselle", vaisselle:"vaisselle", nettoyant:"nettoyant"};
const PLUS = {dentifrice:["L'Arbre Vert"], douche:["L'Arbre Vert"], lessive:["L'Arbre Vert"], vaisselle:["L'Arbre Vert"]};
// Marques cherchées dans toutes les familles cosmétiques, et dont tous les produits vont dans l'index de recherche.
const PLUS_COSMETO = ["Aroma-Zone"];
// Nom qui désigne clairement une famille : un produit est écarté si son nom désigne une AUTRE famille que la sienne
// (ex. « gel douche » rangé en shampoing). Un nom neutre (« Elmex anti-caries ») est gardé.
const NAMERE = {
  douche:/gel douche|creme de douche|douche|shower/, savon:/\bsavon|\bsoap/, shampoing:/shamp/, "apres-shampoing":/apres[- ]?shamp|conditioner|demelant/,
  deo:/deodor|\bdeo\b|anti-?transpir/, dentifrice:/dentifr|toothpaste/, solaire:/solaire|\bspf\b|sunscreen/, mains:/creme (pour les )?mains|hand cream/,
  levres:/levres|lip balm|lip care/, lessive:/lessive|laundry/, vaisselle:/liquide vaisselle|vaisselle main/, "lave-vaisselle":/lave[- ]?vaisselle|dishwasher/
};
// Familles proches : leurs mots ne disqualifient pas (un gel douche peut s'appeler « savon », un après-shampoing « shampoing »).
const NEAR = {douche:["savon","shampoing"], shampoing:["apres-shampoing"], "apres-shampoing":["shampoing"], vaisselle:["lave-vaisselle"], "lave-vaisselle":["vaisselle"]};
function wrongFamily(id, txt){
  if(NAMERE[id] && NAMERE[id].test(txt)) return false;
  return Object.keys(NAMERE).some(o=>o!==id && !(NEAR[id]||[]).includes(o) && NAMERE[o].test(txt));
}
// Aliments : mot obligatoire dans le nom pour les familles au nom sans ambiguïté.
const MUST = {
  ketchup:/ketch|heinz.*(zero|sel|sucre)/, mayonnaise:/mayo/, moutarde:/moutard|mustard|dijon/, pesto:/pesto/, houmous:/houmous|hummus|humus|houmos/,
  "pain-epices":/epice|gingerbread/, lardons:/lardon|allumette/, pizzas:/pizz/, sardines:/sardin/, maquereau:/maquer|mackerel/,
  thon:/thon|tuna/, "saumon-fume":/saumon|salmon|lachs/, "jambon-cru":/jambon|prosciutto|serrano|bayonne|parme|jamon|speck|coppa/,
  oeufs:/oeuf|egg/, riz:/\briz\b|rice|basmati|risotto/, chips:/chip/, beurre:/beurre|butter/, brioches:/brioch|gache/,
  "jus-orange":/jus|juice|nectar|orange/, "jus-pomme":/jus|juice|pomme|apple/,
  "fromage-blanc":/fromage blanc|faisselle|fromages? frais|skyr|quark|fromage battu/,
  "huile-olive":/olive/, "foie-gras":/foie gras/, "herbes-provence":/provence/, poivre:/poivre|pepper/, cannelle:/cannelle|cinnamon/, curry:/curry|cari/, "sauce-tomate":/tomat|bolognaise|arrabbiata|basilic|napolitaine|sugo|passata|provencal/
};
const nrm = x => String(x||"").toLowerCase().replace(/œ/g,"oe").replace(/æ/g,"ae").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
// Vendu en France : fiche marquée France et scannée en France (étiquette de popularité Open Facts « …-fr-scans-… »).
const inFrance = p => (p.countries_tags||[]).includes("en:france") && (p.popularity_tags||[]).some(t=>/-fr-scans-/.test(t));
// Note affichée en tête de la famille dans l'onglet Top 10.
const NOTE = {douche:"Selon La Famille Tortue, presque tous les gels douche du commerce contiennent un ingrédient qu'elle évite (bétaïnes, sulfates, parfum) : d'où des notes plafonnées à 49. Elle conseille plutôt un savon saponifié à froid : voir la famille « Savons »."};

/* ---------- Familles ---------- */
// [id, groupe, titre, base (food|beauty|product), étiquettes de catégorie Open Facts]
const FAM = [
  ["biscuits-choco","Alimentation","Biscuits au chocolat","food",["en:chocolate-biscuits"]],
  ["biscuits-nature","Alimentation","Biscuits secs nature","food",["en:dry-biscuits"]],
  ["chocolat-noir","Alimentation","Chocolat noir","food",["en:dark-chocolates"]],
  ["chocolat-lait","Alimentation","Chocolat au lait","food",["en:milk-chocolates"]],
  ["pate-tartiner","Alimentation","Pâtes à tartiner","food",["en:cocoa-and-hazelnuts-spreads","en:sweet-spreads"]],
  ["cereales","Alimentation","Céréales du petit-déjeuner","food",["en:breakfast-cereals","en:chocolate-cereals"]],
  ["muesli","Alimentation","Mueslis et flocons","food",["en:mueslis","en:rolled-oats"]],
  ["biscottes","Alimentation","Biscottes","food",["en:rusks"]],
  ["brioches","Alimentation","Brioches","food",["en:brioches"]],
  ["pain-epices","Alimentation","Pain d'épices","food",["en:gingerbreads","fr:pains-d-epices","en:gingerbread"]],
  ["pain-de-mie","Alimentation","Pain de mie","food",["en:sandwich-breads","fr:pains-de-mie"]],
  ["madeleines","Alimentation","Madeleines et gâteaux moelleux","food",["en:madeleines","en:sponge-cakes"]],
  ["confitures","Alimentation","Confitures","food",["en:jams","en:fruit-preserves"]],
  ["compotes","Alimentation","Compotes","food",["en:compotes"]],
  ["jus-orange","Alimentation","Jus d'orange","food",["en:orange-juices"]],
  ["jus-fruits","Alimentation","Jus de fruits (tous)","food",["en:fruit-juices","en:juices-and-nectars"]],
  ["jus-pomme","Alimentation","Jus de pomme","food",["en:apple-juices"]],
  ["yaourts-nature","Alimentation","Yaourts nature","food",["en:plain-yogurts"]],
  ["yaourts-fruits","Alimentation","Yaourts aux fruits","food",["en:fruit-yogurts"]],
  ["fromage-blanc","Alimentation","Fromages blancs","food",["en:fromages-blancs-natures","en:quarks","fr:fromages-blancs","en:fresh-cheeses"]],
  ["desserts-lactes","Alimentation","Crèmes desserts","food",["en:dairy-desserts"]],
  ["lait","Alimentation","Lait","food",["en:semi-skimmed-milks","en:milks"]],
  ["beurre","Alimentation","Beurre","food",["en:butters"]],
  ["fromages-rapes","Alimentation","Fromages râpés","food",["en:grated-cheese"]],
  ["huile-olive","Alimentation","Huile d'olive","food",["en:extra-virgin-olive-oils"]],
  ["ketchup","Alimentation","Ketchup","food",["en:ketchup"]],
  ["sauce-tomate","Alimentation","Sauces tomate","food",["en:tomato-sauces"]],
  ["mayonnaise","Alimentation","Mayonnaise","food",["en:mayonnaises"]],
  ["pesto","Alimentation","Pesto","food",["en:pestos","en:pesto"]],
  ["moutarde","Alimentation","Moutarde","food",["en:mustards"]],
  ["pates","Alimentation","Pâtes","food",["en:dry-pastas","en:pastas"]],
  ["riz","Alimentation","Riz","food",["en:rices"]],
  ["legumineuses","Alimentation","Lentilles, pois chiches, haricots","food",["en:legumes-and-their-products","en:pulses"]],
  ["houmous","Alimentation","Houmous","food",["en:hummus"]],
  ["soupes","Alimentation","Soupes","food",["en:soups"]],
  ["pizzas","Alimentation","Pizzas","food",["en:pizzas","en:frozen-pizzas"]],
  ["chips","Alimentation","Chips","food",["en:crisps"]],
  ["oeufs","Alimentation","Œufs","food",["en:chicken-eggs","en:eggs"]],
  ["jambon","Alimentation","Jambon blanc","food",["en:white-hams","en:cooked-hams"]],
  ["jambon-cru","Alimentation","Jambon cru","food",["en:dry-cured-hams","en:cured-hams"]],
  ["lardons","Alimentation","Lardons","food",["en:lardons"]],
  ["saucisses","Alimentation","Saucisses","food",["en:sausages"]],
  ["steak-hache","Alimentation","Steaks hachés","food",["en:ground-beef-steaks","en:ground-beef"]],
  ["poulet","Alimentation","Blanc de poulet","food",["en:chicken-breasts","en:chicken-breast-slices"]],
  ["saumon-fume","Alimentation","Saumon fumé","food",["en:smoked-salmons"]],
  ["foie-gras","Alimentation","Foie gras","food",["en:foies-gras","en:duck-foie-gras","en:foie-gras"]],
  ["thon","Alimentation","Thon en conserve","food",["en:canned-tunas"]],
  ["sardines","Alimentation","Sardines","food",["en:sardines"]],
  ["maquereau","Alimentation","Maquereaux","food",["en:mackerels"]],
  ["poisson-pane","Alimentation","Poissons panés","food",["en:breaded-fish"]],
  ["glaces","Alimentation","Glaces","food",["en:ice-creams"]],
  ["sodas","Alimentation","Sodas","food",["en:sodas"]],
  ["barres","Alimentation","Barres de céréales","food",["en:cereal-bars"]],
  ["herbes-provence","Alimentation","Herbes de Provence","food",["en:provence-herbs","fr:herbes-de-provence","en:herbes-de-provence"]],
  ["poivre","Alimentation","Poivre","food",["en:ground-black-pepper","en:black-peppers","en:peppers"]],
  ["cannelle","Alimentation","Cannelle","food",["en:ground-cinnamon","en:cinnamon"]],
  ["curry","Alimentation","Curry","food",["en:curry-powders","en:curry-powder","en:curries"]],
  ["douche","Cosmétiques","Gels douche","beauty",["en:shower-gels"]],
  ["savon","Cosmétiques","Savons","beauty",["en:soaps","en:bar-soaps"]],
  ["shampoing","Cosmétiques","Shampoings","beauty",["en:shampoos"]],
  ["apres-shampoing","Cosmétiques","Après-shampoings","beauty",["en:hair-conditioners","en:conditioners"]],
  ["deo","Cosmétiques","Déodorants","beauty",["en:deodorants"]],
  ["dentifrice","Cosmétiques","Dentifrices","beauty",["en:toothpastes"]],
  ["solaire","Cosmétiques","Crèmes solaires","beauty",["en:sunscreens","en:sun-protection"]],
  ["visage","Cosmétiques","Crèmes visage","beauty",["en:face-creams","en:moisturizers"]],
  ["corps","Cosmétiques","Laits et crèmes corps","beauty",["en:body-milks","en:body-lotions","en:body-creams"]],
  ["mains","Cosmétiques","Crèmes mains","beauty",["en:hand-creams"]],
  ["levres","Cosmétiques","Baumes à lèvres","beauty",["en:lip-balms"]],
  ["demaq","Cosmétiques","Démaquillants","beauty",["en:micellar-waters","en:make-up-removers","en:makeup-removers"]],
  ["lessive","Ménager","Lessives","product",["en:laundry-detergents"]],
  ["adoucissant","Ménager","Adoucissants","product",["en:fabric-softeners","en:fabric-conditioners","en:softeners"]],
  ["vaisselle","Ménager","Liquides vaisselle","product",["en:dishwashing-liquids","en:dish-soaps","en:washing-up-liquids","en:dishwashing-products","en:hand-dishwashing-detergents"]],
  ["lave-vaisselle","Ménager","Lave-vaisselle","product",["en:dishwasher-tablets","en:dishwasher-detergents"]],
  ["nettoyant","Ménager","Nettoyants ménagers","product",["en:all-purpose-cleaners","en:multi-purpose-cleaners","en:household-cleaners","en:cleaning-products","en:cleaners"]]
];
const BASE = {food:"https://world.openfoodfacts.org", beauty:"https://world.openbeautyfacts.org", product:"https://world.openproductsfacts.org"};
const FFIELDS = "code,product_name,product_name_fr,generic_name,generic_name_fr,brands,image_front_small_url,nutriscore_grade,nova_group,additives_tags,labels_tags,labels,categories_tags,categories,origins,quantity,ingredients_text,ingredients_text_fr,nutriments,product_type,countries_tags,popularity_tags,unique_scans_n";
const CFIELDS = "countries_tags,popularity_tags,unique_scans_n,code,product_name,product_name_fr,generic_name,generic_name_fr,categories,brands,image_front_small_url,ingredients_text,ingredients_text_fr,ingredients_text_en,categories_tags,product_type";
const UA = "MonScan/1.0 (https://github.com/Aurelien124/mon-scan)";
const ORGANIC = ["en:organic","en:eu-organic","fr:ab-agriculture-biologique"];
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function search(base, tag, food, brand){
  const url = BASE[base]+"/api/v2/search?"+(brand?"brands_tags="+encodeURIComponent(brand)+"&page_size=100":"categories_tags="+encodeURIComponent(tag)+"&countries_tags=en:france&page_size=100")+"&sort_by=unique_scans_n&fields="+(food?FFIELDS:CFIELDS);
  for(let i=0;i<4;i++){
    try{
      const r = await fetch(url, {headers:{"User-Agent":UA}, signal:AbortSignal.timeout(60000)});
      if(r.ok){ const j = await r.json(); return j.products||[]; }
      console.log("  HTTP", r.status, "nouvel essai");
    }catch(e){ console.log("  erreur", e.message, "nouvel essai"); }
    await sleep(20000);
  }
  return null;
}

(async()=>{
  const out = {date:new Date().toISOString().slice(0,10), fam:[]};
  let prev = null; try{ prev = JSON.parse(fs.readFileSync(path.join(ROOT,"top.json"),"utf8")); }catch(e){}
  // Index de recherche par nom : tous les produits notés, par famille.
  const idx = {date:out.date, fam:{}};
  let prevIdx = null; try{ prevIdx = JSON.parse(fs.readFileSync(path.join(ROOT,"search.json"),"utf8")); }catch(e){}
  const keepIdx = id => { if(prevIdx && prevIdx.fam[id]) idx.fam[id] = prevIdx.fam[id]; };
  const ONLY = (process.env.ONLY||"").split(",").map(x=>x.trim()).filter(Boolean);
  for(const [id,g,t,base,tags] of FAM){
    const food = base==="food";
    if(ONLY.length && !ONLY.includes(id)){ const old = prev && prev.fam.find(f=>f.id===id); if(old) out.fam.push(old); keepIdx(id); continue; }
    let prods = null, used = null;
    for(const tag of tags){
      const r = await search(base, tag, food); await sleep(7000);
      if(r && r.length>=5){ prods = r; used = tag; break; }
      if(r && r.length && (!prods || r.length>prods.length)){ prods = r; used = tag; }
      console.log("  ", tag, r?r.length+" produits":"échec");
    }
    if(!prods || !prods.length){
      const old = prev && prev.fam.find(f=>f.id===id);
      console.log("ÉCHEC", id, old?"(liste précédente conservée)":"");
      if(old) out.fam.push(old);
      keepIdx(id);
      continue;
    }
    if(!food){
      const cf = CFAM.find(c=>c.id===CMAP[id]);
      const brands = [...new Set([...(cf?cf.alts.map(a=>a[0]):[]), ...(PLUS[id]||[]), ...(base==="beauty"?PLUS_COSMETO:[])].map(slug))];
      for(const br of brands){
        const key = base+"/"+br;
        if(!(key in BRAND_CACHE)){ BRAND_CACHE[key] = await search(base, null, false, br); await sleep(7000); }
        const r = BRAND_CACHE[key];
        // Garder les produits de la marque qui relèvent de cette famille (catégorie ou nom).
        const mine = (r||[]).filter(x=>(x.categories_tags||[]).includes(used) || (()=>{ x._src=base; const c = findCFam(x); return c && c.id===CMAP[id] && (id!=="savon" || /savon|soap/i.test(x.product_name_fr||x.product_name||"")); })());
        const known = new Set(prods.map(x=>x.code)); let add = 0;
        for(const x of mine) if(!known.has(x.code)){ x._followed = 1; prods.push(x); add++; }
        console.log("   + marque", br, r?r.length+" produits, "+add+" ajoutés ici":"échec");
      }
    }
    const seen = new Set(), items = [];
    const nFr = prods.filter(inFrance).length;
    const strict = nFr >= 15;   // assez de produits vendus en France pour filtrer sans vider la famille
    let outFr = 0, outName = 0;
    for(const p of prods){
      const name = String(p.product_name_fr || p.product_name || "").replace(/\\(.)/g,"$1").trim();
      if(!p.code || !name || seen.has(p.code)) continue;
      if(strict && !p._followed && !inFrance(p)){ outFr++; continue; }
      const txt = nrm(name+" "+(p.generic_name_fr||""));
      if(!food && wrongFamily(id, txt)){ outName++; continue; }
      if(food && MUST[id] && !MUST[id].test(txt)){ outName++; continue; }
      let s, it;
      let k = 0;
      if(food){
        if(p.product_type && p.product_type!=="food") continue; // cosmétique ou produit ménager rangé par erreur dans la base aliments
        if(!/^[a-e]$/.test(String(p.nutriscore_grade||""))) continue; // note complète seulement
        const r = analyse(p, W); s = r.score; k = r.adds.length;
        var fk = famBonus(p, r.adds.map(x=>x.code));
        it = {fk, c:p.code, n:name, b:p.brands||"", i:p.image_front_small_url||"", g:p.nutriscore_grade, nv:Number(p.nova_group)||0,
              ad:(p.additives_tags||[]).map(x=>x.replace(/^en:/,"")), bio:(p.labels_tags||[]).some(x=>ORGANIC.includes(x))?1:0};
      }else{
        p._src = base;
        // Colorations et hennés exclus des classements (fiches parfois rangées en shampoing).
        if(/\bhenn|coloration|teinture|colorant capillaire/i.test(name+" "+(p.generic_name_fr||"")) || (findCFam(p)||{}).id==="coloration") continue;
        const r = analyseCosmetic(p, {lft:true, lftScore:true});
        if(!r.toks.length || r.doubtful) continue; // liste d'ingrédients absente ou mal lue
        s = r.score; k = r.offHits.length+r.lftHits.length;
        it = {c:p.code, n:name, b:p.brands||"", i:p.image_front_small_url||"", inci:vm.runInContext("inciText", ctx)(p)};
      }
      if(s==null) continue;
      seen.add(p.code); it.s = s; it._k = k; items.push(it);
    }
    items.sort((x,y)=>y.s-x.s || (y.fk||0)-(x.fk||0) || x._k-y._k);
    items.forEach(it=>delete it._k);
    idx.fam[id] = {src:base, l:items.map(it=>[it.c, it.n, it.b, it.s, it.i||""])};
    console.log(id.padEnd(16), used.padEnd(34), String(prods.length).padStart(3), "lus,", String(items.length).padStart(3), "notés, meilleur", items[0]?items[0].s:"-", "| vendus en France", nFr, strict?"(filtre appliqué, "+outFr+" écartés)":"(filtre non appliqué)", "| nom hors famille", outName);
    out.fam.push(Object.assign({id, g, t, src:base, tag:used, n:items.length, p:items.slice(0,15)}, NOTE[id]?{note:NOTE[id]}:{}));
  }
  // Index des marques suivies : tous leurs produits, même hors des familles du Top.
  const followed = [...new Set([...PLUS_COSMETO, ...CFAM.filter(c=>c.t!=="menager").flatMap(c=>c.alts.map(a=>a[0]))].map(slug))];
  const bl = [];
  for(const br of followed){
    const key = "beauty/"+br;
    if(!(key in BRAND_CACHE)){ BRAND_CACHE[key] = await search("beauty", null, false, br); await sleep(7000); }
    for(const p of BRAND_CACHE[key]||[]){
      const name = String(p.product_name_fr || p.product_name || "").replace(/\\(.)/g,"$1").trim();
      if(!p.code || !name) continue;
      p._src = "beauty"; const r = analyseCosmetic(p, {lft:true, lftScore:true});
      bl.push([p.code, name, p.brands||"", r.toks.length && !r.doubtful ? r.score : null, p.image_front_small_url||""]);
    }
  }
  if(bl.length) idx.fam["marques-suivies"] = {src:"beauty", l:bl}; else keepIdx("marques-suivies");
  console.log("marques suivies :", bl.length, "produits");
  fs.writeFileSync(path.join(ROOT,"top.json"), JSON.stringify(out));
  fs.writeFileSync(path.join(ROOT,"search.json"), JSON.stringify(idx));
  console.log("search.json :", Object.values(idx.fam).reduce((t,f)=>t+f.l.length,0), "produits");
  console.log("top.json :", out.fam.length, "familles,", Math.round(fs.statSync(path.join(ROOT,"top.json")).size/1024), "Ko");
})();
