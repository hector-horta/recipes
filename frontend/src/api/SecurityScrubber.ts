import { MedicalProfile } from '../security/SecureVault';
import { MedicalRegistry } from './MedicalRegistry';

// Variable de estado para disparadores médicos (se inicializa vacío y se puebla en initialize)
let ACTIVE_TRIGGERS: Record<string, string[]> = {};

export const SecurityScrubber = {
    /** 
     * Inicializa el escáner con los datos más recientes del registro médico.
     */
    async initialize() {
        ACTIVE_TRIGGERS = await MedicalRegistry.getLatestTriggers();
        console.log('[SecurityScrubber] Engine initialized with latest medical signatures.');
    },

    analyze(recipe: any, profile: MedicalProfile) {
        const findings: string[] = [];

        // Extracción de ingredientes desde el formato normalizado. 
        // Si no existen (viejo cache), usamos una lista vacía para no romper la app.
        const rawIngredients = (recipe.ingredients || []).map((i: any) => (i.name || '').toLowerCase());

        const activeThreats = [
            ...profile.allergies,
            ...profile.intolerances,
            ...(profile.conditions.includes('SIBO') ? ['sibo'] : [])
        ];

        let maxRiskLevel: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';

        // Capa 2: Evaluación profunda usando las firmas dinámicas (ACTIVE_TRIGGERS)
        for (const threat of activeThreats) {
            const signatures = [threat, ...(ACTIVE_TRIGGERS[threat] || [])];

            for (const signature of signatures) {
                if (rawIngredients.some((ing: string) => ing.includes(signature))) {
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
