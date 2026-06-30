import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transcribeAudio } from '../services/GroqWhisper.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GroqWhisper', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('transcribeAudio', () => {
    it('should transcribe audio successfully', async () => {
      const audioBuffer = Buffer.from('audio-data');
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'Transcribed text' });
      const result = await transcribeAudio(audioBuffer, 'test-api-key', 'es');
      expect(mockFetch).toHaveBeenCalledWith('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST', headers: { 'Authorization': 'Bearer test-api-key' }, body: expect.any(FormData)
      });
      expect(result).toBe('Transcribed text');
    });

    it('should use default language Spanish', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'Texto' });
      await transcribeAudio(Buffer.from('audio'), 'key');
      expect(mockFetch.mock.calls[0][1].body.get('language')).toBe('es');
    });

    it('should use custom language when provided', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'Transcribed' });
      await transcribeAudio(Buffer.from('audio'), 'key', 'en');
      expect(mockFetch.mock.calls[0][1].body.get('language')).toBe('en');
    });

    it('should use whisper-large-v3 model', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'Result' });
      await transcribeAudio(Buffer.from('audio'), 'key');
      expect(mockFetch.mock.calls[0][1].body.get('model')).toBe('whisper-large-v3');
    });

    it('should return text response format', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'Result' });
      await transcribeAudio(Buffer.from('audio'), 'key');
      expect(mockFetch.mock.calls[0][1].body.get('response_format')).toBe('text');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Invalid API key' });
      await expect(transcribeAudio(Buffer.from('audio'), 'invalid-key'))
        .rejects.toThrow('Groq Whisper error (401): Invalid API key');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(transcribeAudio(Buffer.from('audio'), 'key')).rejects.toThrow('Network error');
    });

    it('should trim whitespace from result', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '  Trimmed text  ' });
      expect(await transcribeAudio(Buffer.from('audio'), 'key')).toBe('Trimmed text');
    });

    it('should use ogg audio format', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => 'Result' });
      await transcribeAudio(Buffer.from('audio'), 'key');
      expect(mockFetch.mock.calls[0][1].body.get('file').type).toBe('audio/ogg');
    });
  });
});
