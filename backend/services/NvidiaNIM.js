import { validateExternalUrl } from '../utils/urlValidator.js';
import { ActivityLogger } from './ActivityLogger.js';
import { withRetry } from '../utils/retry.js';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';

export async function nvidiaChatRequest(body, apiKey) {
  return withRetry(async () => {
    const res = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const error = new Error(`NVIDIA NIM error (${res.status}): ${errText}`);
      error.status = res.status;
      throw error;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }, { serviceName: 'NVIDIA Chat' });
}

async function downloadImageAsBase64(imageUrl) {
  validateExternalUrl(imageUrl);
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = res.headers.get('content-type') || 'image/png';
  return { base64, mimeType };
}

export async function extractTextFromImage(imageUrl, apiKey) {
  const { base64, mimeType } = await downloadImageAsBase64(imageUrl);

  const text = await nvidiaChatRequest({
    model: 'meta/llama-4-maverick-17b-128e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract ALL text from this recipe image. Return ONLY the raw text with ingredient lists, measurements, cooking steps, and any other recipe information. Do not add commentary. Maintain the original structure.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`
            }
          }
        ]
      }
    ],
    max_tokens: 4096,
    temperature: 0.1
  }, apiKey);

  return text;
}

export async function extractTextFromTwoImages(imageUrl1, imageUrl2, apiKey) {
  const img1 = await downloadImageAsBase64(imageUrl1);
  const img2 = await downloadImageAsBase64(imageUrl2);

  const text = await nvidiaChatRequest({
    model: 'meta/llama-4-maverick-17b-128e-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'These are two pages/parts of the same recipe. Each image contains a portion of the recipe — somewhere between the two images the text transitions from ingredients to preparation steps.\n\nExtract ALL text from BOTH images and combine them into a single continuous recipe text. Identify where the ingredients section ends and the preparation/cooking steps begin. Return ONLY the raw extracted text. Do not add commentary. Maintain the original structure.'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${img1.mimeType};base64,${img1.base64}`
            }
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${img2.mimeType};base64,${img2.base64}`
            }
          }
        ]
      }
    ],
    max_tokens: 4096,
    temperature: 0.1
  }, apiKey);

  return text;
}

export async function analyzeAndStructureRecipe(rawText, apiKey) {
  const systemPrompt = `You are a professional recipe structuring engine. Your task is to analyze raw recipe text and return a STRICT JSON object with the following schema. NO markdown, NO explanation, ONLY valid JSON.

{
  "title": { "es": "...", "en": "..." },
  "prepTimeMinutes": number,
  "cookTimeMinutes": number,
  "servings": number,
  "ingredients": [
    {
      "name": { "es": "...", "en": "..." },
      "quantity": string,
      "unit": { "es": "...", "en": "..." },
      "siboAlert": boolean
    }
  ],
  "steps": [
    {
      "order": number,
      "instruction": { "es": "...", "en": "..." },
      "type": "active" | "passive",
      "durationMinutes": number
    }
  ],
  "tags": [
    { "es": "string", "en": "string" }
  ],
  "difficulty": "easy" | "medium" | "hard",
  "siboRiskLevel": "safe" | "caution" | "avoid",
  "siboAlerts": string[]
}

CRITICAL RULES:
- Dual translation: ALL text fields MUST have both es and en versions.
- Time extraction: Extract "prepTimeMinutes" and "cookTimeMinutes". If they are NOT explicitly stated in the text, ESTIMATE them based on the steps. "prepTimeMinutes" should be the sum of preparation/mixing steps; "cookTimeMinutes" should be the sum of baking/cooking steps.
- Categories: Use ONLY these keys for categorization in tags: Drink (Bebestible), Dessert (Postre), Starter Dish (Entrada), Main Course (Plato Principal), Snack (Snack), Dressing/Salsa (Aderezo/Salsa).
- Highlights: Also include Vegan (Vegano), Gluten-free (Sin Gluten), Low FODMAP (Bajo en FODMAP) if applicable.
- SIBO filter: Cross-reference ingredients against known FODMAPs.
- Return ONLY the JSON object, no markdown code blocks, no extra text`;

  const content = await nvidiaChatRequest({
    model: 'meta/llama-4-maverick-17b-128e-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze and structure this recipe text into JSON:\n\n${rawText}` }
    ],
    max_tokens: 4096,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  }, apiKey);

  let cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Llama 4 response as JSON');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Failed to parse Llama 4 response as JSON');
  }
}

import geminiService from './GeminiService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename_nim = fileURLToPath(import.meta.url);
const __dirname_nim = path.dirname(__filename_nim);

export async function generateRecipeImage(prompt, apiKey, feedback = '') {
  try {
    const imageBuffer = await geminiService.generateRecipeImage(prompt, feedback);
    
    if (imageBuffer) {
      const filename = `recipe-${Date.now()}.jpg`;
      const publicPath = path.join(__dirname_nim, '..', 'public', 'recipes', filename);
      
      // Ensure directory exists
      const dir = path.dirname(publicPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(publicPath, imageBuffer);
      
      return {
        url: `/recipes/${filename}`,
        filename: filename
      };
    }
  } catch (error) {
    ActivityLogger.error('Gemini image generation failed', { error: error.message });
  }
  
  return { url: null, filename: null };
}

/**
 * Specifically classifies a recipe into canonical categories
 */
export async function classifyRecipe(recipe, apiKey) {
  const prompt = `Classify this recipe into EXACTLY ONE of these categories: Drink, Dessert, Starter Dish, Main Course, Snack, Dressing/Salsa.
  
Return ONLY the english key from this list: [bebestible, postre, entrada, plato_principal, snack, aderezo_salsa].

Recipe Title: ${recipe.title_en}
Ingredients: ${(recipe.ingredients || []).map(i => i.name?.en || i.name).join(', ')}

Return ONLY the key.`;

  const response = await nvidiaChatRequest({
    model: "meta/llama-4-maverick-17b-128e-instruct",
    messages: [
      { role: "system", content: "You are a recipe classifier. You MUST return ONLY the English key from the provided list, with NO punctuation and NO extra explanation." },
      { role: "user", content: prompt }
    ],
    temperature: 0,
    max_tokens: 10
  }, apiKey);

  return response.trim().toLowerCase().replace(/[^a-z_]/g, '');
}
