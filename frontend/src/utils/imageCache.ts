import { db } from '../db/db';
import { Recipe } from '../types/recipe';

const ALLOWED_IMAGE_DOMAINS = ['localhost', 'res.cloudinary.com', 'images.unsplash.com', 'spoonacular.com'];

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow local data/blob URLs or specific trusted domains
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return true;
    return ALLOWED_IMAGE_DOMAINS.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

export async function cacheImage(url: string): Promise<string | null> {
  if (!url || !isValidImageUrl(url)) return null;

  try {
    const cached = await db.cachedImages.get(url);
    if (cached) {
      return cached.base64;
    }

    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;

    const blob = await response.blob();
    const base64 = await blobToBase64(blob);

    await db.cachedImages.put({ url, base64, timestamp: Date.now() });
    return base64;
  } catch (err) {
    console.warn('[ImageCache] Failed to cache image:', err);
    return null;
  }
}

export async function getCachedImage(url: string): Promise<string | null> {
  if (!url || !isValidImageUrl(url)) return null;

  try {
    const cached = await db.cachedImages.get(url);
    return cached?.base64 || null;
  } catch (err) {
    console.warn('[ImageCache] Failed to retrieve cached image:', err);
    return null;
  }
}

export async function getImageSource(url: string): Promise<string> {
  if (!url) return '';
  if (!isValidImageUrl(url)) return url; // Fallback to raw URL if invalid for caching

  const cached = await getCachedImage(url);
  if (cached) return cached;

  try {
    const base64 = await cacheImage(url);
    if (base64) return base64;
  } catch {
    // Fall back to original URL if caching fails
  }

  return url;
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
