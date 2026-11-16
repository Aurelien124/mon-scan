// Bibliothèque d'exercices de départ (modifiable dans l'appli).
// type : 'charge' (kg × reps), 'pdc' (poids du corps, lest optionnel), 'temps' (secondes), 'plio' (reps / contacts)
const MUSCLES = ['Pectoraux','Dos','Épaules','Biceps','Triceps','Quadriceps','Ischios','Fessiers','Mollets','Abdos/Gainage','Corps entier','Pliométrie','Cardio'];

const SEED_EXERCISES = [
  ['Développé couché','Pectoraux','charge',['bench press','dc','developpe couche barre']],
  ['Développé couché haltères','Pectoraux','charge',['db bench','dc halteres']],
  ['Développé incliné','Pectoraux','charge',['incline bench','developpe incline barre']],
  ['Développé incliné haltères','Pectoraux','charge',['incline db','di halteres']],
  ['Écarté haltères','Pectoraux','charge',['fly','ecarte']],
  ['Pompes','Pectoraux','pdc',['push up','pushups','pompe']],
  ['Dips','Triceps','pdc',['dips']],
  ['Tractions','Dos','pdc',['pull up','traction','chin up']],
  ['Tirage vertical','Dos','charge',['lat pulldown','tirage poulie haute']],
  ['Rowing barre','Dos','charge',['barbell row','rowing']],
  ['Rowing haltère','Dos','charge',['dumbbell row','rowing unilateral']],
  ['Tirage horizontal','Dos','charge',['seated row','tirage poulie basse']],
  ['Inverted row','Dos','pdc',['rowing inverse','australian pull up']],
  ['Face pull','Épaules','charge',['facepull']],
  ['Développé militaire','Épaules','charge',['overhead press','ohp','developpe militaire barre']],
  ['Développé épaules haltères','Épaules','charge',['shoulder press','developpe halteres']],
  ['Élévations latérales','Épaules','charge',['lateral raise','elevation laterale']],
  ['Landmine press','Épaules','charge',['landmine']],
  ['Curl barre','Biceps','charge',['barbell curl','curl']],
  ['Curl haltères','Biceps','charge',['dumbbell curl','curl alterne']],
  ['Curl marteau','Biceps','charge',['hammer curl']],
  ['Extension triceps poulie','Triceps','charge',['triceps pushdown','pushdown']],
  ['Barre au front','Triceps','charge',['skull crusher']],
  ['Squat','Quadriceps','charge',['back squat','squat barre']],
  ['Front squat','Quadriceps','charge',['squat avant']],
  ['Goblet squat','Quadriceps','charge',['goblet']],
  ['Squat bulgare','Quadriceps','charge',['bulgarian split squat','split squat bulgare','bss']],
  ['Fentes','Quadriceps','charge',['lunges','fente','fentes marchees']],
  ['Step-up','Quadriceps','charge',['step up','montee sur banc']],
  ['Presse à cuisses','Quadriceps','charge',['leg press','presse']],
  ['Leg extension','Quadriceps','charge',['extension jambes']],
  ['Soulevé de terre','Ischios','charge',['deadlift','sdt']],
  ['Soulevé de terre roumain','Ischios','charge',['rdl','romanian deadlift','sdt roumain']],
  ['Trap bar deadlift','Corps entier','charge',['hex bar','trap bar']],
  ['Leg curl','Ischios','charge',['leg curl allonge','curl ischios']],
  ['Nordic hamstring','Ischios','pdc',['nordic','nordic curl']],
  ['Hip thrust','Fessiers','charge',['hip thrust barre','pont fessier']],
  ['Mollets debout','Mollets','charge',['calf raise','extension mollets']],
  ['Mollets unilatéral','Mollets','charge',['single leg calf raise']],
  ['Gainage','Abdos/Gainage','temps',['planche','plank']],
  ['Gainage latéral','Abdos/Gainage','temps',['side plank']],
  ['Pallof press','Abdos/Gainage','charge',['pallof']],
  ['Relevés de jambes','Abdos/Gainage','pdc',['hanging leg raise','releve de jambes']],
  ['Dead bug','Abdos/Gainage','pdc',['deadbug']],
  ['Ab wheel','Abdos/Gainage','pdc',['roue abdominale','rollout']],
  ['Farmer walk','Corps entier','charge',['marche du fermier','farmers carry']],
  ['Kettlebell swing','Corps entier','charge',['swing','kb swing']],
  ['Power clean','Corps entier','charge',['epaule','clean','hang clean']],
  ['Box jump','Pliométrie','plio',['saut sur box','box jumps']],
  ['Squat jump','Pliométrie','plio',['squat saute','jump squat']],
  ['Countermovement jump','Pliométrie','plio',['cmj','saut vertical']],
  ['Depth jump','Pliométrie','plio',['drop jump','saut en contrebas']],
  ['Broad jump','Pliométrie','plio',['saut en longueur','standing long jump']],
  ['Bondissements','Pliométrie','plio',['bounds','bounding']],
  ['Pogo jumps','Pliométrie','plio',['pogo','pogos']],
  ['Sauts latéraux','Pliométrie','plio',['lateral bounds','skater jump','sauts lateraux']],
  ['Lancer médecine-ball','Pliométrie','plio',['med ball throw','medecine ball','slam ball']],
  ['Sprint','Cardio','temps',['sprints']],
  ['Corde à sauter','Cardio','temps',['jump rope']],
];

