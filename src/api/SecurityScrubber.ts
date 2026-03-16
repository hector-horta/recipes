import { MedicalProfile } from '../security/SecureVault';

// Diccionario de "Threat Signatures" (Firmas de Riesgo) — Spoonacular Intolerances + SIBO
const HIDDEN_TRIGGERS_DB: Record<string, string[]> = {
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

export const SecurityScrubber = {
    analyze(recipe: any, profile: MedicalProfile) {
        const findings: string[] = [];

        // Flat-map de todos los ingredientes (Directos y en listas de instrucciones)
        const rawIngredients = [
            ...(recipe.extendedIngredients?.map((i: any) => i.name) || []),
            ...(recipe.analyzedInstructions?.flatMap((inst: any) =>
                inst.steps.flatMap((step: any) => step.ingredients.map((i: any) => i.name))
            ) || [])
        ].map(name => name.toLowerCase());

        const activeThreats = [
            ...profile.allergies,
            ...profile.intolerances,
            ...(profile.conditions.includes('SIBO') ? ['sibo'] : [])
        ];

        let maxRiskLevel: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';

        // Capa 2: Evaluación profunda de diccionarios (Hidden Triggers)
        for (const threat of activeThreats) {
            const signatures = [threat, ...(HIDDEN_TRIGGERS_DB[threat] || [])];

            for (const signature of signatures) {
                if (rawIngredients.some(ing => ing.includes(signature))) {
                    findings.push(`Trigger oculto detectado: ${signature} (Categoría: ${threat.toUpperCase()})`);

                    // Capa 3: Etiquetado de severidad (Risk Disclosure)
                    const severity = profile.severities[threat];
                    if (severity === 'anaphylactic' || severity === 'severe') {
                        maxRiskLevel = 'DANGER'; // Bloqueo Inmediato
                    } else if (maxRiskLevel !== 'DANGER') {
                        maxRiskLevel = 'WARNING'; // Requiere supervisión
                    }
                }
            }
        }

        return {
            ...recipe,
            securityDisclosure: {
                isCleared: maxRiskLevel !== 'DANGER',
                riskLevel: maxRiskLevel,
                findings
            }
        };
    }
};
