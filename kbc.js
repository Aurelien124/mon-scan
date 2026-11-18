/* ================= BASE COSMÉTIQUES ET MÉNAGER =================
   Trois blocs, à faire évoluer comme kb.js (voir CLAUDE.md) :
   - INGC  : familles d'ingrédients repérées dans la liste INCI.
       re  : expression régulière testée sur CHAQUE ingrédient (texte en minuscules, sans accents).
       gen : famille générale, ignorée pour un ingrédient déjà repéré par une famille plus précise.
       off : statut officiel vérifié [niveau, texte, [index de SRC]] ou null si aucune restriction n'a été relevée.
             niveaux : 3 interdit, 2 restreint ou classé, 1 sous surveillance, 0 jugé sûr aux doses autorisées.
       lft : avis de La Famille Tortue [niveau, raison, URL de l'article] ou null.
             niveaux : 2 déconseillé, 1 à limiter, -1 apprécié.
   - CFAM  : familles de produits (gel douche, lessive…) avec les conseils et les alternatives
             recommandées par La Famille Tortue. re est testé sur le nom et les catégories du produit.
   - LFT_MARQUES / LFT_PRODUITS : analyses publiées par La Famille Tortue (lien, jamais de note de notre part).
   Les textes résument l'avis de La Famille Tortue avec nos mots ; ils ne recopient pas ses articles. */
const LFT = "https://lafamilletortue.fr/";
const LFT_LISTE = LFT + "2021/02/22/liste-dingredients-cosmetiques-non-clean/";

/* Sources officielles ou associatives consultées (index utilisés dans INGC.off) */
const SRC = [
  ["Vie-publique, loi PFAS du 27 février 2025", "https://www.vie-publique.fr/loi/293656-pfas-polluants-eternels-loi-ecologiste-du-27-fevrier-2025"],                     // 0
  ["Banque des Territoires, décrets d'application de la loi PFAS", "https://www.banquedesterritoires.fr/polluants-eternels-deux-decrets-dapplication-de-la-loi-pfas-parus"], // 1
  ["ECHA, restriction REACH des siloxanes D4, D5, D6", "https://echa.europa.eu/documents/10162/0ac1f453-ad41-4010-e837-a68273b896ca"],                                 // 2
  ["Premium Beauty News, nouvelles restrictions D4, D5, D6", "https://www.premiumbeautynews.com/fr/ue-nouvelles-restrictions-pour-les,23928"],                        // 3
  ["ANSM, phénoxyéthanol dans les produits cosmétiques", "https://ansm.sante.fr/actualites/concentration-de-phenoxyethanol-dans-les-produits-cosmetiques-information-actualisee"], // 4
  ["Que Choisir, allergènes dans les cosmétiques (2026)", "https://www.quechoisir.org/actualite-allergenes-dans-les-cosmetiques-l-info-s-ameliore-tout-doucement-n110338/"], // 5
  ["ECHA, annexe III du règlement cosmétique (vitamine A)", "https://echa.europa.eu/bg/cosmetics-restricted-substances/-/legislationlist/details/EU-COSM_PROD-ANX_III_RESTRIC-100.001.117-VSK-G54WCQ"], // 6
  ["Test-Achats, nouvelles règles sur le rétinol", "https://www.test-achats.be/sante/sante-au-quotidien/creme-anti-rides/news/retinol-cosmetiques"],                     // 7
  ["Cosmetics Design Europe, talc : divergence UE / Royaume-Uni", "https://www.cosmeticsdesign-europe.com/Article/2026/01/29/uk-and-eu-regulations-diverge-on-talc-in-cosmetics"], // 8
  ["Que Choisir, ingrédients interdits contrôlés par la DGCCRF", "https://www.quechoisir.org/actualite-ingredients-indesirables-dans-les-cosmetiques-la-dgccrf-dans-les-pas-de-l-ufc-que-choisir-n47928/"], // 9
  ["COSMILE Europe, pyrithione de zinc", "https://cosmileeurope.eu/fr/inci/ingredient/17139/zinc-pyrithione/"],                                                            // 10
  ["CMS, interdiction du Lilial (règlement 2021/1902)", "https://cms.law/en/deu/legal-updates/bans-on-substances-under-eu-cosmetics-law"],                                // 11
  ["Biorius, mention « libère du formaldéhyde » (règlement 2022/1181)", "https://biorius.com/fr/cosmetic-news/diminution-du-seuil-de-lavertissement-libere-du-formaldehyde/"], // 12
  ["CosLaw, avis du SCCS sur l'aluminium", "https://coslaw.eu/watchout/aluminium/"],                                                                                       // 13
  ["Commission européenne, restriction des microplastiques (2023/2055)", "https://trade.ec.europa.eu/access-to-markets/fr/news/restriction-des-microplastiques-dans-lue-partir-du-17-octobre-2023"], // 14
  ["SCCS, avis sur le BHT (2021)", "https://health.ec.europa.eu/publications/butylated-hydroxytoluene-bht_en"],                                                            // 15
  ["EUR-Lex, règlement 2022/2195 (BHT, homosalate)", "https://eur-lex.europa.eu/eli/reg/2022/2195/oj"],                                                                    // 16
  ["Que Choisir, fiches des molécules à éviter", "https://www.quechoisir.org/decryptage-produits-cosmetiques-les-fiches-des-molecules-toxiques-a-eviter-n2019/"],          // 17
  ["Ceway, règlement 2024/996 (vitamine A, perturbateurs endocriniens)", "https://news.ceway.eu/?p=4546"],                                                                 // 18
  ["Règlement 2019/1966 (acide salicylique)", "https://legislation.gov.uk/eur/2019/1966/introduction/data.xht"],                                                          // 19
  ["SCCS, composés du bore (CMR 1B)", "https://ec.europa.eu/health/scientific_committees/consumer_safety/docs/sccs_o_146.pdf"],                                         // 20
  ["DGCCRF, interdiction du TPO depuis le 1er septembre 2025", "https://www.economie.gouv.fr/node/3236064"],                                                               // 21
  ["DGCCRF, mention [nano] obligatoire", "https://www.economie.gouv.fr/dgccrf/composition-des-cosmetiques-lexigence-dune-information-claire-des-consommateurs"],          // 22
  ["Que Choisir, l'octocrylène sur la sellette", "https://quechoisir.org/comparatif-ingredients-indesirables-n941/sence-sunscreen-milk-pi1484148"],                       // 23
  ["CosmeticOBS, ingrédients perturbateurs endocriniens en évaluation", "https://client.cosmeticobs.com/en/articles/news-59/endocrine-disrupting-ingredients-in-cosmetics-4414"], // 24
  ["EUR-Lex, règlement 2026/405 sur les détergents", "https://eur-lex.europa.eu/eli/reg/2026/405/oj/fra/pdf"],                                                              // 25
  ["Que Choisir, allergènes non signalés dans les détergents", "https://www.quechoisir.org/actualite-detergents-menagers-des-allergenes-non-signales-aux-consommateurs-n132158/"], // 26
  ["WECF France, guide des produits ménagers 2025", "https://wecf-france.org/wp-content/uploads/2025/12/PRODUITS-MENAGERS-GUIDE2025_V6.pdf"],                              // 27
  ["écoconso, composition des lessives", "https://ecoconso.be/fr/node/2061/printable/pdf"]                                                                                  // 28
];

