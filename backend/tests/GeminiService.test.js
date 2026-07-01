import { describe, it, expect, vi, beforeEach } from 'vitest';
import geminiService from '../services/GeminiService.js';
import { GoogleGenAI } from "@google/genai";
import ActivityLogger from '../services/ActivityLogger.js';

vi.mock("@google/genai", () => {
  const generateImagesMock = vi.fn();
  const generateContentMock = vi.fn();
  
  const models = {
    generateImages: generateImagesMock,
    generateContent: generateContentMock
  };
  
  function GoogleGenAI() {
    this.models = models;
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
    ActivityLogger: mockLogger
  };
});

vi.mock("../config/env.js", () => ({
  config: {
    GEMINI_API_KEY: 'test-key',
    GEMINI_IMAGE_MODEL: 'test-model'
  }
}));

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure the client is reset if needed, though it's a singleton
  });

  describe('generateRecipeImage', () => {
    it('should return a buffer on success', async () => {
      const mockImageData = Buffer.from('fake-image-data').toString('base64');
      const mockResponse = {
        generatedImages: [{
          image: { imageBytes: mockImageData }
        }]
      };

      const genAIInstance = new GoogleGenAI();
      genAIInstance.models.generateImages.mockResolvedValue(mockResponse);

      const result = await geminiService.generateRecipeImage('Tasty Cake');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('fake-image-data');
      expect(ActivityLogger.info).toHaveBeenCalledWith(expect.stringContaining('Generating image for "Tasty Cake"'), expect.objectContaining({
        hasFeedback: false,
        hasDetails: false
      }));
      
      // Verify prompt construction and config
      expect(genAIInstance.models.generateImages).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('tasty cake'),
        config: expect.objectContaining({
          numberOfImages: 1,
          aspectRatio: "1:1"
        })
      }));
    });

    it('should clean the recipe title of exclusion and diet terms', async () => {
      const mockResponse = {
        generatedImages: [{
          image: { imageBytes: Buffer.from('image').toString('base64') }
        }]
      };

      const genAIInstance = new GoogleGenAI();
      genAIInstance.models.generateImages.mockResolvedValue(mockResponse);

      await geminiService.generateRecipeImage('Hot Chocolate without milk');

      expect(genAIInstance.models.generateImages).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('hot chocolate'),
      }));
      // Should not contain "without milk"
      const promptArgument = genAIInstance.models.generateImages.mock.calls[0][0].prompt;
      expect(promptArgument).not.toContain('without milk');
    });

    it('should include ingredients in prompt when details are provided', async () => {
      const mockResponse = {
        generatedImages: [{
          image: { imageBytes: Buffer.from('image').toString('base64') }
        }]
      };

      const genAIInstance = new GoogleGenAI();
      genAIInstance.models.generateImages.mockResolvedValue(mockResponse);

      const details = {
        ingredients: [{ name: { en: 'Sugar' } }, { name: { en: 'Flour' } }]
      };

      await geminiService.generateRecipeImage('Cake', '', details);

      expect(genAIInstance.models.generateImages).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Featuring ingredients like Sugar, Flour')
      }));
      expect(ActivityLogger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        hasDetails: true
      }));
    });

    it('should include feedback in prompt when provided', async () => {
      const mockResponse = {
        generatedImages: [{
          image: { imageBytes: Buffer.from('image').toString('base64') }
        }]
      };

      const genAIInstance = new GoogleGenAI();
      genAIInstance.models.generateImages.mockResolvedValue(mockResponse);

      await geminiService.generateRecipeImage('Cake', 'Make it darker');

      expect(genAIInstance.models.generateImages).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('IMPORTANT: Apply this feedback to the visual style: Make it darker')
      }));
      expect(ActivityLogger.info).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        hasFeedback: true
      }));
    });

    it('should handle missing image data in response', async () => {
      const mockResponse = {
        generatedImages: []
      };

      const genAIInstance = new GoogleGenAI();
      genAIInstance.models.generateImages.mockResolvedValue(mockResponse);

      const result = await geminiService.generateRecipeImage('Tasty Cake');

      expect(result).toBeNull();
      expect(ActivityLogger.error).toHaveBeenCalledWith(expect.stringContaining('No image data found'), expect.any(Object));
    });

    it('should handle API errors', async () => {
      const genAIInstance = new GoogleGenAI();
      genAIInstance.models.generateImages.mockRejectedValue(new Error('Quota exceeded'));

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

    it('should use generateContent for gemini models', async () => {
      const mockImageData = Buffer.from('fake-gemini-image').toString('base64');
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              inlineData: { data: mockImageData }
            }]
          }
        }]
      };

      const originalModelId = geminiService.modelId;
      geminiService.modelId = 'gemini-3.1-flash-image';

      const genAIInstance = new GoogleGenAI();
      genAIInstance.models.generateContent.mockResolvedValue(mockResponse);

      const result = await geminiService.generateRecipeImage('Tasty Cake');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('fake-gemini-image');
      expect(genAIInstance.models.generateContent).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gemini-3.1-flash-image',
        contents: expect.stringContaining('tasty cake'),
        config: expect.objectContaining({
          responseModalities: ['IMAGE']
        })
      }));

      geminiService.modelId = originalModelId;
    });
  });
});
