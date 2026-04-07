import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groqWhisper } from './GroqWhisper.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GroqWhisper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('transcribeAudio', () => {
    it('should transcribe audio successfully', async () => {
      const audioBuffer = Buffer.from('audio-data');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Transcribed text'
      });

      const result = await groqWhisper.transcribeAudio(audioBuffer, 'test-api-key', 'es');

      expect(mockFetch).toHaveBeenCalledWith('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key'
        },
        body: expect.any(FormData)
      });
      expect(result).toBe('Transcribed text');
    });

    it('should use default language Spanish', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Texto transcrito'
      });

      await groqWhisper.transcribeAudio(audioBuffer, 'key');

      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('language')).toBe('es');
    });

    it('should use custom language when provided', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Transcribed'
      });

      await groqWhisper.transcribeAudio(audioBuffer, 'key', 'en');

      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('language')).toBe('en');
    });

    it('should use whisper-large-v3 model', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Result'
      });

      await groqWhisper.transcribeAudio(audioBuffer, 'key');

      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('model')).toBe('whisper-large-v3');
    });

    it('should return text response format', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Plain text response'
      });

      await groqWhisper.transcribeAudio(audioBuffer, 'key');

      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData.get('response_format')).toBe('text');
    });

    it('should throw error on API failure', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key'
      });

      await expect(groqWhisper.transcribeAudio(audioBuffer, 'invalid-key'))
        .rejects.toThrow('Groq Whisper error (401): Invalid API key');
    });

    it('should handle network errors', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(groqWhisper.transcribeAudio(audioBuffer, 'key'))
        .rejects.toThrow('Network error');
    });

    it('should trim whitespace from result', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '  Trimmed text  '
      });

      const result = await groqWhisper.transcribeAudio(audioBuffer, 'key');

      expect(result).toBe('Trimmed text');
    });

    it('should use ogg audio format', async () => {
      const audioBuffer = Buffer.from('audio');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Result'
      });

      await groqWhisper.transcribeAudio(audioBuffer, 'key');

      const formData = mockFetch.mock.calls[0][1].body;
      const file = formData.get('file');
      expect(file.type).toBe('audio/ogg');
    });
  });
});