/* ---------- Familles d'ingrédients ---------- */
const INGC = [
  {id:"pfas", nom:"PFAS (composés fluorés)", re:/perfluoro|polyfluoro|fluoroalcohol|\bptfe\b|polytetrafluoroethylene|tetrafluoropropene|trifluoroacetyl|octafluoropentyl|pentafluoropropane/,
   off:[3,"Interdits dans les cosmétiques vendus en France depuis le 1er janvier 2026 (loi du 27 février 2025). Les produits fabriqués avant cette date peuvent encore être vendus pendant 12 mois.",[0,1]],
   lft:[2,"Polluants persistants, effets suspectés sur la fertilité, la thyroïde et le foie.",LFT+"2024/04/15/pfas-dans-nos-cosmetiques/"]},
  {id:"tpo", nom:"TPO (vernis semi-permanent)", re:/trimethylbenzoyl diphenylphosphine oxide|diphenyl\(?2,4,6-trimethylbenzoyl\)?phosphine oxide|^tpo$/,
   off:[3,"Interdit dans tous les cosmétiques de l'UE depuis le 1er septembre 2025, sans délai d'écoulement des stocks.",[21]],
   lft:[2,"Classé toxique pour la reproduction.",LFT+"2025/09/08/linterdiction-du-tpo-a-partir-de-septembre-2025/"]},
  {id:"lilial", nom:"Lilial (butylphenyl methylpropional)", re:/butylphenyl methylpropional|buthylphenyl methylpropional|\blilial\b/,
   off:[3,"Interdit dans les cosmétiques de l'UE depuis le 1er mars 2022 (toxique pour la reproduction).",[11]],
   lft:[2,"Parfum de synthèse interdit, encore repéré dans certains produits.",LFT+"2022/09/10/nicky-paris/"]},
  {id:"zpt", nom:"Pyrithione de zinc", re:/zinc pyrithione/,
   off:[3,"Interdite dans les cosmétiques de l'UE depuis le 1er mars 2022.",[10]], lft:null},
  {id:"parab-int", nom:"Parabènes interdits", re:/isobutylparaben|isopropylparaben|phenylparaben|benzylparaben|pentylparaben/,
   off:[3,"Interdits depuis le 30 juillet 2015 ; la DGCCRF en retrouve encore lors de ses contrôles.",[9]],
   lft:[2,"Perturbateurs endocriniens suspectés.",LFT_LISTE]},
  {id:"mit", nom:"Isothiazolinones (MIT, MCIT)", re:/isothiazolinone|^mit$|^mcit$|kathon/,
   off:[2,"La MIT est interdite dans les produits non rincés depuis février 2017, et le mélange MCIT/MIT depuis 2016. Autorisées à faible dose dans les produits rincés.",[9]],
   lft:[2,"Conservateurs très allergisants.",LFT_LISTE]},
  {id:"formol", nom:"Libérateurs de formaldéhyde", re:/\bformaldehyde\b|\bformol\b|formalin|methylene glycol|dmdm hydantoin|imidazolidinyl urea|diazolidinyl urea|quaternium-15|bronopol|bromo-2-nitropropane|bromo-5-nitro|bronidox|sodium hydroxymethylglycinate|methenamine|methyldibromo/,
   off:[2,"Le formaldéhyde est interdit (cancérogène). Ses libérateurs restent autorisés comme conservateurs, mais le produit doit afficher « libère du formaldéhyde » au-delà d'un seuil, abaissé par le règlement 2022/1181.",[12]],
   lft:[2,"Libèrent du formol, cancérigène suspecté.",LFT_LISTE]},
  {id:"phenoxy", nom:"Phénoxyéthanol", re:/phenoxyethanol|phenoxytol/,
   off:[2,"Autorisé jusqu'à 1 % (jugé sûr par le SCCS en 2016). En France, les produits non rincés qui en contiennent doivent indiquer qu'ils ne s'utilisent pas sur le siège des enfants de 3 ans ou moins (ANSM).",[4]],
   lft:[2,"Conservateur suspecté (foie, reproduction), fabriqué par éthoxylation.",LFT+"2020/08/16/phenoxyethanol/"]},
  {id:"parab", nom:"Parabènes autorisés", re:/(methyl|ethyl|propyl|butyl)paraben|^parabens?$/,
   off:[2,"Autorisés avec des concentrations maximales. Propyl- et butylparaben font partie des substances évaluées comme perturbateurs endocriniens potentiels.",[17,24]],
   lft:[2,"Perturbateurs endocriniens suspectés.",LFT_LISTE]},
  {id:"triclosan", nom:"Triclosan, triclocarban", re:/triclosan|triclocarban|irgasan/,
   off:[2,"Restreints par le règlement 2024/996 au titre des perturbateurs endocriniens.",[18]],
   lft:[2,"Perturbateur endocrinien suspecté.",LFT_LISTE]},
  {id:"bht", nom:"BHT", re:/^bht$|butylated hydroxytoluene|butylhydroxytoluene/,
   off:[2,"Limité à 0,001 % dans les bains de bouche, 0,1 % dans les dentifrices et 0,8 % dans les autres produits (règlement 2022/2195, d'après l'avis du SCCS).",[15,16]],
   lft:[2,"Non biodégradable, perturbateur endocrinien suspecté.",LFT+"2025/09/30/le-bht/"]},
  {id:"bha", nom:"BHA", re:/^bha$|butylated hydroxyanisole|butylhydroxyanisole/, off:null,
   lft:[2,"Irritant, perturbateur endocrinien et cancérigène suspecté.",LFT_LISTE]},
  {id:"d4", nom:"Silicone D4 (cyclotetrasiloxane)", re:/cyclotetrasiloxane|^d4$/,
   off:[3,"Interdit dans les cosmétiques depuis 2022 (perturbateur endocrinien suspecté).",[3]],
   lft:[2,"Persistant et bioaccumulable, suspecté de nuire à la fertilité.",LFT+"2024/11/28/des-ingredients-interdits-dans-nos-cosmetiques/"]},
  {id:"cyclo", nom:"Silicones cycliques (D5, D6)", re:/cyclopentasiloxane|cyclohexasiloxane|cyclomethicone|^d[56]$/,
   off:[2,"Limités à 0,1 % dans tous les produits depuis le 6 juin 2026 (restriction REACH), avec un an de délai supplémentaire pour les cosmétiques. Au-delà, un produit sans rinçage n'est plus conforme.",[2,3]],
   lft:[2,"Persistants et bioaccumulables, perturbateurs endocriniens suspectés.",LFT+"2024/11/28/des-ingredients-interdits-dans-nos-cosmetiques/"]},
  {id:"silicones", gen:1, nom:"Silicones", re:/methicone|siloxane|silicone|dimethiconol|polysilicone/, off:null,
   lft:[2,"Polluants et occlusifs : ils gainent sans soigner.",LFT+"2020/06/01/les-silicones/"]},
  {id:"retinol", nom:"Vitamine A (rétinol)", re:/^retinol$|retinyl acetate|retinyl palmitate/,
   off:[2,"Depuis le 1er novembre 2025 : 0,05 % maximum dans les laits corporels, 0,3 % dans les autres produits, avec la mention « Contient de la vitamine A ».",[6,7]],
   lft:[2,"Irritant et suspecté toxique pour la reproduction.",LFT+"2023/07/20/le-retinol/"]},
  {id:"talc", nom:"Talc", re:/^talc$/,
   off:[1,"Le comité d'évaluation des risques de l'ECHA recommande de le classer cancérogène de catégorie 1B, ce qui conduirait à son interdiction en cosmétique, attendue en 2027. Le Royaume-Uni a conclu autrement.",[8]],
   lft:[2,"Irritant pour les poumons, risque de contamination à l'amiante, cancérogène probable.",LFT+"2024/07/08/le-talc-cancerigene-selon-loms/"]},
  {id:"4mbc", nom:"Filtre 4-MBC", re:/methylbenzylidene camphor|3-benzylidene camphor/,
   off:[3,"Le 4-MBC est interdit par le règlement 2024/996 (perturbateur endocrinien).",[18]],
   lft:[2,"Filtre UV chimique perturbateur endocrinien suspecté.",LFT+"2021/05/25/quelle-creme-solaire-choisir/"]},
  {id:"homosalate", nom:"Homosalate", re:/homosalate/,
   off:[2,"Autorisé seulement dans les produits pour le visage, à 7,34 % maximum (règlement 2022/2195).",[16]],
   lft:[2,"Filtre UV chimique perturbateur endocrinien suspecté.",LFT+"2021/05/25/quelle-creme-solaire-choisir/"]},
  {id:"octo", nom:"Octocrylène, benzophénones", re:/octocrylene|benzophenone|oxybenzone|sulisobenzone/,
   off:[2,"Concentrations maximales abaissées. L'octocrylène peut se dégrader en benzophénone avec le temps (Que Choisir).",[23,24]],
   lft:[2,"Filtres UV chimiques perturbateurs endocriniens suspectés.",LFT+"2021/05/25/quelle-creme-solaire-choisir/"]},
  {id:"filtres", nom:"Autres filtres UV chimiques", re:/methoxycinnamate|octinoxate|butyl methoxydibenzoylmethane|avobenzone|ethylhexyl triazone|diethylhexyl butamido triazone|phenylbenzimidazole sulfonic acid|dimethyl paba|^paba$/,
   off:[1,"Autorisés comme filtres UV. Plusieurs (dont l'ethylhexyl methoxycinnamate) sont évalués comme perturbateurs endocriniens potentiels.",[24]],
   lft:[2,"Filtres chimiques allergisants, certains perturbateurs endocriniens suspectés. Elle préfère l'oxyde de zinc non nano.",LFT+"2021/05/25/quelle-creme-solaire-choisir/"]},
  {id:"nano", nom:"Nanoparticules", re:/\[nano\]|\(nano\)|\bnano\b/,
   off:[2,"Autorisées pour certains filtres, avec la mention [nano] obligatoire dans la liste des ingrédients.",[22]],
   lft:[2,"Risques suspectés (stress oxydatif, voies respiratoires).",LFT+"2022/04/08/nouvelle-reglementation-nanoparticules/"]},
  {id:"tio2", gen:1, nom:"Dioxyde de titane", re:/titanium dioxide|ci 77891/, off:null,
   lft:[2,"Elle l'évite, surtout sous forme nano.",LFT+"2022/04/08/nouvelle-reglementation-nanoparticules/"]},
  {id:"alu", nom:"Sels d'aluminium", re:/alumin(i)?um (chlorohydrate|sesquichlorohydrate|zirconium|stearate|sulfate|hydroxide|chloride)|ammonium alum|potassium alum|^alum$|^alumina$/,
   off:[0,"Jugés sûrs par le SCCS jusqu'à 6,25 % (déodorants non vaporisés), 10,6 % (vaporisés), 2,65 % (dentifrices) et 0,77 % (rouges à lèvres). Le SCCS note que l'exposition totale, toutes sources confondues, peut dépasser les seuils sûrs chez les plus exposés.",[13]],
   lft:[2,"Elle déconseille les sels d'aluminium et la pierre d'alun.",LFT_LISTE]},
  {id:"salicyl", nom:"Acide salicylique", re:/^salicylic acid$/,
   off:[2,"Concentrations maximales ; interdit dans les produits pour enfants de moins de 3 ans, sauf shampoings (règlement 2019/1966).",[19]],
   lft:[2,"Perturbateur endocrinien suspecté.",LFT_LISTE]},
  {id:"bore", nom:"Acide borique, borates", re:/boric acid|sodium borate|^borax$|tetraborate|perborate/,
   off:[2,"Composés du bore classés toxiques pour la reproduction (CMR 1B) ; usage très encadré, exclu chez les moins de 3 ans.",[20]],
   lft:[2,"Toxique pour la reproduction ; à proscrire pour femmes enceintes et enfants.",LFT+"2025/09/29/borax-acide-borique/"]},
  {id:"microplast", nom:"Microplastiques", re:/^polyethylene$|^polypropylene$|^nylon-\d+$|polymethyl methacrylate|^polystyrene$|glitter/,
   off:[2,"Les microbilles et paillettes plastiques ajoutées sont interdites depuis le 17 octobre 2023 dans de nombreux produits, avec des délais pour d'autres (règlement 2023/2055).",[14]],
   lft:[2,"Pollution des eaux : non retenus par les stations d'épuration.",LFT+"2020/10/15/les-gommages-a-grains/"]},
  {id:"allergenes", nom:"Allergènes de parfum", re:/^(limonene|d-limonene|linalool|geraniol|citral|citronellol|coumarin|eugenol|isoeugenol|farnesol|benzyl alcohol|benzyl benzoate|benzyl cinnamate|cinnamal|cinnamyl alcohol|hexyl cinnamal|amyl cinnamal|amylcinnamyl alcohol|anise alcohol|alpha-isomethyl ionone|hydroxycitronellal|methyl 2-octynoate|evernia (prunastri|furfuracea).*|camphor|menthol|vanillin|linalyl acetate|terpineol|alpha-pinene|beta-pinene|carvone|benzaldehyde|methyl salicylate)$/,
   off:[1,"Allergènes à déclarer dans la liste des ingrédients au-delà de 0,001 % (produits non rincés) ou 0,01 % (rincés). La liste obligatoire est passée à environ 80 substances fin juillet 2026.",[5]],
   lft:[1,"Allergènes, souvent issus du parfum ou des huiles essentielles : prudence sur peaux sensibles, bébés et femmes enceintes.",LFT+"2024/11/25/les-produits-clean-et-les-allergies/"]},
  {id:"benzylsal", nom:"Salicylate de benzyle", re:/benzyl salicylate|benzyl salycilate|hexyl salicylate/,
   off:[1,"Allergène de parfum à déclarer ; fait partie des substances évaluées comme perturbateurs endocriniens potentiels.",[5,24]],
   lft:[2,"Perturbateur endocrinien suspecté.",LFT_LISTE]},
  {id:"parfum", nom:"Parfum de synthèse", re:/^(parfum|fragrance|aroma|perfume)$|(?<!sans )\bparfums?\b/, off:null,
   lft:[2,"Composition secrète, allergènes, phtalates possibles. Elle préfère les produits sans parfum.",LFT+"2020/06/16/les-parfums/"]},
  {id:"muscs", nom:"Muscs synthétiques", re:/galaxolide|hexamethylindanopyran|^hhcb$|tonalide|musk ketone|musk xylene|tetramethyl acetyloctahydronaphthalenes/, off:null,
   lft:[2,"S'accumulent dans les tissus et l'environnement, perturbateurs endocriniens suspectés.",LFT+"2025/06/12/analyse-compo-bajoah/"]},
  {id:"phtalates", nom:"Phtalates", re:/phthalate|^dbp$|^dep$|^dehp$/, off:null,
   lft:[2,"Perturbateurs endocriniens.",LFT+"2020/06/16/les-parfums/"]},
  {id:"sulfates", nom:"Sulfates et tensioactifs décapants", re:/lauryl sulfate|laureth sulfate|coco[- ]?sulfate|cetearyl sulfate|alkyl sulfate|olefin sulfonate|laureth sulfosuccinate|myreth sulfate/, off:null,
   lft:[2,"Irritants et décapants ; le laureth sulfate est en plus éthoxylé.",LFT+"2020/10/07/les-sulfates/"]},
  {id:"isethionate", nom:"Isethionates (SCI)", re:/isethionate/, off:null,
   lft:[2,"Irritant pour les yeux, écotoxique, fabriqué avec de l'oxyde d'éthylène.",LFT+"2023/06/20/le-sci/"]},
  {id:"betaines", nom:"Bétaïnes (cocamidopropyl betaine…)", re:/amidopropyl betaine|coco[- ]?betaine|lauryl betaine|oleyl betaine|cocamidopropyl de betain/, off:null,
   lft:[2,"Allergies et eczéma possibles, irritant, écotoxique.",LFT+"2025/10/14/le-cocamidopropyl-betaine/"]},
  {id:"quats", nom:"Ammoniums quaternaires (quats)", re:/quaternium|trimonium|dimonium|hydroxyethylmonium|benzalkonium|stearalkonium|disteardimonium|amidopropyl dimethylamine|propalkonium|methosulfate/, off:null,
   lft:[2,"Filmogènes comme les silicones, irritants, polluants.",LFT+"2020/07/06/les-quats/"]},
  {id:"ethoxyles", nom:"Composés éthoxylés (PEG, polysorbates…)", re:/^peg\b|^peg-|\bpeg-\d|^ppg\b|ppg-\d|polysorbate|laureth-\d|ceteareth|steareth|oleth|trideceth|isoceteth|pareth|capryleth|sorbeth|macrogol|glycereth/, off:null,
   lft:[2,"Fabriqués avec de l'oxyde d'éthylène, risque de traces de 1,4-dioxane, peu biodégradables.",LFT+"2019/09/17/perturbateur-endocrinien-cancerigene-cancerogene-allergene-polluant-kesako/"]},
  {id:"edta", nom:"EDTA et séquestrants", re:/edta|edetate|etidronate|glutamate diacetate|^glda$/, off:null,
   lft:[2,"Peu biodégradables, ils entraînent les métaux dans les eaux usées. À éviter surtout dans les dentifrices.",LFT+"2020/09/08/edta/"]},
  {id:"mineral", nom:"Huiles minérales (pétrole)", re:/paraffinum|^paraffin$|mineral oil|petrolatum|vaseline|^ceresin$|ozokerite|microcrystalline wax|microcristallina|synthetic wax|isoparaffin|isohexadecane|isododecane|isoeicosane|polybutene|polyisobutene|^undecane$|^tridecane$|c13-c?15 alkane/, off:null,
   lft:[2,"Dérivés du pétrole, polluants, impuretés possibles ; ne traitent pas la peau.",LFT+"2020/09/14/les-huiles-minerales/"]},
  {id:"polymeres", gen:1, nom:"Polymères synthétiques", re:/carbomer|acrylate|crosspolymer|^pvp$|vp\/|polyacrylamide|acrylamide|styrene|polyurethane|polyvinyl alcohol/, off:null,
   lft:[2,"Peu biodégradables, d'origine pétrochimique.",LFT_LISTE]},
  {id:"dea", nom:"DEA, MEA, TEA", re:/triethanolamine|^tea$|\bdea\b|\bmea\b|\bmipa\b|tromethamine|trolamine/, off:null,
   lft:[2,"Irritants, impuretés possibles.",LFT_LISTE]},
  {id:"lanoline", nom:"Lanoline", re:/lanolin/, off:null,
   lft:[2,"Allergène reconnu, résidus de pesticides possibles. Fortement déconseillée en cas d'eczéma.",LFT+"2023/07/04/la-lanoline/"]},
  {id:"chlorphenesin", nom:"Chlorphénésine", re:/chlorphenesin/, off:null,
   lft:[2,"Conservateur qu'elle juge non clean.",LFT+"2022/03/29/analyse-compo-de-la-marque-pin-up-secret/"]},
  {id:"glycols", nom:"Glycols (souvent pétrochimiques)", re:/^(propylene|butylene|pentylene|caprylyl|hexylene) glycol$/, off:null,
   lft:[1,"À éviter s'ils sont d'origine pétrochimique ; acceptables s'ils sont végétaux, ce que l'étiquette ne dit pas.",LFT+"2022/10/26/les-derives-de-petrole/"]},
  {id:"hydrog", nom:"Huiles hydrogénées, squalane", re:/hydrogenated|squalane/, off:null,
   lft:[1,"Procédé énergivore avec catalyseurs métalliques ; l'huile perd en qualité.",LFT+"2024/05/07/les-huiles-hydrogenees/"]},
  {id:"alcool", nom:"Alcool", re:/^alcohol( denat\.?)?$|^sd alcohol|^isopropyl alcohol$|^ethanol$|^alcool$/, off:null,
   lft:[1,"Asséchant et irritant, surtout en début de liste.",LFT+"2020/06/16/les-parfums/"]},
  {id:"ehg", nom:"Éthylhexylglycérine", re:/ethylhexylglycerin/, off:null,
   lft:[1,"Origine synthétique, procédé de fabrication polluant.",LFT+"2026/02/24/analyse-compo-la-marque-pomad/"]},
  {id:"colorants", nom:"Colorants (CI)", re:/^ci \d{5}$/, off:null,
   lft:[1,"Colorants souvent inutiles, parfois irritants.",LFT_LISTE]},
  {id:"aloepoudre", nom:"Aloe vera en poudre", re:/aloe barbadensis leaf (juice )?powder|aloe barbadensis leaf powder extract/, off:null,
   lft:[1,"Aloe reconstitué à partir de poudre : moins intéressant que le jus natif.",LFT+"2025/05/19/laloe-vera/"]},
  {id:"bicar", nom:"Bicarbonate de sodium", re:/^sodium bicarbonate$/, off:null,
   lft:[1,"Peut irriter les peaux sensibles (déodorants).",LFT+"2021/06/05/routine-pour-enlever-les-odeurs-de-transpiration/"]},
  {id:"palme", nom:"Huile de palme et dérivés", re:/elaeis guineensis|^sodium palmate$|palm kernel|^palm oil$|palm glycerides/, off:null,
   lft:[1,"Déforestation ; comédogène.",LFT+"2024/03/05/les-huiles-vegetales/"]},
  {id:"enzymes", nom:"Enzymes (lessives, lave-vaisselle)", re:/subtilisin|protease|amylase|lipase|cellulase|mannanase|^enzymes?$/, off:null,
   lft:[1,"Allergisantes, souvent issues d'OGM. Acceptées si certifiées non OGM.",LFT+"2026/03/06/comparatif-produits-lave-vaisselle/"]},
  {id:"polycarbox", nom:"Polycarboxylates", re:/polycarbox/, off:null,
   lft:[2,"Polymères peu biodégradables : elle les écarte des lessives et des produits lave-vaisselle.",LFT+"2021/04/23/les-lessives-ecologiques/"]},
  {id:"taed", nom:"TAED (activateur de blanchiment)", re:/\btaed\b|tetraacetylethylenediamine/, off:null,
   lft:[1,"Relevé parmi les ingrédients qui écartent un produit lave-vaisselle du « clean ».",LFT+"2026/03/06/comparatif-produits-lave-vaisselle/"]},
  {id:"azurants", nom:"Azurants optiques", re:/azurant|optical brightener|distyrylbiphenyl|diaminostilbene/, off:[1,"Pas de restriction. Peu biodégradables, ils se déposent sur la peau et le linge selon l'association WECF.",[27]],
   lft:null},
  {id:"phosphonates", nom:"Phosphonates", re:/phosphonate/, off:[1,"Pas de restriction propre. Jugés peu tolérés par l'environnement par les associations.",[28]],
   lft:null},
  {id:"peroxyde", nom:"Eau oxygénée", re:/hydrogen peroxide/, off:null,
   lft:[2,"Oxydant agressif pour les cheveux et la peau.",LFT+"2024/09/25/routine-clean-cheveux-blancs-gris-ou-blonds/"]},
  /* Ingrédients appréciés */
  {id:"ok-glutamate", nom:"Tensioactifs doux (glutamates)", re:/cocoyl glutamate/, off:null,
   lft:[-1,"Tensioactif doux qu'elle juge acceptable.",LFT+"2020/10/07/les-sulfates/"]},
  {id:"ok-savon", nom:"Savon saponifié", re:/^sodium (olivate|cocoate|shea butterate|sunflowerate|sweet almondate|avocadate)$|^potassium (olivate|cocoate|sunflowerate)$/, off:null,
   lft:[-1,"Savon d'huiles saponifiées : l'alternative qu'elle préfère aux sulfates.",LFT+"2019/08/09/le-vrai-savon-de-marseille/"]},
  {id:"ok-aloe", nom:"Aloe vera natif", re:/^aloe barbadensis leaf juice$/, off:null,
   lft:[-1,"Jus d'aloe natif : la forme qu'elle recommande.",LFT+"2025/05/19/laloe-vera/"]},
  {id:"ok-argile", nom:"Argiles", re:/^kaolin$|^illite$|montmorillonite|^bentonite$|moroccan lava clay/, off:null,
   lft:[-1,"Argile pure, appréciée (par exemple à la place du talc).",LFT+"2026/09/22/les-argiles/"]}
];

