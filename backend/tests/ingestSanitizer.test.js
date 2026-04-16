import { sanitizeStructuredRecipe } from '../utils/ingestSanitizer.js';
import { describe, it, expect, vi } from 'vitest';

// Mock tagTranslations to keep tests synchronous/predictable where possible
vi.mock('../utils/tagTranslations.js', () => ({
  normalizeTags: vi.fn(tags => Promise.resolve(tags))
}));

describe('Ingest Sanitizer Tests', () => {
  it('should map Spanish difficulty to ENUM values', async () => {
    const input = { difficulty: 'Fácil' };
    const sanitized = await sanitizeStructuredRecipe(input);
    expect(sanitized.difficulty).toBe('easy');

    const input2 = { difficulty: 'Alta' };
    const sanitized2 = await sanitizeStructuredRecipe(input2);
    expect(sanitized2.difficulty).toBe('hard');
  });

  it('should map SIBO risk colors/Spanish to ENUM values', async () => {
    const input = { siboRiskLevel: 'Amarillo' };
    const sanitized = await sanitizeStructuredRecipe(input);
    expect(sanitized.siboRiskLevel).toBe('caution');

    const input2 = { siboRiskLevel: 'seguro' };
    const sanitized2 = await sanitizeStructuredRecipe(input2);
    expect(sanitized2.siboRiskLevel).toBe('safe');
  });

  it('should parse numeric strings for times and servings', async () => {
    const input = { 
      prepTimeMinutes: '15 min', 
      cookTimeMinutes: '1 hora 30 min',
      servings: '4 personas'
    };
    const sanitized = await sanitizeStructuredRecipe(input);
    expect(sanitized.prepTimeMinutes).toBe(15);
    expect(sanitized.cookTimeMinutes).toBe(1); // Note: Current logic only takes first digit sequence
    expect(sanitized.servings).toBe(4);
  });

  it('should ensure mandatory title fields exist', async () => {
    const input = { title: { es: 'Gazpacho' } };
    const sanitized = await sanitizeStructuredRecipe(input);
    expect(sanitized.title.es).toBe('Gazpacho');
    expect(sanitized.title.en).toBe('Gazpacho');

    const inputEmpty = {};
    const sanitizedEmpty = await sanitizeStructuredRecipe(inputEmpty);
    expect(sanitizedEmpty.title.es).toBe('Receta sin título');
  });

  it('should ensure ingredients and steps are arrays', async () => {
    const input = { ingredients: null, steps: undefined };
    const sanitized = await sanitizeStructuredRecipe(input);
    expect(Array.isArray(sanitized.ingredients)).toBe(true);
    expect(Array.isArray(sanitized.steps)).toBe(true);
  });

  it('should preserve already valid values', async () => {
    const input = { difficulty: 'hard', siboRiskLevel: 'avoid' };
    const sanitized = await sanitizeStructuredRecipe(input);
    expect(sanitized.difficulty).toBe('hard');
    expect(sanitized.siboRiskLevel).toBe('avoid');
  });
});
