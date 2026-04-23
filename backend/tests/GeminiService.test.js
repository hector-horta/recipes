import { describe, it, expect, vi, beforeEach } from 'vitest';
import geminiService from '../services/GeminiService.js';
import { GoogleGenAI } from "@google/genai";
import ActivityLogger from '../services/ActivityLogger.js';

vi.mock("@google/genai", () => {
  const generateContentMock = vi.fn();
  const getGenerativeModelMock = vi.fn(() => ({
    generateContent: generateContentMock
  }));
  
  function GoogleGenAI() {
    this.getGenerativeModel = getGenerativeModelMock;
  }
  
  return { GoogleGenAI };
});

vi.mock("../services/ActivityLogger.js", () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn()
  };
  return {
    default: mockLogger,
    ActivityLogger: mockLogger // Keep named export just in case
  };
});

vi.mock("../config/env.js", () => ({
  config: {
    GEMINI_API_KEY: 'test-key'
  }
}));

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateRecipeImage', () => {
    it('should return a buffer on success', async () => {
      const mockImageData = Buffer.from('fake-image-data').toString('base64');
      const mockResponse = {
        response: Promise.resolve({
          candidates: [{
            content: {
              parts: [{ inlineData: { data: mockImageData } }]
            }
          }]
        })
      };

      const genAIInstance = new GoogleGenAI();
      const model = genAIInstance.getGenerativeModel({ model: 'any' });
      model.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateRecipeImage('Tasty Cake');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('fake-image-data');
      expect(ActivityLogger.info).toHaveBeenCalledWith(expect.stringContaining('Generating image for "Tasty Cake"'), expect.any(Object));
    });

    it('should handle missing image data in response', async () => {
      const mockResponse = {
        response: Promise.resolve({
          candidates: [{
            content: { parts: [] }
          }]
        })
      };

      const genAIInstance = new GoogleGenAI();
      const model = genAIInstance.getGenerativeModel({ model: 'any' });
      model.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateRecipeImage('Tasty Cake');

      expect(result).toBeNull();
      expect(ActivityLogger.error).toHaveBeenCalledWith(expect.stringContaining('No image data found'), expect.any(Object));
    });

    it('should handle API errors', async () => {
      const genAIInstance = new GoogleGenAI();
      const model = genAIInstance.getGenerativeModel({ model: 'any' });
      model.generateContent.mockRejectedValue(new Error('Quota exceeded'));

      const result = await geminiService.generateRecipeImage('Tasty Cake');

      expect(result).toBeNull();
      expect(ActivityLogger.error).toHaveBeenCalledWith(expect.stringContaining('Gemini Image Generation Error'), expect.any(Error));
    });

    it('should return null and log error if client is not initialized', async () => {
      // Temporarily nullify client
      const originalClient = geminiService.client;
      geminiService.client = null;

      const result = await geminiService.generateRecipeImage('Title');
      expect(result).toBeNull();
      expect(ActivityLogger.error).toHaveBeenCalledWith(expect.stringContaining('Gemini API client not initialized. Check your configuration.'));

      geminiService.client = originalClient;
    });

    it('should return null if recipeTitle is missing', async () => {
      const result = await geminiService.generateRecipeImage('');
      expect(result).toBeNull();
      expect(ActivityLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid recipeTitle'));
    });
  });
});
