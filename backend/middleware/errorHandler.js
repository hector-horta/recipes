import { ActivityLogger } from '../services/ActivityLogger.js';
import { config } from '../config/env.js';

/**
 * Global Error Handler Middleware
 * 
 * This middleware catches all errors passed to next() or thrown in asyncHandler-wrapped routes.
 * It handles specific error types (Sequelize, Zod), logs them via ActivityLogger,
 * alerts on critical failures, and masks 500 internal errors for production.
 */
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let details = undefined;

  // Handle specific error types
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    status = 400;
    code = 'DATABASE_VALIDATION_ERROR';
    details = err.errors?.map(e => ({ message: e.message, path: e.path }));
  } else if (err.name === 'ZodError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    details = err.errors;
  }
  
  const isFatal = status >= 500;
  
  // Mask sensitive fields in the body before logging
  let sanitizedBody = undefined;
  if (req.method !== 'GET' && req.body) {
    sanitizedBody = { ...req.body };
    const sensitiveFields = ['password', 'token', 'admin_key', 'api_key', 'secret'];
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) sanitizedBody[field] = '*****';
    });
  }

  // Log structured error
  ActivityLogger.error(`Request Failed: ${req.method} ${req.url}`, err, {
    status,
    ip: req.ip,
    userId: req.user?.id,
    code,
    details: details ? JSON.stringify(details) : undefined,
    body: sanitizedBody
  });

  // Alert on critical failures
  const isNvidiaError = err.message?.includes('NVIDIA') || err.message?.includes('SDXL');
  const isGroqError = err.message?.includes('GROQ') || err.message?.includes('Whisper');

  if (isNvidiaError || isGroqError || isFatal) {
    const service = isNvidiaError ? 'NVIDIA API' : isGroqError ? 'Groq API' : 'Backend';
    ActivityLogger.alertAsync(
      `🔴 *[ERROR ${status}] ${service}*\n\n` +
      `\`${(err.message || 'Unknown error').slice(0, 200)}\`\n\n` +
      `📍 ${req.method} ${req.originalUrl || req.url}`
    );
  }

  // Response Masking
  let message = 'Vaya, ocurrió un problema inesperado. Inténtalo más tarde.';
  if (status === 402) message = 'Se ha agotado la cuota de la API externa para hoy.';
  if (status === 504) message = 'La búsqueda tardó demasiado. Inténtalo de nuevo.';
  if (status < 500) {
    message = err.message; // User-facing errors (4xx) can show actual message
  }

  res.status(status).json({ 
    error: message,
    code,
    details,
    // Include stack only in development
    stack: config.NODE_ENV === 'development' ? err.stack : undefined
  });
};
