import DOMPurify from 'dompurify';
import { SecureVault, type MedicalProfile } from '../security/SecureVault';
import { SecurityScrubber } from './SecurityScrubber';
import { db } from '../db/db';
import { MOCK_RECIPE_DATA } from './MockData';

const API_DOMAIN = import.meta.env.VITE_API_URL || 'http://localhost:5001';
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
    async fetchSafeRecipes(rawQuery: string, externalProfile?: MedicalProfile, forceRefresh = false, extraParams: Record<string, string> = {}) {
        // ... Zero-Knowledge Profile Fetch stays same ...
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

        // 2. Cache-First Logic (solo si no es random, para no cachear resultados aleatorios y perder la frescura)
        const isRandom = extraParams.sort === 'random';
        if (!forceRefresh && !isRandom) {
            const queryCache = await db.searchCache.get(safeQuery.toLowerCase());
            
            if (queryCache && Array.isArray(queryCache.results)) {
                const cachedRecipes = await db.cachedRecipes
                    .where('id')
                    .anyOf(queryCache.results)
                    .toArray();
                
                // Asegurarse de que tenemos todas las recetas y con el esquema correcto
                if (cachedRecipes.length === queryCache.results.length) {
                    const hasNewSchema = cachedRecipes.every((item: any) => item.data && Array.isArray(item.data.ingredients));
                    if (hasNewSchema) {
                        console.log(`[Cache] Cargando ${cachedRecipes.length} recetas (${API_MODE}) desde almacenamiento local...`);
                        // Devolver en el orden original del cache
                        const recipeMap = new Map(cachedRecipes.map(r => [r.id, r.data]));
                        return queryCache.results.map((id: string) => recipeMap.get(id));
                    }
                }
                // Si algo falta o es viejo, limpiamos la entrada de esta query
                await db.searchCache.delete(safeQuery.toLowerCase());
            }
        }

        // 3. Dual-Mode Branching
        if (API_MODE === 'MOCK') {
            console.log('[Privacy] Operando en Modo MOCK (Desarrollo).');
            let mockResults = MOCK_RECIPE_DATA.filter(r => 
                r.title.toLowerCase().includes(safeQuery.toLowerCase()) || safeQuery === 'healthy' || safeQuery === ''
            );
            
            if (isRandom) {
                mockResults = [...mockResults].sort(() => Math.random() - 0.5);
            }

            const analyzedMocks = mockResults.slice(0, Number(extraParams.number) || 10).map(recipe => SecurityScrubber.analyze(recipe, profile));
            
            if (!isRandom) {
                // Persistent storage for recipes
                const recipeEntries = analyzedMocks.map(recipe => ({
                    id: recipe.id.toString(),
                    data: recipe,
                    timestamp: Date.now()
                }));
                await db.cachedRecipes.bulkPut(recipeEntries);

                // Query results index
                await db.searchCache.put({
                    query: safeQuery.toLowerCase(),
                    results: analyzedMocks.map(r => r.id.toString()),
                    timestamp: Date.now()
                });
            }
            
            return analyzedMocks;
        }

        // 4. API Live Mode
        const threatExclusions = [...profile.allergies, ...profile.intolerances].join(',');
        const hasSIBO = profile.conditions.includes('SIBO');

        const params = new URLSearchParams({
            query: safeQuery,
            excludeIngredients: threatExclusions,
            diet: hasSIBO ? 'Low FODMAP' : '',
            number: extraParams.number || '10',
            ...extraParams
        });

        try {
            const token = localStorage.getItem('wati_jwt');
            const headers: Record<string, string> = { 'Accept': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${API_DOMAIN}/api/recipes?${params.toString()}`, {
                method: 'GET',
                headers,
                mode: 'cors'
            });

            if (!res.ok) {
                if (res.status === 402) {
                    throw new Error('Quota Exhausted');
                }
                throw new Error('[Network] Petición abortada.');
            }
            const data = await res.json();

            // 4. Capas 2 & 3: Escáner de seguridad y evaluación de severidad
            const analyzedRecipes = data.map((recipe: any) => SecurityScrubber.analyze(recipe, profile));

            // 5. Persistencia en caché (Idempotente)
            if (!isRandom) {
                const recipeEntries = analyzedRecipes.map((recipe: any) => ({
                    id: recipe.id.toString(),
                    data: recipe,
                    timestamp: Date.now()
                }));
                await db.cachedRecipes.bulkPut(recipeEntries);

                // Guardar el índice de resultados para esta query
                await db.searchCache.put({
                    query: safeQuery.toLowerCase(),
                    results: analyzedRecipes.map((r: any) => r.id.toString()),
                    timestamp: Date.now()
                });
            }
            
            return analyzedRecipes;

        } catch (error) {
            console.error('[System] Error en túnel de privacidad:', error);
            throw error;
        }
    }
};
