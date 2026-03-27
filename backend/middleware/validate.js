import { z } from 'zod';

export const validateQuery = (schema) => (req, res, next) => {
  try {
    req.validatedQuery = schema.parse(req.query);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Petición malformada.', 
        details: err.issues.map(i => i.message) 
      });
    }
    next(err);
  }
};
