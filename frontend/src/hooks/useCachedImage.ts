import { useState, useEffect } from 'react';
import { getCachedImage, cacheImage } from '../utils/imageCache';

export function useCachedImage(url: string | undefined) {
  const [imageSrc, setImageSrc] = useState<string>(url || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setImageSrc('');
      return;
    }

    let cancelled = false;

    async function load() {
      const target = url!;
      setLoading(true);
      try {
        const cached = await getCachedImage(target);
        if (cached && !cancelled) {
          setImageSrc(cached);
        } else if (!cancelled) {
          const base64 = await cacheImage(target);
          if (base64 && !cancelled) {
            setImageSrc(base64);
          } else {
            setImageSrc(target);
          }
        }
      } catch {
        if (!cancelled) {
          setImageSrc(target);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { imageSrc, loading };
}
