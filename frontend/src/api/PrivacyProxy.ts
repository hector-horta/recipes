import DOMPurify from 'dompurify';
import { SecureVault, type MedicalProfile } from '../security/SecureVault';
import { SecurityScrubber } from './SecurityScrubber';
import { db } from '../db/db';
import { MOCK_RECIPE_DATA } from './MockData';

const API_DOMAIN = import.meta.env.VITE_API_URL || 'https://api.spoonacular.com/recipes';
const API_MODE = import.meta.env.VITE_API_MODE || 'MOCK';

console.log(`[PrivacyProxy] Initialized: Mode=${API_MODE}, Domain=${API_DOMAIN}`);

export const InputSanitizer = {
    clean: (input: string): string => {
        // Mitigación XSS y Sanitización agresiva en cliente
        let safeString = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        // Strip de caracteres SQLi y NoSQLi comunes 
        return safeString.replace(/['";\=(){}$]/g, '').trim();
    }
};

export const SecureAPI = {
    async fetchSafeRecipes(rawQuery: string, externalProfile?: MedicalProfile, forceRefresh = false) {
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

        // 2. Cache-First Logic
        if (!forceRefresh) {
            const cached = await db.cachedRecipes
                .where('query')
                .equals(safeQuery.toLowerCase())
                .toArray();
            
            if (cached.length > 0) {
                console.log(`[Cache] Cargando recetas (${API_MODE}) desde almacenamiento local...`);
                return cached.map(item => item.data);
            }
        }

        // 3. Dual-Mode Branching
        if (API_MODE === 'MOCK') {
            console.log('[Privacy] Operando en Modo MOCK (Desarrollo).');
            // Simulamos resultados filtrando nuestra semilla de datos
            const mockResults = MOCK_RECIPE_DATA.filter(r => 
                r.title.toLowerCase().includes(safeQuery.toLowerCase()) || safeQuery === 'healthy'
            );
            
            const analyzedMocks = mockResults.map(recipe => SecurityScrubber.analyze(recipe, profile));
            
            // Persistimos en caché para consistencia offline incluso en modo mock
            const cacheEntries = analyzedMocks.map(recipe => ({
                id: recipe.id,
                query: safeQuery.toLowerCase(),
                data: recipe,
                timestamp: Date.now()
            }));
            await db.cachedRecipes.bulkPut(cacheEntries);
            
            return analyzedMocks;
        }

        // 4. API Live Mode: Capa 1: Exclusión Activa
        const threatExclusions = [...profile.allergies, ...profile.intolerances].join(',');
        const hasSIBO = profile.conditions.includes('SIBO');

        const params = new URLSearchParams({
            query: safeQuery,
            excludeIngredients: threatExclusions,
            diet: hasSIBO ? 'Low FODMAP' : '',
            apiKey: import.meta.env.VITE_SPOONACULAR_KEY || '',
            addRecipeInformation: 'true',
            fillIngredients: 'true',
            number: '12'
        });

        try {
            const res = await fetch(`${API_DOMAIN}/complexSearch?${params.toString()}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                mode: 'cors'
            });

            if (!res.ok) throw new Error('[Network] Petición abortada.');
            const data = await res.json();

            // 4. Capas 2 & 3: Escáner de seguridad y evaluación de severidad
            const analyzedRecipes = data.results.map((recipe: any) => SecurityScrubber.analyze(recipe, profile));

            // 5. Persistencia en caché
            const cacheEntries = analyzedRecipes.map((recipe: any) => ({
                id: recipe.id,
                query: safeQuery.toLowerCase(),
                data: recipe,
                timestamp: Date.now()
            }));

            await db.cachedRecipes.bulkPut(cacheEntries);
            
            return analyzedRecipes;

        } catch (error) {
            console.error('[System] Error en túnel de privacidad:', error);
            throw error;
        }
    }
};
