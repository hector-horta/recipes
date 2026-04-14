import { URL } from 'url';

/**
 * Validates a URL to prevent SSRF (Server-Side Request Forgery).
 * It check for allowed protocols and domains.
 */
export function validateExternalUrl(inputUrl, allowedDomains = []) {
  try {
    const parsed = new URL(inputUrl);
    
    // Protocol check: only https allowed for external fetches
    if (parsed.protocol !== 'https:') {
      throw new Error('Only HTTPS protocol is allowed.');
    }

    // Hostname check: prevent probing local services
    const hostname = parsed.hostname.toLowerCase();
    
    const isLocal = 
      hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local');

    if (isLocal) {
      throw new Error('Local or internal hostnames are not allowed.');
    }

    // Domain whitelist (optional but recommended)
    if (allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
      if (!isAllowed) {
        throw new Error('Domain not in the allowed list.');
      }
    }

    return true;
  } catch (error) {
    throw new Error(`Invalid or dangerous URL: ${error.message}`);
  }
}
