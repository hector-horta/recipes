import { db } from '../db/db';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const MedicalRegistry = {
    async syncTriggers(): Promise<Record<string, string[]>> {
        console.log('[MedicalRegistry] Verificando versión del registro médico...');

        try {
            // Check version or just sync (simplified for this refactor)
            const REMOTE_VERSION = "2024.03.19.01"; 
            
            const cachedMetadata = await db.medicalMetadata.get('triggers');
            
            if (cachedMetadata && cachedMetadata.version === REMOTE_VERSION) {
                console.log('[MedicalRegistry] La versión local ya está actualizada.');
                return cachedMetadata.data;
            }

            console.log('[MedicalRegistry] Nueva versión detectada. Sincronizando desde backend...');
            
            const response = await fetch(`${API_URL}/api/medical/triggers`);
            if (!response.ok) throw new Error('Failed to fetch triggers from backend');
            
            const updatedTriggers = await response.json();

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
            return cached?.data || {}; // Empty object as ultimate fallback
        }
    },

    async getLatestTriggers(): Promise<Record<string, string[]>> {
        const cached = await db.medicalMetadata.get('triggers');
        if (!cached) {
            return this.syncTriggers();
        }
        return cached.data;
    }
};
