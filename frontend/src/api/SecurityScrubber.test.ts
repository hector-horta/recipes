import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SecurityScrubber } from '../api/SecurityScrubber';
import { MedicalProfile } from '../security/SecureVault';
import { MedicalRegistry } from '../api/MedicalRegistry';

describe('SecurityScrubber', () => {
    const mockProfile: MedicalProfile = {
        allergies: ['peanut'],
        intolerances: ['dairy'],
        conditions: ['SIBO'],
        severities: { 'peanut': 'anaphylactic', 'dairy': 'moderate' }
    };

    const safeRecipe = {
        title: 'Fresh Salad',
        ingredients: [{ name: 'Lettuce' }, { name: 'Tomato' }],
        instructions: ['Wash and chop vegetables.', 'Mix everything.']
    };

    const dangerousRecipe = {
        title: 'Peanut Butter Cookies',
        ingredients: [{ name: 'Peanut butter' }, { name: 'Flour' }],
        instructions: ['Mix peanut butter and flour.']
    };

    const warningRecipe = {
        title: 'Cheese Cake',
        ingredients: [{ name: 'Cream cheese' }, { name: 'Milk' }],
        instructions: ['Mix cheese and milk.']
    };

    const siboRecipe = {
        title: 'Garlic Pasta',
        ingredients: [{ name: 'Pasta' }, { name: 'Garlic' }],
        instructions: ['Cook pasta with garlic.']
    };

    beforeEach(async () => {
        vi.spyOn(MedicalRegistry, 'getLatestTriggers').mockResolvedValue({
            'dairy': ['milk', 'cheese', 'cream'],
            'peanut': ['peanut butter', 'groundnut'],
            'sibo': ['garlic', 'onion']
        });
        await SecurityScrubber.initialize();
    });

    it('should clear a safe recipe', () => {
        const result = SecurityScrubber.analyze(safeRecipe, mockProfile);
        
        expect(result.securityDisclosure.isCleared).toBe(true);
        expect(result.securityDisclosure.riskLevel).toBe('SAFE');
        expect(result.securityDisclosure.findings).toHaveLength(0);
    });

    it('should flag a dangerous recipe (Anaphylactic/Severe)', () => {
        const result = SecurityScrubber.analyze(dangerousRecipe, mockProfile);
        
        expect(result.securityDisclosure.isCleared).toBe(false);
        expect(result.securityDisclosure.riskLevel).toBe('DANGER');
        expect(result.securityDisclosure.findings.some((f: string) => f.includes('PEANUT'))).toBe(true);
    });

    it('should flag a warning recipe (Moderate/Mild)', () => {
        const result = SecurityScrubber.analyze(warningRecipe, mockProfile);
        
        expect(result.securityDisclosure.isCleared).toBe(true);
        expect(result.securityDisclosure.riskLevel).toBe('WARNING');
        expect(result.securityDisclosure.findings.some((f: string) => f.includes('DAIRY'))).toBe(true);
    });

    it('should detect SIBO triggers if SIBO condition is present', () => {
        const result = SecurityScrubber.analyze(siboRecipe, mockProfile);
        
        expect(result.securityDisclosure.riskLevel).toBe('WARNING');
        expect(result.securityDisclosure.findings.some((f: string) => f.includes('SIBO'))).toBe(true);
    });

    it('should not detect SIBO triggers if SIBO condition is absent', () => {
        const noSiboProfile: MedicalProfile = { ...mockProfile, conditions: [] };
        const result = SecurityScrubber.analyze(siboRecipe, noSiboProfile);
        
        expect(result.securityDisclosure.riskLevel).toBe('SAFE');
    });
});
