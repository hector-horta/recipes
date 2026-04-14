import { ActivityLogger } from '../services/ActivityLogger.js';

/**
 * Executes a function with exponential backoff retries.
 * @param {Function} fn - The async function to execute.
 * @param {Object} options - Retry options.
 * @param {number} options.maxRetries - Maximum number of retries (default: 3).
 * @param {number} options.baseDelay - Initial delay in ms (default: 1000).
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000).
 * @param {string} options.serviceName - Name of the service for logging.
 * @returns {Promise<any>}
 */
export async function withRetry(fn, { 
  maxRetries = 3, 
  baseDelay = 1000, 
  maxDelay = 10000,
  serviceName = 'Unknown Service'
} = {}) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const isRetryable = error.status >= 500 || error.status === 429 || error.message?.includes('timeout') || error.message?.includes('network');
      
      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      ActivityLogger.info(`[Retry] ${serviceName} attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, { error: error.message });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
