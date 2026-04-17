import { z } from 'zod';

export const recipeQuerySchema = z.object({
  query: z.string().trim().max(100, "La búsqueda es demasiado larga (max 100 caracteres).").optional(),
  excludeIngredients: z.string().trim().max(500, "La lista de ingredientes a excluir es demasiado larga.").optional(),
  diet: z.string().trim().max(50, "El campo de dieta es demasiado largo.").optional(),
  number: z.string().regex(/^\d+$/, "El número de recetas debe ser un entero válido.").optional(),
  sort: z.string().trim().max(50).optional(),
  refreshKey: z.string().optional()
});

export const registerSchema = z.object({
  email: z.string().email('Debe ser un email válido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe tener al menos un número'),
  displayName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  acceptedTerms: z.boolean().refine(val => val === true, { message: 'Debe aceptar los términos' }),
  language: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Debe ser un email válido'),
  password: z.string()
});

export const profileUpdateSchema = z.object({
  diet: z.string().optional(),
  intolerances: z.array(z.string()).optional(),
  // Support both array (from frontend form) and string (from older clients or raw API)
  excluded_ingredients: z.union([
    z.array(z.string()),
    z.string()
  ]).optional(),
  daily_calories: z.number().optional(),
  onboarding_completed: z.boolean().optional(),
  language: z.string().min(2).max(5).optional(),
  severities: z.record(z.string(), z.string()).optional(),
  conditions: z.array(z.string()).optional(),
});

export const tagSchema = z.object({
  es: z.string().trim().min(1, "El tag en español es requerido"),
  en: z.string().trim().min(1, "English tag is required")
});

export const tagUpsertSchema = z.array(tagSchema);

