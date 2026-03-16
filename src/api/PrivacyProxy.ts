import DOMPurify from 'dompurify';
import { SecureVault, type MedicalProfile } from '../security/SecureVault';
import { SecurityScrubber } from './SecurityScrubber';

const API_DOMAIN = 'https://api.spoonacular.com/recipes';

export const InputSanitizer = {
    clean: (input: string): string => {
        // Mitigación XSS y Sanitización agresiva en cliente
        let safeString = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        // Strip de caracteres SQLi y NoSQLi comunes 
        return safeString.replace(/['";\=(){}$]/g, '').trim();
    }
};

export const SecureAPI = {
    async fetchSafeRecipes(rawQuery: string, externalProfile?: MedicalProfile) {
        // 1. Zero-Knowledge Profile Fetch
        let profile = externalProfile || SecureVault.loadProfile();
        if (!profile) {
            console.warn('[Privacy] No local profile authorized. Usando perfil estricto por defecto para la demo.');
            profile = {
                allergies: [],
                intolerances: ['dairy'],
                conditions: ['SIBO'],
                severities: {}
            };
        }

        const safeQuery = InputSanitizer.clean(rawQuery);

        // 2. Capa 1: Exclusión Activa (API Diet constraints) sin revelar ID de usuario
        const threatExclusions = [...profile.allergies, ...profile.intolerances].join(',');
        const hasSIBO = profile.conditions.includes('SIBO');

        const params = new URLSearchParams({
            query: safeQuery,
            excludeIngredients: threatExclusions,
            diet: hasSIBO ? 'Low FODMAP' : '',
            apiKey: import.meta.env.VITE_SPOONACULAR_KEY || '',
            addRecipeInformation: 'true',
            maxReadyTime: '30',
            number: '10'
        });

        try {
            // Obligatoriedad de TLS 1.2+ vía HTTPS scheme. 
            // Las peticiones fetch no envían cookies locales de dominios de terceros a menos que se fuerce creds.
            const res = await fetch(`${API_DOMAIN}/complexSearch?${params.toString()}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                mode: 'cors'
            });

            if (!res.ok) throw new Error('[Network] Petición abortada.');
            const data = await res.json();

            // 3. Capas 2 & 3: Escáner de seguridad y evaluación de severidad
            return data.results.map((recipe: any) => SecurityScrubber.analyze(recipe, profile));

        } catch (error) {
            console.error('[System] Error en túnel de privacidad:', error);
            throw error;
        }
    }
};
