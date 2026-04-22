import { db } from '../db/db';
import { Recipe } from '../types/recipe';

import { CONFIG } from '../config';

const ALLOWED_IMAGE_DOMAINS = ['localhost', 'res.cloudinary.com', 'images.unsplash.com', 'spoonacular.com', 'wati.health'];

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow local data/blob URLs or specific trusted domains
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return true;
    
    // Check if it matches the configured API domain
    try {
      if (CONFIG.BASE_URL) {
        const baseParsed = new URL(CONFIG.BASE_URL);
        if (parsed.hostname === baseParsed.hostname) return true;
      }
    } catch {
      // Ignore if BASE_URL is relative or invalid
    }

    return ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export async function cacheImage(url: string): Promise<string | null> {
  if (!url) return null;
  let target = url;
  if (target.startsWith('/public/')) {
    target = `${CONFIG.BASE_URL}${target}`;
  }
  if (!isValidImageUrl(target)) return null;

  try {
    const cached = await db.cachedImages.get(target);
    if (cached) {
      return cached.base64;
    }

    const response = await fetch(target, { mode: 'cors' });
    if (!response.ok) return null;

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    await db.cachedImages.put({ url: target, base64, timestamp: Date.now() });
    return base64;
  } catch (err) {
    console.warn('[ImageCache] Failed to cache image:', err);
    return null;
  }
}

export async function getCachedImage(url: string): Promise<string | null> {
  if (!url) return null;
  let target = url;
  if (target.startsWith('/public/')) {
    target = `${CONFIG.BASE_URL}${target}`;
  }
  if (!isValidImageUrl(target)) return null;

  try {
    const cached = await db.cachedImages.get(target);
    return cached?.base64 || null;
  } catch (err) {
    console.warn('[ImageCache] Failed to retrieve cached image:', err);
    return null;
  }
}

export async function getImageSource(url: string): Promise<string> {
  if (!url) return '';
  let target = url;
  if (target.startsWith('/public/')) {
    target = `${CONFIG.BASE_URL}${target}`;
  }
  if (!isValidImageUrl(target)) return target; // Fallback to raw URL if invalid for caching

  const cached = await getCachedImage(target);
  if (cached) return cached;

  try {
    const base64 = await cacheImage(target);
    if (base64) return base64;
  } catch {
    // Fall back to original URL if caching fails
  }

  return target;
}

export async function cacheRecipeImages(recipes: Recipe[]): Promise<void> {
  const imageUrls = recipes
    .map(r => r.imageUrl)
    .filter(Boolean)
    .filter((url, i, arr) => url && arr.indexOf(url) === i);

  await Promise.allSettled(imageUrls.map(url => cacheImage(url!)));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
