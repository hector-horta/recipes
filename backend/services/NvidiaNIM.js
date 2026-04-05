const NVIDIA_API_BASE = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_CV_BASE = 'https://ai.api.nvidia.com/v1/cv';

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

async function nvidiaCVRequest(endpoint, body, apiKey) {
  const res = await fetch(`${NVIDIA_CV_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`NVIDIA NIM CV error (${res.status}): ${errText}`);
  }

  return res.json();
}

async function nvidiaImageRequest(body, apiKey) {
  const res = await fetch(`${NVIDIA_API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`NVIDIA NIM Image error (${res.status}): ${errText}`);
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
  const { base64 } = await downloadImageAsBase64(imageUrl);

  const response = await nvidiaCVRequest('/nvidia/ocdrnet', {
    image: base64
  }, apiKey);

  const textLines = response?.metadata?.text || [];
  return textLines.join('\n').trim();
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
      "unit": string,
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
    temperature: 0.2
  }, apiKey);

  let cleaned = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse Llama 4 response as JSON');
  }
}

export async function generateRecipeImage(prompt, apiKey) {
  const decoratedPrompt = `Professional editorial food photography of ${prompt}, 8k, macro lens, soft natural lighting, high-end restaurant plating, vibrant colors, shallow depth of field --ar 16:9`;

  const response = await nvidiaImageRequest({
    model: 'stabilityai/stable-diffusion-xl',
    prompt: decoratedPrompt,
    height: 768,
    width: 1344,
    cfg_scale: 7,
    steps: 30
  }, apiKey);

  const imageData = response.data?.[0]?.b64_json;
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

  const filename = `${Date.now()}.png`;
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
