/**
 * IEmailService — Base interface for email adapters.
 * Following the Facade/Adapter pattern to keep core logic product-agnostic.
 */
export class IEmailService {
  /**
   * Sends a magic link email to the user.
   * @param {string} email 
   * @param {string} magicLink 
   * @returns {Promise<void>}
   */
  async sendMagicLink(email, magicLink) {
    throw new Error('Method sendMagicLink must be implemented');
  }
}
