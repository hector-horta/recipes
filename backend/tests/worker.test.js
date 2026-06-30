import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockFindByPk = vi.fn();
const mockClearCache = vi.fn().mockResolvedValue(undefined);
const mockGenerateImage = vi.fn();
const mockExistsSync = vi.fn(() => false);
const mockUnlinkSync = vi.fn();

vi.mock('../config/env.js', () => ({
  config: {
    NVIDIA_API_KEY: 'test-nvidia-key',
    GEMINI_API_KEY: 'test-gemini-key',
  }
}));

vi.mock('../config/bullmq.js', () => ({
  JOB_TYPES: {
    GENERATE_IMAGE: 'generate-image',
    INGEST_IMAGE: 'ingest-image',
    INGEST_IMAGES: 'ingest-images',
    INGEST_TEXT: 'ingest-text',
    INGEST_AUDIO: 'ingest-audio',
  },
}));

// Mock the entire chain that causes DB/Redis connections
vi.mock('ioredis', () => ({ default: vi.fn(function () {}) }));
vi.mock('../config/database.js', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
  sequelize: {
    define: vi.fn(() => ({})),
    authenticate: vi.fn().mockResolvedValue(undefined),
    sync: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../models/ActivityLog.js', () => ({
  ActivityLog: {
    findAll: vi.fn(), create: vi.fn(), belongsTo: vi.fn(),
  }
}));
vi.mock('../models/Organization.js', () => ({
  Organization: {
    findByPk: vi.fn(), hasMany: vi.fn(),
  }
}));

vi.mock('../models/Recipe.js', () => ({
  Recipe: { findByPk: (...a) => mockFindByPk(...a) },
}));

vi.mock('../services/RecipeProvider.js', () => ({
  RecipeProvider: { clearCache: () => mockClearCache() },
}));

vi.mock('../services/NvidiaNIM.js', () => ({
  generateRecipeImage: (...a) => mockGenerateImage(...a),
}));

vi.mock('../services/ActivityLogger.js', () => ({
  ActivityLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: (...a) => mockExistsSync(...a),
      unlinkSync: (...a) => mockUnlinkSync(...a),
    },
  };
});

// ── Import the extracted handlers ───────────────────────────────────────────

const { processJob, handleGenerateImage } = await import('../services/workerHandlers.js');

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockJob(overrides = {}) {
  return {
    id: 'job-1',
    name: 'generate-image',
    attemptsMade: 0,
    data: {
      recipeId: 'recipe-123',
      title: 'Test Recipe',
      feedback: 'warmer tones',
      details: { title_en: 'Test Recipe' },
    },
    updateProgress: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockRecipe(overrides = {}) {
  return {
    id: 'recipe-123',
    title_en: 'Test Recipe',
    image_url: null,
    image_filename: null,
    save: vi.fn().mockResolvedValue(undefined),
    toJSON: vi.fn(() => ({ title_en: 'Test Recipe' })),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('services/workerHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  describe('processJob dispatcher', () => {
    it('should dispatch generate-image jobs to handleGenerateImage', async () => {
      const recipe = createMockRecipe();
      mockFindByPk.mockResolvedValue(recipe);
      mockGenerateImage.mockResolvedValue({ url: '/img.jpg', filename: 'img.jpg' });

      const job = createMockJob();
      const result = await processJob(job);

      expect(result.recipeId).toBe('recipe-123');
      expect(mockGenerateImage).toHaveBeenCalled();
    });

    it('should throw for unknown job types', async () => {
      const job = createMockJob({ name: 'unknown-type' });
      await expect(processJob(job)).rejects.toThrow('Unknown job type: unknown-type');
    });
  });

  describe('handleGenerateImage', () => {
    it('should throw if recipe is not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      const job = createMockJob();

      await expect(handleGenerateImage(job)).rejects.toThrow('Recipe recipe-123 not found.');
    });

    it('should generate image and persist result to DB', async () => {
      const recipe = createMockRecipe();
      mockFindByPk.mockResolvedValue(recipe);
      mockGenerateImage.mockResolvedValue({
        url: '/public/recipes/new-image.jpg',
        filename: 'new-image.jpg',
      });

      const job = createMockJob();
      const result = await handleGenerateImage(job);

      expect(mockGenerateImage).toHaveBeenCalledWith(
        'Test Recipe', 'test-nvidia-key', 'warmer tones', { title_en: 'Test Recipe' },
      );
      expect(recipe.image_url).toBe('/public/recipes/new-image.jpg');
      expect(recipe.image_filename).toBe('new-image.jpg');
      expect(recipe.save).toHaveBeenCalledOnce();
      expect(mockClearCache).toHaveBeenCalledOnce();
      expect(result).toEqual({
        recipeId: 'recipe-123',
        imageUrl: '/public/recipes/new-image.jpg',
        filename: 'new-image.jpg',
      });
    });

    it('should report progress at 10%, 30%, 80%, 100%', async () => {
      const recipe = createMockRecipe();
      mockFindByPk.mockResolvedValue(recipe);
      mockGenerateImage.mockResolvedValue({ url: '/img.jpg', filename: 'img.jpg' });

      const job = createMockJob();
      await handleGenerateImage(job);

      const progressCalls = job.updateProgress.mock.calls.map(c => c[0]);
      expect(progressCalls).toEqual([10, 30, 80, 100]);
    });

    it('should use recipe.title_en as fallback when job.data.title is missing', async () => {
      const recipe = createMockRecipe({ title_en: 'Fallback Title' });
      mockFindByPk.mockResolvedValue(recipe);
      mockGenerateImage.mockResolvedValue({ url: '/img.jpg', filename: 'img.jpg' });

      const job = createMockJob({ data: { recipeId: 'recipe-123' } });
      await handleGenerateImage(job);

      expect(mockGenerateImage).toHaveBeenCalledWith(
        'Fallback Title', expect.any(String), '', expect.anything(),
      );
    });

    it('should attempt to clean up old image file if it exists', async () => {
      mockExistsSync.mockReturnValue(true);
      const recipe = createMockRecipe({ image_filename: 'old-image.jpg' });
      mockFindByPk.mockResolvedValue(recipe);
      mockGenerateImage.mockResolvedValue({ url: '/img.jpg', filename: 'img.jpg' });

      const job = createMockJob();
      await handleGenerateImage(job);

      expect(mockExistsSync).toHaveBeenCalled();
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it('should not fail if old image cleanup throws', async () => {
      mockExistsSync.mockReturnValue(true);
      mockUnlinkSync.mockImplementation(() => { throw new Error('EACCES'); });

      const recipe = createMockRecipe({ image_filename: 'locked.jpg' });
      mockFindByPk.mockResolvedValue(recipe);
      mockGenerateImage.mockResolvedValue({ url: '/img.jpg', filename: 'img.jpg' });

      const job = createMockJob();
      const result = await handleGenerateImage(job);
      expect(result.imageUrl).toBe('/img.jpg');
    });
  });
});
