import { MedicalProfile } from '../security/SecureVault';

// Diccionario de "Threat Signatures" (Firmas de Riesgo) para alérgenos comunes
const HIDDEN_TRIGGERS_DB: Record<string, string[]> = {
    'gluten': ['maltodextrin', 'modified food starch', 'hydrolyzed wheat protein', 'seitan', 'triticale'],
    'dairy': ['casein', 'whey', 'lactose', 'ghee', 'lactalbumin', 'nougat', 'butter fat'],
    'corn': ['high fructose corn syrup', 'dextrose', 'sorbitol', 'xanthan gum', 'maize'],
    'sibo': ['garlic powder', 'onion powder', 'inulin', 'chicory root', 'agave', 'honey', 'xylitol']
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