/* ---------- Familles de produits ---------- */
// alts : [marque, produit, chemin de l'article LFT, partenariat déclaré (1) ou non (0)]
const CFAM = [
  {id:"douche", t:"cosmetique", title:"Gel douche et savon", re:/shower|body.?wash|gel douche|douche|bath|bain|soap|savon/,
   tips:["Préférer un savon saponifié à froid ou un gel lavant sans sulfates ni bétaïnes.","Un « vrai » savon de Marseille ne contient que de l'huile d'olive saponifiée, de l'eau et du sel."],
   alts:[["Gaëlle Besse","Savon Tout doux pour tous","2019/07/25/les-savons-gaelle-besse/",1],["Veraēm","Gel lavant","2020/07/16/ma-routine-corps-clean/",1],["Réjence","Soin lavant apaisant","2020/07/16/ma-routine-corps-clean/",0],["Savon Arthur","Savon bébé à l'huile d'olive","2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/",1],["Senza","Savon liquide mains et corps","2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/",1],["Le Petit Marseillais","Gel douche fleur de bleuet bio","2024/10/30/analyse-compo-produit-corps/",0]],
   src:"2020/07/16/ma-routine-corps-clean/"},
  {id:"shampoing", t:"cosmetique", title:"Shampoing et après-shampoing", re:/shampo|conditioner|apres.?shampo|hair|cheveu|capillaire/,
   tips:["Éviter sulfates, silicones et quats : la transition peut prendre quelques semaines.","Les produits capillaires « professionnels » sont souvent les moins clean selon elle."],
   alts:[["Comme Avant","Shampoing solide (noisette, sésame)","2020/05/09/ma-routine-capillaire-clean/",1],["Lao","Shampoing purifiant","2020/05/09/ma-routine-capillaire-clean/",1],["Veraēm","Gel lavant","2020/05/09/ma-routine-capillaire-clean/",1],["Gorgée de Soleil","Shampoing douceur et brillance abricot","2024/10/11/analyse-compo-produit-shampoing/",0],["Savon Stories","Shampoing solide volume max","2024/10/11/analyse-compo-produit-shampoing/",0],["Propolia","Après-shampoing","2020/05/09/ma-routine-capillaire-clean/",0],["Centifolia","Lotion démêlante","2020/05/09/ma-routine-capillaire-clean/",0]],
   src:"2020/05/09/ma-routine-capillaire-clean/"},
  {id:"deo", t:"cosmetique", title:"Déodorant", re:/deodorant|deo\b|antiperspirant|anti.?transpirant/,
   tips:["Elle déconseille les sels d'aluminium et la pierre d'alun.","Le bicarbonate peut irriter les peaux sensibles : préférer une version sans si c'est le cas."],
   alts:[["Gaëlle Besse","Déodorant crème nature (sans huile essentielle)","2021/06/05/routine-pour-enlever-les-odeurs-de-transpiration/",1],["Comme Avant","Déodorant solide","2020/07/16/ma-routine-corps-clean/",1],["Caudalie","Déodorant stick Vinofresh","2024/10/30/analyse-compo-produit-corps/",0],["Clémence et Vivien","Déodorant crème peau sensible","2024/10/30/analyse-compo-produit-corps/",0],["We Love The Planet","Déodorant","2024/10/30/analyse-compo-produit-corps/",0]],
   src:"2021/06/05/routine-pour-enlever-les-odeurs-de-transpiration/"},
  {id:"dentifrice", t:"cosmetique", title:"Dentifrice", re:/toothpaste|dentifrice|dental|bain de bouche|mouthwash/,
   tips:["Elle est favorable au fluor à bonne dose : 1000 ppm avant 6 ans, 1450 ppm ensuite, une trace puis la taille d'un pois.","À éviter dans un dentifrice : EDTA, sulfates, BHT, benzoate de sodium."],
   alts:[["Comme Avant","Dentifrice à l'argile blanche avec fluor","2020/05/25/mes-routines-visage-clean/",1],["Comme Avant","Dentifrice enfant fraise ou pomme avec fluor","2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/",1],["Lilikiwi","Dentifrice enfant","2024/10/22/analyse-compo-produit-bebe/",0]],
   src:"2024/01/30/le-fluor-danger-ou-necessite/"},
  {id:"solaire", t:"cosmetique", title:"Crème solaire", re:/sun|solaire|spf|uv\b/,
   tips:["Préférer les filtres minéraux (oxyde de zinc) non nano ; éviter les filtres chimiques controversés.","Ne pas réutiliser une crème solaire d'une année sur l'autre."],
   alts:[["Comme Avant","Crème solaire SPF 50 à l'huile de karanja","2021/05/25/quelle-creme-solaire-choisir/",1],["Acorelle","Crème solaire bébé SPF 50","2021/09/28/routine-trousse-de-vacances-dete-pour-toute-la-famille/",0],["Badger","Crème solaire SPF 50","2024/01/24/protection-solaire-en-hiver/",0],["Laboratoires de Biarritz","Crème solaire teintée","2019/11/06/lacne/",0]],
   src:"2021/05/25/quelle-creme-solaire-choisir/"},
  {id:"demaq", t:"cosmetique", title:"Démaquillant et nettoyant visage", re:/micellar|micellaire|make.?up remover|demaquill|cleans|nettoyant visage|cleansing/,
   tips:["Elle déconseille l'eau micellaire au quotidien : préférer le double nettoyage (huile puis savon doux).","Éviter les lingettes démaquillantes et les gommages à grains."],
   alts:[["Veraēm","Huile lavante démaquillante","2021/04/15/routine-peau-normale/",1],["Clémence et Vivien","Huile démaquillante Toute douce","2021/04/15/routine-peau-normale/",0],["Senza","Bi-phase 3 en 1","2021/04/15/routine-peau-normale/",1],["Endro","Huile lactée démaquillante","2024/11/05/analyse-compo-produit-visage/",0]],
   src:"2020/06/23/le-double-nettoyage/"},
  {id:"visage", t:"cosmetique", title:"Crème et sérum visage", re:/face|visage|facial|serum|day cream|night cream|creme de jour|moisturi|hydratant|anti.?age|contour des yeux/,
   tips:["Les produits « contour des yeux » ont souvent une formule proche d'une crème de jour.","Éviter rétinol, silicones, huiles minérales et parfum de synthèse."],
   alts:[["Veraēm","Crème hydratante","2021/04/15/routine-peau-normale/",1],["Réjence","Gel-crème hydratant","2021/04/15/routine-peau-normale/",0],["Clémence et Vivien","Sérum désaltérant à l'acide hyaluronique","2021/04/15/routine-peau-mixte/",0],["Les Pépites Beauté","Gel d'aloe vera","2021/04/15/routine-peau-normale/",0],["Altheys","Crème miraculeuse Zematopic","2024/11/05/analyse-compo-produit-visage/",0],["Cebio","Crème de jour hydratante","2024/11/05/analyse-compo-produit-visage/",0]],
   src:"2020/05/25/mes-routines-visage-clean/"},
  {id:"corps", t:"cosmetique", title:"Soin du corps et baume", re:/body lotion|body milk|lait corps|creme corps|baume|balm|butter|beurre|body cream/,
   tips:["Un beurre ou une huile végétale brute suffit souvent : vérifier qu'il n'est ni raffiné ni hydrogéné.","Le karité contient du latex : test au poignet si allergie."],
   alts:[["Veraēm","Beurre de karité brut bio","2025/07/10/le-beurre-de-karite/",1],["Egyptian Magic","Baume multi-usages","2020/07/16/ma-routine-corps-clean/",0],["Saint Hilaire","Huile de jojoba bio","2020/07/16/ma-routine-corps-clean/",0],["Badger","Beauty balm à la rose","2024/10/30/analyse-compo-produit-corps/",0]],
   src:"2020/07/16/ma-routine-corps-clean/"},
  {id:"bebe", t:"cosmetique", title:"Bébé et enfant", re:/baby|bebe|enfant|kid|child|change|liniment|lingette|wipe/,
   tips:["Pas de phénoxyéthanol pour le siège des moins de 3 ans (obligation d'étiquetage en France).","Elle déconseille l'eau micellaire et les huiles essentielles chez les bébés."],
   alts:[["Veraēm","Gel lavant","2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/",1],["LiliKiwi","Mousse nettoyante corps et visage","2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/",0],["WaterWipes","Lingettes","2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/",0],["Veraēm","Macérât huileux de calendula","2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/",1],["Pototam","Huile douceur pour le corps","2024/10/22/analyse-compo-produit-bebe/",0],["Rivadouce","Gel lavant surgras sans parfum","2024/10/22/analyse-compo-produit-bebe/",0]],
   src:"2020/06/10/la-trousse-de-toilette-clean-pour-bebes-et-enfants/"},
  {id:"maquillage", t:"cosmetique", title:"Maquillage", re:/make.?up|maquillage|mascara|foundation|fond de teint|lipstick|rouge a levres|eyeshadow|fard|blush|eyeliner|poudre/,
   tips:["Le dioxyde de titane est présent dans presque tout le maquillage : elle cherche les formules qui l'évitent.","Pour les enfants, elle déconseille les marques de maquillage de fête classiques."],
   alts:[["Boho","Fond de teint, mascara, poudre","2020/12/15/routine-maquillage-clean/",0],["Comme Avant","Blush crème, rouge à lèvres","2020/12/15/routine-maquillage-clean/",1],["Laboratoires de Biarritz","Crème teintée SPF 30","2020/12/15/routine-maquillage-clean/",0],["Namaki","Maquillage enfant","2020/12/15/routine-maquillage-clean/",0]],
   src:"2020/12/15/routine-maquillage-clean/"},
  {id:"vernis", t:"cosmetique", title:"Vernis à ongles", re:/nail|vernis|ongle/,
   tips:["Selon elle, aucun vernis n'est vraiment clean. À éviter pendant la grossesse et chez les enfants.","Le TPO des vernis semi-permanents est interdit depuis septembre 2025."],
   alts:[["Même","Vernis (le moins problématique selon elle)","2024/07/29/routine-clean-pour-les-mains/",0],["All Tiger","Vernis (le moins problématique selon elle)","2024/07/29/routine-clean-pour-les-mains/",0],["Clever Beauty","Dissolvant","2020/07/16/ma-routine-corps-clean/",0]],
   src:"2022/07/11/existe-t-il-des-vernis-a-ongles-clean-le-comparatif/"},
  {id:"coloration", t:"cosmetique", title:"Coloration", re:/hair colou?r|coloration|teinture|henna|henne/,
   tips:["Préférer une teinture végétale dont la liste ne contient que des poudres de plantes.","Pas de coloration ni de balayage pendant la grossesse selon elle."],
   alts:[["Khadi","Teinture végétale","2019/07/15/les-teintures-vegetales/",0]],
   src:"2019/07/15/les-teintures-vegetales/"},
  {id:"lessive", t:"menager", title:"Lessive", re:/laundry|lessive|detergent|washing powder|lave.?linge|adoucissant|softener/,
   tips:["Éviter parfums, huiles essentielles, sulfates et polycarboxylates ; la glycérine encrasse la machine.","Le vinaigre blanc remplace l'adoucissant."],
   alts:[["Comme Avant","Lessive en poudre au bicarbonate sans parfum","2021/04/23/les-lessives-ecologiques/",1],["Savon Arthur","Lessive liquide bébé sans parfum","2021/04/23/les-lessives-ecologiques/",1],["Senza","Lessive bio sans parfum","2021/04/23/les-lessives-ecologiques/",1]],
   src:"2021/04/23/les-lessives-ecologiques/"},
  {id:"vaisselle", t:"menager", title:"Lave-vaisselle et vaisselle", re:/dishwash|lave.?vaisselle|vaisselle|dish/,
   tips:["Presque toutes les tablettes contiennent des ingrédients qu'elle évite (TAED, PEG, éthoxylés, polycarboxylates, enzymes OGM, parfum).","Le vinaigre blanc 14° sert de liquide de rinçage."],
   alts:[["Comme Avant","Poudre lave-vaisselle au sel de Camargue","2026/03/06/comparatif-produits-lave-vaisselle/",1],["Sonett","Pastilles lave-vaisselle","2026/03/06/comparatif-produits-lave-vaisselle/",0]],
   src:"2026/03/06/comparatif-produits-lave-vaisselle/"},
  {id:"nettoyant", t:"menager", title:"Nettoyant ménager", re:/clean|nettoy|menage|household|multi.?usage|multi.?purpose|wc|toilet|vitre|sol|degraiss|desinfect|anticalcaire|javel/,
   tips:["Elle juge la désinfection du logement inutile au quotidien et déconseille les nettoyants sans rinçage du supermarché.","Savon noir, bicarbonate, cristaux de soude, percarbonate, acide citrique et vinaigre blanc couvrent presque tout."],
   alts:[["Savon Arthur","Savon noir, acide citrique, bicarbonate, cristaux de soude","2025/02/06/routine-clean-menage-occasionnel/",1],["Senza","Savon noir","2025/01/24/routine-clean-menage-quotidien/",1],["La Fourche","Percarbonate de soude","2025/01/24/routine-clean-menage-quotidien/",1]],
   src:"2025/01/24/routine-clean-menage-quotidien/"}
];

