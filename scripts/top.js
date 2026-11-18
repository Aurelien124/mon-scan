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
const W = [60,30,0,10];

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
  ["pain-de-mie","Alimentation","Pain de mie","food",["en:sandwich-breads","fr:pains-de-mie"]],
  ["madeleines","Alimentation","Madeleines et gâteaux moelleux","food",["en:madeleines","en:sponge-cakes"]],
  ["confitures","Alimentation","Confitures","food",["en:jams","en:fruit-preserves"]],
  ["compotes","Alimentation","Compotes","food",["en:compotes"]],
  ["jus-orange","Alimentation","Jus d'orange","food",["en:orange-juices"]],
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
  ["thon","Alimentation","Thon en conserve","food",["en:canned-tunas"]],
  ["sardines","Alimentation","Sardines","food",["en:sardines"]],
  ["maquereau","Alimentation","Maquereaux","food",["en:mackerels"]],
  ["poisson-pane","Alimentation","Poissons panés","food",["en:breaded-fish"]],
  ["glaces","Alimentation","Glaces","food",["en:ice-creams"]],
  ["sodas","Alimentation","Sodas","food",["en:sodas"]],
  ["barres","Alimentation","Barres de céréales","food",["en:cereal-bars"]],
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
const FFIELDS = "code,product_name,product_name_fr,brands,image_front_small_url,nutriscore_grade,nova_group,additives_tags,labels_tags,categories_tags";
const CFIELDS = "code,product_name,product_name_fr,brands,image_front_small_url,ingredients_text,ingredients_text_fr,ingredients_text_en,categories_tags,product_type";
const UA = "MonScan/1.0 (https://github.com/Aurelien124/mon-scan)";
const ORGANIC = ["en:organic","en:eu-organic","fr:ab-agriculture-biologique"];
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function search(base, tag, food){
  const url = BASE[base]+"/api/v2/search?categories_tags="+encodeURIComponent(tag)+"&countries_tags=en:france&page_size=100&sort_by=unique_scans_n&fields="+(food?FFIELDS:CFIELDS);
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
  for(const [id,g,t,base,tags] of FAM){
    const food = base==="food";
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
      continue;
    }
    const seen = new Set(), items = [];
    for(const p of prods){
      const name = p.product_name_fr || p.product_name;
      if(!p.code || !name || seen.has(p.code)) continue;
      let s, it;
      let k = 0;
      if(food){
        if(!/^[a-e]$/.test(String(p.nutriscore_grade||""))) continue; // note complète seulement
        const r = analyse(p, W); s = r.score; k = r.adds.length;
        it = {c:p.code, n:name, b:p.brands||"", i:p.image_front_small_url||"", g:p.nutriscore_grade, nv:Number(p.nova_group)||0,
              ad:(p.additives_tags||[]).map(x=>x.replace(/^en:/,"")), bio:(p.labels_tags||[]).some(x=>ORGANIC.includes(x))?1:0};
      }else{
        p._src = base;
        const r = analyseCosmetic(p, {lft:true, lftScore:true});
        if(!r.toks.length || r.doubtful) continue; // liste d'ingrédients absente ou mal lue
        s = r.score; k = r.offHits.length+r.lftHits.length;
        it = {c:p.code, n:name, b:p.brands||"", i:p.image_front_small_url||"", inci:vm.runInContext("inciText", ctx)(p)};
      }
      if(s==null) continue;
      seen.add(p.code); it.s = s; it._k = k; items.push(it);
    }
    items.sort((x,y)=>y.s-x.s || x._k-y._k);
    items.forEach(it=>delete it._k);
    console.log(id.padEnd(16), used.padEnd(34), String(prods.length).padStart(3), "lus,", String(items.length).padStart(3), "notés, meilleur", items[0]?items[0].s:"-");
    out.fam.push({id, g, t, src:base, tag:used, n:items.length, p:items.slice(0,15)});
  }
  fs.writeFileSync(path.join(ROOT,"top.json"), JSON.stringify(out));
  console.log("top.json :", out.fam.length, "familles,", Math.round(fs.statSync(path.join(ROOT,"top.json")).size/1024), "Ko");
})();
