import { Resend } from 'resend';
import { config } from '../config/env.js';
import { ActivityLogger } from './ActivityLogger.js';

/**
 * IEmailService — Facade para el envío de correos.
 * En desarrollo (sin API Key), loguea el contenido a la consola.
 * En producción (con API Key), usa Resend para el envío real.
 */
class EmailService {
  constructor() {
    this.resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;
    this.from = config.EMAIL_FROM || 'Wati <noreply@wati.com>';

    if (!this.resend) {
      ActivityLogger.info('EmailService initialized in DEV mode (Console Logging only)');
    }
  }

  /**
   * Envía un correo electrónico.
   * 
   * @param {string} to  Destinatario
   * @param {string} subject  Asunto
   * @param {string} html  Contenido en HTML
   * @returns {Promise<{ success: boolean, id?: string, error?: any }>}
   */
  async sendEmail(to, subject, html) {
    if (!this.resend) {
      // Mock para desarrollo
      ActivityLogger.info(`[MOCK EMAIL] TO: ${to} | SUBJECT: ${subject}`);
      console.log('--- HTML CONTENT START ---');
      console.log(html);
      console.log('--- HTML CONTENT END ---');
      return { success: true, id: 'mock-id-' + Date.now() };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: subject,
        html: html
      });

      if (error) {
        ActivityLogger.error(`Email delivery failed to ${to}`, error);
        return { success: false, error };
      }

      return { success: true, id: data.id };
    } catch (err) {
      ActivityLogger.error(`Email delivery exception to ${to}`, err);
      return { success: false, error: err };
    }
  }

  /**
   * Envía el correo de verificación con el Magic Link.
   */
  async sendVerificationEmail(to, name, link) {
    const subject = 'Verifica tu cuenta en Wati';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
        <h1 style="color: #2D5A27;">¡Hola, ${name}!</h1>
        <p style="font-size: 16px; color: #444;">Gracias por unirte a Wati. Para proteger tu cuenta y habilitar todas las funciones (como guardar favoritos), necesitamos verificar tu correo electrónico.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background: linear-gradient(135deg, #4A7C44 0%, #2D5A27 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verificar mi Correo</a>
        </div>
        <p style="font-size: 14px; color: #666;">Este enlace expirará en 24 horas.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Si no creaste una cuenta en Wati, puedes ignorar este correo.</p>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }

  /**
   * Envía el correo de recuperación de contraseña.
   */
  async sendPasswordResetEmail(to, name, link) {
    const subject = 'Recupera tu contraseña en Wati';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
        <h1 style="color: #2D5A27;">Recuperación de Contraseña</h1>
        <p style="font-size: 16px; color: #444;">Hola, ${name}. Hemos recibido una solicitud para restablecer tu contraseña en Wati.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background: linear-gradient(135deg, #4A7C44 0%, #2D5A27 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Restablecer mi Contraseña</a>
        </div>
        <p style="font-size: 14px; color: #666;">Este enlace expirará en 1 hora por seguridad.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">Si no solicitaste este cambio, ignora este correo y asegúrate de que tu cuenta esté segura.</p>
      </div>
    `;
    return this.sendEmail(to, subject, html);
  }
}

export const IEmailService = new EmailService();
