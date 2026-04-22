import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';
import { api } from '../lib/api';

export function useSearchFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestToChef = useCallback(async (term: string, userId?: string) => {
    if (!term.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/suggestions', { term: term.trim(), userId });

      setSubmitted(true);
      logger.track('CHEF_SUGGESTION_SENT', { term: term.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSubmitted(false);
    setError(null);
    setIsSubmitting(false);
  }, []);

  return {
    isSubmitting,
    submitted,
    error,
    suggestToChef,
    reset
  };
}
