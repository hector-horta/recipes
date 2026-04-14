import { validateExternalUrl } from '../utils/urlValidator.js';
import { ActivityLogger } from './ActivityLogger.js';
import { withRetry } from '../utils/retry.js';

const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_GENAI_BASE = 'https://ai.api.nvidia.com/v1/genai';

async function nvidiaChatRequest(body, apiKey) {
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

async function nvidiaImageRequest(body, apiKey) {
  return withRetry(async () => {
    const res = await fetch(`${NVIDIA_GENAI_BASE}/stabilityai/stable-diffusion-xl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const error = new Error(`NVIDIA SDXL error (${res.status}): ${errText}`);
      error.status = res.status;
      throw error;
    }

    return res.json();
  }, { serviceName: 'NVIDIA Image' });
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
  "tags": string[],
  "difficulty": "easy" | "medium" | "hard",
  "siboRiskLevel": "safe" | "caution" | "avoid",
  "siboAlerts": string[]
}

CRITICAL RULES:
- Dual translation: ALL text fields must have both _es and _en versions
- SIBO filter: Cross-reference ingredients against known FODMAPs
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

export async function generateRecipeImage(prompt, apiKey) {
  return withRetry(async () => {
    const decoratedPrompt = `Professional editorial food photography of ${prompt}, 8k, macro lens, soft natural lighting, high-end restaurant plating, vibrant colors, shallow depth of field`;

    const response = await nvidiaImageRequest({
      text_prompts: [{ text: decoratedPrompt }],
      height: 1024,
      width: 1024,
      cfg_scale: 7,
      steps: 30
    }, apiKey);

    const imageData = response.artifacts?.[0]?.base64;
    if (!imageData) {
      throw new Error('No image data returned from SDXL');
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const recipesDir = path.join(__dirname, '..', 'public', 'recipes');
    if (!fs.existsSync(recipesDir)) {
      fs.mkdirSync(recipesDir, { recursive: true });
    }

    const filename = `${Date.now()}.jpg`;
    const filepath = path.join(recipesDir, filename);

    const buffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(filepath, buffer);

    ActivityLogger.info('SDXL Image saved', { filename, prompt: prompt.slice(0, 50) });

    return {
      filename,
      url: `/public/recipes/${filename}`,
      filepath
    };
  }, { serviceName: 'NVIDIA Image (Full)' });
}
