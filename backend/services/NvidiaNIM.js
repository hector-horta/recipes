const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_GENAI_BASE = 'https://ai.api.nvidia.com/v1/genai';

async function nvidiaChatRequest(body, apiKey) {
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
    throw new Error(`NVIDIA NIM error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function nvidiaImageRequest(body, apiKey) {
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
    throw new Error(`NVIDIA SDXL error (${res.status}): ${errText}`);
  }

  return res.json();
}

async function downloadImageAsBase64(imageUrl) {
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

export async function analyzeAndStructureRecipe(rawText, apiKey) {
  const systemPrompt = `You are a professional recipe structuring engine. Your task is to analyze raw recipe text and return a STRICT JSON object with the following schema. NO markdown, NO explanation, ONLY valid JSON.

{
  "title": { "es": "...", "en": "..." },
  "prepTimeMinutes": number (calculate realistically by analyzing cooking verbs: passive verbs like "marinar", "reposar", "fermentar" add waiting time; active verbs like "hornear", "saltear", "hervir" add active cooking time),
  "cookTimeMinutes": number,
  "servings": number,
  "ingredients": [
    {
      "name": { "es": "...", "en": "..." },
      "quantity": string,
      "unit": { "es": "...", "en": "..." } (translate units: "taza"→"cup", "cucharada"→"tablespoon", "trozo"→"piece", "pizca"→"pinch", "al gusto"→"to taste"),
      "siboAlert": boolean (true if ingredient is a known high-FODMAP food)
    }
  ],
  "steps": [
    {
      "order": number,
      "instruction": { "es": "...", "en": "..." },
      "type": "active" | "passive" (based on verb analysis),
      "durationMinutes": number (estimated from context)
    }
  ],
  "tags": string[],
  "difficulty": "easy" | "medium" | "hard",
  "siboRiskLevel": "safe" | "caution" | "avoid" (based on ingredient analysis),
  "siboAlerts": string[] (list of specific high-FODMAP ingredients found)
}

CRITICAL RULES:
- Dual translation: ALL text fields must have both _es and _en versions
- Verb analysis: Identify passive vs active cooking verbs to calculate realistic prep_time
- SIBO filter: Cross-reference ingredients against known FODMAPs (garlic/ajo, onion/cebolla, leek/puerro, wheat/trigo, dairy/lácteos, legumes/legumbres, etc.)
- If prep time cannot be determined, estimate based on recipe type
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
    console.error('[NvidiaNIM] Raw Llama 4 response:', content);
    throw new Error('Failed to parse Llama 4 response as JSON. Raw response: ' + content.slice(0, 200));
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error('[NvidiaNIM] JSON parse failed for:', jsonMatch[0].slice(0, 500));
    throw new Error('Failed to parse Llama 4 response as JSON');
  }
}

export async function generateRecipeImage(prompt, apiKey) {
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

  console.log(`[SDXL] Image saved: ${filename}`);

  return {
    filename,
    url: `/public/recipes/${filename}`,
    filepath
  };
}
