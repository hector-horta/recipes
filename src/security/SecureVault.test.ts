import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecureVault, MedicalProfile } from '../security/SecureVault';

describe('SecureVault', () => {
    const mockProfile: MedicalProfile = {
        allergies: ['peanuts'],
        intolerances: ['lactose'],
        conditions: ['SIBO'],
        severities: { 'peanuts': 'anaphylactic' }
    };

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('should save and load a profile correctly', () => {
        SecureVault.saveProfile(mockProfile);
        const loadedProfile = SecureVault.loadProfile();
        
        expect(loadedProfile).toEqual(mockProfile);
    });

    it('should return null if no profile is saved', () => {
        const loadedProfile = SecureVault.loadProfile();
        expect(loadedProfile).toBeNull();
    });

    it('should encrypt data in localStorage', () => {
        SecureVault.saveProfile(mockProfile);
        const storedData = localStorage.getItem('sb_shield_profile');
        
        expect(storedData).not.toBeNull();
        expect(storedData).not.toContain('peanuts'); // Should be encrypted
    });

    it('should handle decryption errors gracefully', () => {
        localStorage.setItem('sb_shield_profile', 'invalid-encrypted-data');
        const loadedProfile = SecureVault.loadProfile();
        
        expect(loadedProfile).toBeNull();
    });

    it('should convert UserProfile to MedicalProfile correctly', () => {
        const userProfile: any = {
            id: '1',
            name: 'Test',
            intolerances: ['dairy'],
            conditions: ['SIBO'],
            severities: { 'dairy': 'moderate' as const },
            email: 'test@test.com'
        };

        const converted = SecureVault.fromUserProfile(userProfile);
        
        expect(converted.intolerances).toEqual(['dairy']);
        expect(converted.conditions).toEqual(['SIBO']);
        expect(converted.severities).toEqual({ 'dairy': 'moderate' });
        expect(converted.allergies).toEqual([]);
    });
});
