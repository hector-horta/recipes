import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const validDelay = typeof delay === 'number' && delay >= 0 ? delay : 0;
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, validDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
