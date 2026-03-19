import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicalRegistry, DEFAULT_MEDICAL_TRIGGERS } from '../api/MedicalRegistry';
import { db } from '../db/db';

// Mock Dexie db
vi.mock('../db/db', () => ({
    db: {
        medicalMetadata: {
            get: vi.fn(),
            put: vi.fn()
        }
    }
}));

describe('MedicalRegistry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return default triggers if no cached data exists', async () => {
        (db.medicalMetadata.get as any).mockResolvedValue(null);
        
        const triggers = await MedicalRegistry.getLatestTriggers();
        expect(triggers).toEqual(DEFAULT_MEDICAL_TRIGGERS);
    });

    it('should return cached triggers if they exist', async () => {
        const mockCached = { data: { 'test': ['trigger'] } };
        (db.medicalMetadata.get as any).mockResolvedValue(mockCached);
        
        const triggers = await MedicalRegistry.getLatestTriggers();
        expect(triggers).toEqual(mockCached.data);
    });

    it('should skip sync if version is up to date', async () => {
        const mockCached = { version: "2024.03.17.01", data: { 'test': ['trigger'] } };
        (db.medicalMetadata.get as any).mockResolvedValue(mockCached);
        
        const triggers = await MedicalRegistry.syncTriggers();
        
        expect(db.medicalMetadata.put).not.toHaveBeenCalled();
        expect(triggers).toEqual(mockCached.data);
    });

    it('should update triggers if version is different', async () => {
        (db.medicalMetadata.get as any).mockResolvedValue({ version: "old", data: {} });
        
        const triggers = await MedicalRegistry.syncTriggers();
        
        expect(db.medicalMetadata.put).toHaveBeenCalled();
        expect(triggers).toEqual(DEFAULT_MEDICAL_TRIGGERS);
    });

    it('should fallback to cached data on error', async () => {
        const mockCached = { data: { 'fallback': ['trigger'] } };
        
        // Mock REMOTE_VERSION check to pass, then throw error during "download"
        (db.medicalMetadata.get as any).mockResolvedValueOnce(null); // Initial check
        
        // We need to mock the delay/timer to throw or just mock the logic inside syncTriggers
        // However, the error is caught in syncTriggers.
        
        // Let's mock a network error after the initial check
        vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => { throw new Error('Network error'); });

        (db.medicalMetadata.get as any).mockResolvedValueOnce(mockCached); // Fallback call in catch block

        const triggers = await MedicalRegistry.syncTriggers();
        expect(triggers).toEqual(mockCached.data);
        
        vi.restoreAllMocks();
    });
});
