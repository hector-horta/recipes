import { ConsoleEmailAdapter } from './ConsoleEmailAdapter.js';
import { config } from '../config/env.js';

/**
 * EmailService — Facade for email operations.
 * Instantiates the correct adapter based on environment.
 */
class EmailServiceFacade {
  constructor() {
    // Logic to select adapter. For now, always Console.
    // In production, we might use a SendGridAdapter.
    this.adapter = new ConsoleEmailAdapter();
  }

  async sendMagicLink(email, magicLink) {
    return this.adapter.sendMagicLink(email, magicLink);
  }
}

export const EmailService = new EmailServiceFacade();
