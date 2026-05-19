import { z } from 'zod';

export const recipeQuerySchema = z.object({
  query: z.string().trim().max(100, "La búsqueda es demasiado larga (max 100 caracteres).").optional(),
  excludeIngredients: z.string().trim().max(500, "La lista de ingredientes a excluir es demasiado larga.").optional(),
  diet: z.string().trim().max(50, "El campo de dieta es demasiado largo.").optional(),
  number: z.string().regex(/^\d+$/, "El número de recetas debe ser un entero válido.").optional(),
  offset: z.string().regex(/^\d+$/, "El offset debe ser un entero válido.").optional(),
  sort: z.string().trim().max(50).optional(),
  refreshKey: z.string().optional(),
  includeUnsafe: z.string().optional()
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
  key: z.string().trim().min(1, "El key es requerido"),
  es: z.string().trim().min(1, "El tag en español es requerido"),
  en: z.string().trim().min(1, "English tag is required")
});

export const adminRecipeSchema = z.object({
  title_es: z.string().trim().min(2, "El título en español es requerido"),
  title_en: z.string().trim().min(2, "English title is required"),
  slug: z.string().trim().min(2, "El slug es requerido").optional(),
  prep_time_minutes: z.number().min(0).default(0),
  cook_time_minutes: z.number().min(0).default(0),
  servings: z.number().min(1).default(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  ingredients: z.array(z.any()).default([]),
  steps: z.array(z.any()).default([]),
  tags: z.array(z.any()).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sibo_risk_level: z.enum(['safe', 'caution', 'avoid']).default('safe'),
  image_url: z.string().trim().nullable().optional(),
  image_filename: z.string().trim().nullable().optional()
});

export const tagUpsertSchema = z.array(tagSchema);

export const forgotPasswordSchema = z.object({
  email: z.string().email('Debe ser un email válido')
});

export const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'La contraseña debe tener al menos un número')
});

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string().trim().min(2, "El slug debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones")
});

export const addOrgUserSchema = z.object({
  displayName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(['user', 'admin']).default('user')
});

export const bulkOrgUsersSchema = z.object({
  users: z.array(addOrgUserSchema).min(1).max(500)
});

export const organizationUpdateSchema = organizationSchema.extend({
  is_active: z.boolean().optional()
});

export const nutriRecipeSchema = adminRecipeSchema;

export const nutritionalPlanSchema = z.object({
  patient_id: z.string().uuid("ID de paciente inválido"),
  title: z.string().trim().min(2, "El título del plan es requerido"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "start_date debe tener formato YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "end_date debe tener formato YYYY-MM-DD"),
  meals: z.array(z.object({
    day: z.string().trim().min(1, "El día de la semana es requerido"),
    meals: z.array(z.object({
      type: z.string().trim().min(1, "El tipo de comida es requerido"),
      recipeId: z.string().uuid("ID de receta inválido"),
      notes: z.string().trim().optional()
    })).min(1, "Debe haber al menos una comida programada")
  })).default([]),
  notes: z.string().trim().optional()
}).refine(data => {
  return new Date(data.start_date) <= new Date(data.end_date);
}, {
  message: "La fecha de inicio (start_date) debe ser menor o igual a la fecha de fin (end_date)",
  path: ["end_date"]
});



