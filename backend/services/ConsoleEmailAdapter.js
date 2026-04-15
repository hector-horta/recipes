import { IEmailService } from './IEmailService.js';
import { ActivityLogger } from './ActivityLogger.js';

/**
 * ConsoleEmailAdapter — Logs emails to console for development.
 * Prevents costs and noise during dev while verifying the logic.
 */
export class ConsoleEmailAdapter extends IEmailService {
  async sendMagicLink(email, magicLink) {
    ActivityLogger.info('--- [EMAIL SIMULATION] ---');
    ActivityLogger.info(`To: ${email}`);
    ActivityLogger.info('Subject: Verify your email - Wati');
    ActivityLogger.info(`Link: ${magicLink}`);
    ActivityLogger.info('--- ------------------ ---');
    
    // In a real adapter, we would fetch to SendGrid, Postmark, etc.
  }
}