/* ---------- Analyses publiées par La Famille Tortue ---------- */
// [marque (sans accents, minuscules), verdict de l'article, chemin de l'article]
const LFT_MARQUES = [
  ["everdrop","déconseillée","2026/10/30/analyse-compo-la-marque-everdrop/"],["pomad","déconseillée","2026/02/24/analyse-compo-la-marque-pomad/"],
  ["mother's earth","déconseillée","2026/02/17/analyse-compo-mothers-earth/"],["endro","recommandée avec réserves","2026/01/27/analyse-compo-la-marque-endro/"],
  ["monat","déconseillée","2025/10/22/analyse-compo-la-marque-monat/"],["layli","déconseillée","2025/09/17/analyse-compo-la-marque-layli/"],
  ["bajoah","déconseillée","2025/06/12/analyse-compo-bajoah/"],["aloe paris","déconseillée","2025/04/23/analyse-compo-aloe-paris/"],
  ["substance of light","mitigée","2025/03/11/analyse-compo-substance-of-light/"],["dexeryl","mitigée, plutôt déconseillée","2025/02/24/analyse-compo-la-creme-dexeryl/"],
  ["homeoplasmine","déconseillée","2025/02/21/analyse-compo-lhomeoplasmine/"],["yepoda","mitigée","2024/10/15/analyse-compo-yepoda/"],
  ["my sos beauty","déconseillée","2023/11/21/my_sos_beauty/"],["comette","mitigée (beaucoup d'huiles essentielles)","2023/10/19/analyse-compo-comette-cosmetics/"],
  ["wild","plutôt déconseillée","2023/09/25/analyse-compo-wild/"],["lao","recommandée (collaboration commerciale)","2023/07/27/retours-et-avis-sur-les-shampoings-lao/"],
  ["typology","mitigée","2023/07/08/analyse-compo-typology/"],["nuud","déconseillée","2022/11/30/analyse-compo-nuud/"],
  ["so bio etic","mitigée (la plus clean de la grande distribution)","2022/10/13/analyse-compo-so-bio-etic/"],["nicky paris","déconseillée","2022/09/10/nicky-paris/"],
  ["avril","mitigée","2022/07/18/analyse-compo-avril/"],["unbottled","déconseillée","2022/06/23/analyse-compo-unbottled/"],
  ["900.care","déconseillée","2022/06/06/analyse-compo-900-care/"],["respire","déconseillée","2022/05/31/analyse-compo-respire/"],
  ["rosegold","déconseillée","2022/05/02/analyse-compo-rosegold/"],["yves rocher","déconseillée","2022/03/31/analyse-compo-de-la-marque-yves-rocher/"],
  ["pin up secret","déconseillée","2022/03/29/analyse-compo-de-la-marque-pin-up-secret/"],["pomelo+co","mitigée","2022/03/27/analyse-compo-de-la-marque-pomeloco/"],
  ["les secrets de loly","plutôt déconseillée","2022/03/25/analyse-compo-sur-la-marque-les-secrets-de-loly/"],["la rosee","déconseillée","2022/03/23/analyse-compo-de-la-marque-la-rosee/"],
  ["avene","déconseillée","2022/03/21/analyse-compo-de-la-marque-avene/"],["aroma-zone","mitigée","2021/09/21/mon-enquete-sur-aroma-zone/"],
  ["weleda","mitigée à déconseillée","2021/05/11/weleda-analyse-de-la-marque/"],["la roche-posay","déconseillée","2024/02/27/analyse-compo-la-roche-posay/"],
  ["gaelle besse","recommandée (affiliation)","2019/07/25/les-savons-gaelle-besse/"],["comme avant","recommandée (partenariat commercial)","2021/04/23/les-lessives-ecologiques/"]
];
// Produits notés dans ses tableaux comparatifs : [marque, mots du nom, verdict, chemin]
const LFT_PRODUITS = [
  ["le petit marseillais","gel douche bleuet","clean","2024/10/30/analyse-compo-produit-corps/"],
  ["le petit marseillais","shampoing miel karite","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["caudalie","deodorant vinofresh","clean","2024/10/30/analyse-compo-produit-corps/"],
  ["caudalie","serum vinopure","non clean","2024/11/05/analyse-compo-produit-visage/"],
  ["la roche-posay","fond de teint","non clean","2024/11/05/analyse-compo-produit-visage/"],
  ["the ordinary","creme","non clean","2024/11/05/analyse-compo-produit-visage/"],
  ["clinique","baume demaquillant","non clean","2024/11/05/analyse-compo-produit-visage/"],
  ["embryolisse","blush","non clean","2024/11/05/analyse-compo-produit-visage/"],
  ["svr","ampoule hydratante","non clean","2024/11/05/analyse-compo-produit-visage/"],
  ["svr","topialyse","moyen","2024/11/05/analyse-compo-produit-visage/"],
  ["a-derma","dermalibour","non clean","2024/10/30/analyse-compo-produit-corps/"],
  ["beauterra","gel douche monoi","non clean","2024/10/30/analyse-compo-produit-corps/"],
  ["je suis bio","creme de douche","non clean","2024/10/30/analyse-compo-produit-corps/"],
  ["labell","gel douche aloe","non clean","2024/10/30/analyse-compo-produit-corps/"],
  ["weleda","savon calendula","moyen","2024/10/30/analyse-compo-produit-corps/"],
  ["ducray","shampoing extra-doux","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["klorane","shampoing ortie","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["garnier","apres-shampoing sans rincage","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["herbal essences","apres-shampoing coco","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["l'oreal","shampoo acacia aloe","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["l'occitane","shampoing solide","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["davines","solu","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["pureology","shampoing hydratant","non clean","2024/10/11/analyse-compo-produit-shampoing/"],
  ["poupon","gel lavant abricot","non clean","2024/10/22/analyse-compo-produit-bebe/"],
  ["sanogyl","dentifrice enfants","non clean","2024/10/22/analyse-compo-produit-bebe/"],
  ["signal","dentifrice bio","moyen","2024/10/22/analyse-compo-produit-bebe/"],
  ["ouate","creme solaire","non clean","2024/10/22/analyse-compo-produit-bebe/"],
  ["ouate","eau micellaire","non clean","2024/10/22/analyse-compo-produit-bebe/"],
  ["clarins","body fit","non clean","2023/10/06/routine-clean-anti-cellulite/"],
  ["somatoline","thermoactive","non clean","2023/10/06/routine-clean-anti-cellulite/"],
  ["nuxe","reve de the","non clean","2023/10/06/routine-clean-anti-cellulite/"],
  ["avene","cicalfate","non clean","2025/11/27/astuces-nez-irrite/"],
  ["bepanthen","onguent nasal","non clean","2025/11/27/astuces-nez-irrite/"],
  ["nivea","patch points noirs","non clean","2025/11/04/comment-retirer-les-points-noirs/"],
  ["finish","capsules","non clean","2026/03/06/comparatif-produits-lave-vaisselle/"],
  ["fairy","tout en 1","non clean","2026/03/06/comparatif-produits-lave-vaisselle/"],
  ["sun","tout en 1","non clean","2026/03/06/comparatif-produits-lave-vaisselle/"],
  ["l'arbre vert","tablettes","non clean","2026/03/06/comparatif-produits-lave-vaisselle/"],
  ["rainett","tout en 1","non clean","2026/03/06/comparatif-produits-lave-vaisselle/"],
  ["comme avant","lave-vaisselle","clean","2026/03/06/comparatif-produits-lave-vaisselle/"]
];
// Marques avec partenariat commercial ou affiliation déclarés par La Famille Tortue
const LFT_PARTENAIRES = ["comme avant","savon arthur","senza","la fourche","gaelle besse","veraem","lao"];

const JOURNAL_C = [
  ["2026-11-18", "Produits ménagers : les étiquettes en français réglementaire sont mieux lues (parfums, polycarboxylates, TAED, azurants optiques, phosphonates)."],
  ["2026-11-17", "Les produits dont la liste d'ingrédients est mal lue ou trop courte sont signalés dans l'historique, pour les corriger sur Open Beauty Facts."],
  ["2026-11-17", "Note cosmétique alignée sur la logique de La Famille Tortue (un ingrédient déconseillé suffit à sortir du « clean ») et alerte quand la liste d'ingrédients de la fiche est mal lue."],
  ["2026-11-17", "Création de la partie cosmétiques et ménager : " + INGC.length + " familles d'ingrédients (statut officiel vérifié et avis de La Famille Tortue), 15 familles de produits avec alternatives, analyses de marques et de produits de La Famille Tortue."]
];
