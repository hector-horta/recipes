import { GoogleGenAI } from "@google/genai";
import { config } from '../config/env.js';
import ActivityLogger from './ActivityLogger.js';

/**
 * Service for interacting with Google Gemini API for image generation.
 */
class GeminiService {
  constructor() {
    this.modelId = config.GEMINI_IMAGE_MODEL || "imagen-4.0-generate-001";
    
    if (!config.GEMINI_API_KEY) {
      ActivityLogger.warn('⚠️ GEMINI_API_KEY is not configured. GeminiService will be disabled.');
      this.client = null;
      return;
    }
    
    try {
      this.client = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    } catch (error) {
      ActivityLogger.error('❌ Failed to initialize Gemini client:', error);
      this.client = null;
    }
  }

  /**
   * Generates a high-quality image for a recipe.
   * @param {string} recipeTitle - The title of the dish.
   * @param {string} feedback - Optional feedback to refine the image.
   * @returns {Promise<Buffer|null>} - The image buffer or null if failed.
   */
  async generateRecipeImage(recipeTitle, feedback = '') {
    if (!recipeTitle || typeof recipeTitle !== 'string') {
      ActivityLogger.warn('⚠️ Invalid recipeTitle provided to GeminiService.generateRecipeImage');
      return null;
    }

    if (!this.client) {
      ActivityLogger.error('❌ Gemini API client not initialized. Check your configuration.');
      return null;
    }

    try {
      const dishStyle = this._getDishSpecificStyle(recipeTitle);
      const basePrompt = `A professional, high-end commercial photo of ${recipeTitle}`;
      const styleEnhancers = `ultra-realistic food photography, Michelin star plating, ${dishStyle}, high resolution 8k, cinematic lighting, macro lens, shallow depth of field, vibrant natural colors, clean elegant background`;
      const qualityConstraints = "no text, no watermarks, no blurry edges, no low resolution, no artificial colors, no distorted objects, no messy background";
      
      const finalPrompt = feedback 
        ? `${basePrompt}. Style: ${styleEnhancers}. Constraints: ${qualityConstraints}. IMPORTANT: Apply this feedback: ${feedback}`
        : `${basePrompt}. Style: ${styleEnhancers}. Constraints: ${qualityConstraints}`;

      ActivityLogger.info(`🎨 Generating image for "${recipeTitle}"`, { 
        style: dishStyle,
        hasFeedback: !!feedback
      });
      
      const result = await this.client.models.generateImages({
        model: this.modelId,
        prompt: finalPrompt
      });

      const imageData = result.generatedImages?.[0]?.image?.imageBytes;
      
      if (imageData) {
        return Buffer.from(imageData, 'base64');
      }
      
      ActivityLogger.error('❌ No image data found in Gemini response', { 
        recipeTitle,
        result: JSON.stringify(result).substring(0, 500)
      });
      return null;
    } catch (error) {
      ActivityLogger.error('❌ Gemini Image Generation Error:', error);
      
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        ActivityLogger.warn('💡 Tip: Gemini quota exceeded. Check billing or free tier limits.');
      }
      
      return null;
    }
  }

  /**
   * Determines the specific visual style based on the dish title.
   * @private
   */
  _getDishSpecificStyle(title) {
    const t = title.toLowerCase();
    if (t.includes('soup') || t.includes('sopa') || t.includes('stew') || t.includes('crema') || t.includes('potaje')) {
      return "steam rising softly, rustic ceramic bowl, garnish on top, warm cozy atmosphere, side of artisan bread";
    }
    if (t.includes('salad') || t.includes('ensalada') || t.includes('poke') || t.includes('bowl')) {
      return "fresh crisp textures, vibrant vegetables, light overhead lighting, clean white plate, healthy organic aesthetic";
    }
    if (t.includes('cake') || t.includes('dessert') || t.includes('postre') || t.includes('sweet') || t.includes('tarta') || t.includes('dulce')) {
      return "elegant dessert presentation, dusting of powdered sugar, chocolate drizzle, delicate fork, soft pastel background, professional pastry shop quality";
    }
    if (t.includes('drink') || t.includes('bebestible') || t.includes('juice') || t.includes('cocktail') || t.includes('smoothie') || t.includes('jugo')) {
      return "refreshing glass, ice cubes, condensation on glass, fruit garnish, backlit lighting, sparkling highlights";
    }
    if (t.includes('pasta') || t.includes('spaghetti') || t.includes('tallarines')) {
      return "twirled pasta on plate, dusting of parmesan, fresh basil leaf, glossy sauce, Mediterranean light";
    }
    if (t.includes('meat') || t.includes('steak') || t.includes('chicken') || t.includes('carne') || t.includes('pollo') || t.includes('cerdo') || t.includes('pork') || t.includes('beef')) {
      return "perfectly seared texture, grill marks, succulent appearance, garnish of herbs, high-end restaurant plating, rich savory colors";
    }
    if (t.includes('fish') || t.includes('salmon') || t.includes('seafood') || t.includes('pescado') || t.includes('marisco') || t.includes('camaron') || t.includes('shrimp')) {
      return "fresh glistening texture, lemon wedge on side, delicate herbs, light airy atmosphere, elegant seafood restaurant style";
    }
    if (t.includes('rice') || t.includes('arroz') || t.includes('paella') || t.includes('risotto')) {
      return "perfectly cooked grains, steam rising, colorful inclusions, garnish, warm lighting, cast iron or ceramic dish";
    }
    if (t.includes('pizza') || t.includes('bread') || t.includes('pan') || t.includes('burger') || t.includes('sandwich') || t.includes('taco') || t.includes('burrito')) {
      return "appetizing layers and textures, melted cheese (if applicable), rustic wooden board, natural warm lighting, casual but gourmet presentation";
    }
    return "gourmet plating, appetizing textures, professional studio lighting, clean composition";
  }
}

export default new GeminiService();