// Exercices supplémentaires (programme de prépa)
SEED_EXERCISES.push(
  ['Bûcheron','Abdos/Gainage','charge',['bucheron','woodchop','wood chop']],
  ['Élévation latérale iso 90°','Épaules','temps',['elevation laterale 90deg','elevation laterale iso','overcoming iso']],
  ['Décélération','Pliométrie','plio',['decel','deceleration']],
  ['Copenhagen plank','Abdos/Gainage','temps',['cop plank','copenhague','copenhagen']],
  ['Depth drop','Pliométrie','plio',['depth drop d un banc','drop d un banc']],
  ['Single leg drop','Pliométrie','plio',['single leg drop','drop unipodal']],
  ['Run 10"/20"','Cardio','temps',['run 10 20','intermittent 10 20']],
  ['Shoot sous fatigue','Cardio','temps',['shoot','tir sous fatigue']],
);

// Programme actuel de AS (converti depuis son PDF « Bonne rentrée »), chargé au premier lancement.
// Ligne d'exercice : [nom, séries, reps, récup (s), charge/RPE, consigne, enchaîné avec le précédent]
const WARMUP = `3 tours :
• 1' ergo — tour 1 cool, tour 2 souffle qui augmente (discussion possible), tour 3 hace calor (ergo au choix, changeable entre les tours)
• 15 rotations externes d'humérus — overhead ou bras le long du corps, uni ou bilatéral (haltères, élastique, poulie, keiser…)
• 10 reps d'un mouvement spécifique proche du 1er exercice (pompe pour bench, air squat pour squat, TRX row pour traction) — facile à exécuter
• 45" d'activation du core (planche, hollow, deadbug…) — chauffer, pas mourir`;
const PRESET_PROGRAM = {
  name: 'Prépa — Bonne rentrée',
  notes: 'Converti depuis le PDF du coach. Warm-up à construire à chaque séance selon les premiers mouvements.\nPossibilité de faire le travail de run de la séance terrain à la fin d\'un entraînement de basket.',
  sessions: [
    { name: 'Séance 1', note: WARMUP, items: [
      ['Squat', 3, '2x30s', 120, null, 'Profondeur habituelle'],
      ['Soulevé de terre roumain', 3, '2x30s', 120, null, '', true],
      ['Développé couché', 3, '8', 90, 'RPE 8', ''],
      ['Rowing barre', 3, '8', 90, 'RPE 8', 'Tirage penché', true],
      ['Bûcheron', 3, '8/côté', 90, 'RPE 8', 'Tempo libre'],
      ['Élévation latérale iso 90°', 3, '10s', 60, 'RPE 10', 'Overcoming iso'],
      ['Élévations latérales', 3, '10', 60, 'RPE 10', 'Haltères, exécution normale', true],
    ]},
    { name: 'Séance 2', note: WARMUP, items: [
      ['Squat bulgare', 2, '2x30s', 120, null, 'Profondeur habituelle'],
      ['Décélération', 2, '2x30s', 120, null, 'Élastique ou keiser', true],
      ['Landmine press', 3, '8', 90, 'RPE 8', ''],
      ['Tractions', 3, '8', 90, 'RPE 8', '', true],
      ['Nordic hamstring', 3, '10', 90, 'RPE 8', 'Tempo libre'],
      ['Copenhagen plank', 3, '10s', 60, 'RPE 10', 'ISO lourd'],
      ['Leg curl', 3, '10', 60, 'RPE 10', 'Exécution normale', true],
    ]},
    { name: 'Séance Terrain', note: 'Warm-up habituel (mobilité / course / gamme).\nLe run peut se faire à la fin d\'un entraînement de basket.', items: [
      ['Depth drop', 2, '8', 30, null, "D'un banc"],
      ['Single leg drop', 5, '5', 30, null, ''],
      ['Run 10"/20"', 2, '5min', 120, null, '10" effort / 20" récup · 2 COD donc 3×5 m'],
      ['Shoot sous fatigue', 1, '10min', 0, null, 'Bonus : à ta position habituelle, 10\' max (épaule au repos)'],
    ]},
  ],
};
