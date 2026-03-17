import { db } from '../db/db';

// Fallback hardcoded list (original signatures)
export const DEFAULT_MEDICAL_TRIGGERS: Record<string, string[]> = {
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

export const MedicalRegistry = {
    async syncTriggers(): Promise<Record<string, string[]>> {
        console.log('[MedicalRegistry] Verificando versión del registro médico...');

        try {
            // Simulación de "Check de Versión" (Llamada ligera)
            // En una app real, esto podría ser un ETag o un campo 'version' en un JSON pequeño
            const REMOTE_VERSION = "2024.03.17.01"; // Simulado
            
            const cachedMetadata = await db.medicalMetadata.get('triggers');
            
            if (cachedMetadata && cachedMetadata.version === REMOTE_VERSION) {
                console.log('[MedicalRegistry] La versión local ya está actualizada. Saltando descarga para ahorrar red.');
                return cachedMetadata.data;
            }

            console.log('[MedicalRegistry] Nueva versión detectada. Sincronizando firmas...');
            
            // Simulación de descarga de datos pesados
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const updatedTriggers = { ...DEFAULT_MEDICAL_TRIGGERS };

            await db.medicalMetadata.put({
                id: 'triggers',
                data: updatedTriggers,
                version: REMOTE_VERSION,
                lastUpdated: new Date()
            });

            console.log('[MedicalRegistry] Sincronización completada con éxito.');
            return updatedTriggers;
        } catch (error) {
            console.warn('[MedicalRegistry] Error de red. Usando datos persistidos.', error);
            const cached = await db.medicalMetadata.get('triggers');
            return cached?.data || DEFAULT_MEDICAL_TRIGGERS;
        }
    },

    async getLatestTriggers(): Promise<Record<string, string[]>> {
        const cached = await db.medicalMetadata.get('triggers');
        return cached?.data || DEFAULT_MEDICAL_TRIGGERS;
    }
};
