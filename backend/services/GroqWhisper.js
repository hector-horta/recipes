const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

export async function transcribeAudio(audioBuffer, apiKey, language = 'es') {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', language);
  formData.append('response_format', 'text');

  const res = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq Whisper error (${res.status}): ${errText}`);
  }

  const text = await res.text();
  return text.trim();
}
