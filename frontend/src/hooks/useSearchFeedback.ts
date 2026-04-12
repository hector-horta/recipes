import { useState, useCallback } from 'react';
import { trackEvent } from '../utils/analytics';

export function useSearchFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestToChef = useCallback(async (term: string, userId?: string) => {
    if (!term.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term: term.trim(), userId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit suggestion');
      }

      setSubmitted(true);
      trackEvent('suggest_to_chef', { term: term.trim() });
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
