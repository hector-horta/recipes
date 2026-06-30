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

        // Función para normalizar texto (quitar acentos)
        const normalize = (text: string) => 
            (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        // Extracción de ingredientes desde el formato normalizado. 
        const ingredients = (recipe.ingredients || []).map((i: any) => normalize(i.name || ''));
        const ingredientsString = ingredients.join(' ');

        const activeThreats = [
            ...profile.allergies,
            ...profile.intolerances,
            ...(profile.conditions.includes('SIBO') ? ['sibo'] : [])
        ];

        let maxRiskLevel: 'SAFE' | 'WARNING' | 'DANGER' = 'SAFE';

        // Capa 2: Evaluación profunda usando las firmas dinámicas (ACTIVE_TRIGGERS)
        for (const threat of activeThreats) {
            // Extraer ID base (ej: 'egg_anafilaxis' -> 'egg')
            const baseId = threat.split('_')[0].split('-')[0];
            const signatures = [baseId, ...(ACTIVE_TRIGGERS[baseId] || [])];

            for (const signature of signatures) {
                const normalizedSignature = normalize(signature);
                const escapedSignature = normalizedSignature.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
                const regex = new RegExp(`(?:^|\\s)${escapedSignature}(?:s|es)?(?:\\s|$|[.,;])`, 'i');

                if (regex.test(ingredientsString)) {
                    findings.push(`Trigger detectado: ${signature} (Categoría: ${baseId.toUpperCase()})`);

                    // Capa 3: Etiquetado de severidad (Risk Disclosure)
                    const severity = (profile.severities[baseId] || 'severe').toLowerCase();
                    if (severity === 'anaphylactic' || severity === 'severe') {
                        maxRiskLevel = 'DANGER'; // Bloqueo Inmediato
                    } else if (maxRiskLevel !== 'DANGER') {
                        maxRiskLevel = 'WARNING'; // Requiere supervisión
                    }
                    break; // No necesitamos verificar más firmas para esta amenaza si ya encontramos una
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
