export const INTOLERANCE_CATALOG = [
  { id: 'dairy',     label: 'Lácteos',            emoji: '🥛', desc: 'Leche, queso, mantequilla' },
  { id: 'egg',       label: 'Huevo',              emoji: '🥚', desc: 'Huevo y derivados' },
  { id: 'gluten',    label: 'Gluten',             emoji: '🌾', desc: 'Trigo, cebada, centeno' },
  { id: 'grain',     label: 'Grano',              emoji: '🌿', desc: 'Avena, arroz, quinoa' },
  { id: 'peanut',    label: 'Maní',               emoji: '🥜', desc: 'Maní y derivados' },
  { id: 'seafood',   label: 'Pescado',            emoji: '🐟', desc: 'Salmón, atún, anchoas' },
  { id: 'sesame',    label: 'Sésamo',             emoji: '🫘', desc: 'Semillas y aceite de sésamo' },
  { id: 'shellfish', label: 'Mariscos',           emoji: '🦐', desc: 'Camarón, langosta, cangrejo' },
  { id: 'soy',       label: 'Soja',               emoji: '🫛', desc: 'Tofu, salsa de soja, tempeh' },
  { id: 'sulfite',   label: 'Sulfitos',           emoji: '🍷', desc: 'Vino, frutos secos, conservas' },
  { id: 'tree_nut',  label: 'Frutos Secos',       emoji: '🌰', desc: 'Almendras, nueces, avellanas' },
  { id: 'wheat',     label: 'Trigo',              emoji: '🍞', desc: 'Harina, pan, sémola' },
  { id: 'corn',      label: 'Maíz',               emoji: '🌽', desc: 'Jarabe de maíz, dxtrosa' },
  { id: 'sibo',      label: 'SIBO',               emoji: '🦠', desc: 'Dieta baja en FODMAPs' },
];

export const MEDICAL_TRIGGERS = {
  'dairy':     ['casein', 'whey', 'lactose', 'ghee', 'lactalbumin', 'nougat', 'butter fat', 'cream', 'cheese', 'milk'],
  'egg':       ['albumin', 'lysozyme', 'mayonnaise', 'meringue', 'ovalbumin', 'surimi'],
  'gluten':    ['maltodextrin', 'modified food starch', 'hydrolyzed wheat protein', 'seitan', 'triticale', 'spelt', 'kamut', 'semolina', 'durum'],
  'grain':     ['barley', 'buckwheat', 'bulgur', 'couscous', 'farro', 'millet', 'oats', 'quinoa', 'rice', 'rye', 'sorghum'],
  'peanut':    ['arachis oil', 'groundnut', 'beer nuts', 'monkey nuts', 'peanut butter', 'peanut flour'],
  'seafood':   ['anchovy', 'cod', 'fish sauce', 'herring', 'mackerel', 'salmon', 'sardine', 'tilapia', 'trout', 'tuna'],
  'sesame':    ['benne seeds', 'gingelly oil', 'halvah', 'hummus', 'sesame oil', 'tahini'],
  'shellfish': ['crab', 'crayfish', 'lobster', 'prawn', 'shrimp', 'scallop', 'clam', 'mussel', 'oyster', 'squid'],
  'soy':       ['edamame', 'miso', 'natto', 'soy sauce', 'soy lecithin', 'soy protein', 'tempeh', 'tofu', 'soya'],
  'sulfite':   ['sulfur dioxide', 'sodium bisulfite', 'sodium metabisulfite', 'potassium bisulfite', 'dried fruit', 'wine'],
  'tree_nut':  ['almond', 'brazil nut', 'cashew', 'chestnut', 'hazelnut', 'macadamia', 'marzipan', 'pecan', 'pine nut', 'pistachio', 'walnut', 'praline'],
  'wheat':     ['bread flour', 'bulgur', 'couscous', 'durum', 'einkorn', 'emmer', 'flour', 'semolina', 'spelt'],
  'corn':      ['high fructose corn syrup', 'dextrose', 'sorbitol', 'xanthan gum', 'maize', 'cornstarch', 'corn flour'],
  'sibo':      ['garlic', 'garlic powder', 'onion', 'onion powder', 'inulin', 'chicory root', 'agave', 'honey', 'xylitol', 'apple', 'pear', 'watermelon', 'mango', 'asparagus', 'artichoke', 'cauliflower', 'mushroom', 'wheat', 'rye', 'milk', 'yogurt', 'ice cream']
};
