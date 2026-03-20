import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MedicalRegistry } from '../api/MedicalRegistry';
import { db } from '../db/db';

const MOCK_TRIGGERS = { 'dairy': ['milk'] };

// Mock Dexie db
vi.mock('../db/db', () => ({
    db: {
        medicalMetadata: {
            get: vi.fn(),
            put: vi.fn()
        }
    }
}));

// Mock Fetch
global.fetch = vi.fn();

describe('MedicalRegistry', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => MOCK_TRIGGERS
        });
    });

    it('should return updated triggers if no cached data exists', async () => {
        (db.medicalMetadata.get as any).mockResolvedValue(null);
        
        const triggers = await MedicalRegistry.getLatestTriggers();
        expect(triggers).toEqual(MOCK_TRIGGERS);
    });

    it('should return cached triggers if they exist', async () => {
        const mockCached = { data: { 'test': ['trigger'] } };
        (db.medicalMetadata.get as any).mockResolvedValue(mockCached);
        
        const triggers = await MedicalRegistry.getLatestTriggers();
        expect(triggers).toEqual(mockCached.data);
    });

    it('should skip sync if version is up to date', async () => {
        const mockCached = { version: "2024.03.19.01", data: { 'test': ['trigger'] } };
        (db.medicalMetadata.get as any).mockResolvedValue(mockCached);
        
        const triggers = await MedicalRegistry.syncTriggers();
        
        // Use spyOn inside each test to avoid interference if needed, but here we just check put wasn't called
        expect(db.medicalMetadata.put).not.toHaveBeenCalled();
        expect(triggers).toEqual(mockCached.data);
    });

    it('should update triggers if version is different', async () => {
        (db.medicalMetadata.get as any).mockResolvedValue({ version: "old", data: {} });
        
        const triggers = await MedicalRegistry.syncTriggers();
        
        expect(db.medicalMetadata.put).toHaveBeenCalled();
        expect(triggers).toEqual(MOCK_TRIGGERS);
    });

    it('should fallback to cached data on error', async () => {
        const mockCached = { data: { 'fallback': ['trigger'] } };
        
        // Initial check before sync
        (db.medicalMetadata.get as any).mockResolvedValueOnce(null); 
        
        // Mock fetch error
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        // Fallback call in catch block
        (db.medicalMetadata.get as any).mockResolvedValueOnce(mockCached); 

        const triggers = await MedicalRegistry.syncTriggers();
        expect(triggers).toEqual(mockCached.data);
    });
});
