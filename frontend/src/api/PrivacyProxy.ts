import DOMPurify from 'dompurify';
import { SecureVault, type MedicalProfile } from '../security/SecureVault';
import { SecurityScrubber } from './SecurityScrubber';
import { db } from '../db/db';

const API_DOMAIN = '';

console.log(`[PrivacyProxy] Initialized: Domain=${API_DOMAIN}`);

export const InputSanitizer = {
    clean: (input: string): string => {
        let safeString = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        return safeString.replace(/['";\=(){}$]/g, '').trim();
    }
};

export const SecureAPI = {
    async fetchSafeRecipes(rawQuery: string, externalProfile?: MedicalProfile, forceRefresh = false, extraParams: Record<string, string> = {}) {
        let profile = externalProfile || SecureVault.loadProfile();
        if (!profile) {
            profile = {
                allergies: [],
                intolerances: [],
                conditions: [],
                severities: {}
            };
        }

        const safeQuery = InputSanitizer.clean(rawQuery);

        const isRandom = extraParams.sort === 'random';
        if (!forceRefresh && !isRandom) {
            const queryCache = await db.searchCache.get(safeQuery.toLowerCase());
            
            if (queryCache && Array.isArray(queryCache.results)) {
                const cachedRecipes = await db.cachedRecipes
                    .where('id')
                    .anyOf(queryCache.results)
                    .toArray();
                
                if (cachedRecipes.length === queryCache.results.length) {
                    const hasNewSchema = cachedRecipes.every((item: any) => item.data && Array.isArray(item.data.ingredients));
                    if (hasNewSchema) {
                        console.log(`[Cache] Cargando ${cachedRecipes.length} recetas desde almacenamiento local...`);
                        const recipeMap = new Map(cachedRecipes.map(r => [r.id, r.data]));
                        return queryCache.results.map((id: string) => recipeMap.get(id));
                    }
                }
                await db.searchCache.delete(safeQuery.toLowerCase());
            }
        }

        const params = new URLSearchParams({
            query: safeQuery,
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
                throw new Error('[Network] Petición abortada.');
            }
            const data = await res.json();

            const analyzedRecipes = data.map((recipe: any) => SecurityScrubber.analyze(recipe, profile));

            if (!isRandom) {
                const recipeEntries = analyzedRecipes.map((recipe: any) => ({
                    id: recipe.id.toString(),
                    data: recipe,
                    timestamp: Date.now()
                }));
                await db.cachedRecipes.bulkPut(recipeEntries);

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
