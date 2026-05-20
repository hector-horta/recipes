import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { optionalAuthenticateToken, checkRole } from '../middleware/auth.js';
import { AdminStatsService } from '../services/AdminStatsService.js';
import { OrganizationService } from '../services/OrganizationService.js';
import { AdminRecipeService } from '../services/AdminRecipeService.js';
import { AdminTagService } from '../services/AdminTagService.js';
import { 
  organizationSchema, 
  organizationUpdateSchema, 
  adminRecipeSchema, 
  tagSchema,
  addOrgUserSchema,
  bulkOrgUsersSchema,
  translateSchema
} from '../models/validators.js';
import { translateText } from '../services/NvidiaNIM.js';
import { config } from '../config/env.js';

const router = express.Router();

/**
 * GET /admin/stats
 * Devuelve agregados de rendimiento, términos de búsqueda, NVIDIA uptime, etc.
 */
router.get('/stats', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const stats = await AdminStatsService.getAdminStats();
  res.json(stats);
}));

/**
 * GET /admin/organizations
 * Retorna todas las organizaciones con conteo de usuarios.
 */
router.get('/organizations', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const organizations = await OrganizationService.getAllOrganizations();
  res.json(organizations);
}));

/**
 * GET /admin/recipes
 * Retorna las recetas globales (Wati core), con soporte de paginación opcional.
 */
router.get('/recipes', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { number, offset } = req.query;
  const result = await AdminRecipeService.getGlobalRecipes(number, offset);
  res.json(result);
}));

/**
 * GET /admin/tags
 * Retorna el diccionario global de etiquetas.
 */
router.get('/tags', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const tags = await AdminTagService.getAllTags();
  res.json(tags);
}));

/**
 * POST /admin/organizations
 * Crea una nueva organización.
 */
router.post('/organizations', validateBody(organizationSchema), asyncHandler(async (req, res) => {
  const { name, slug } = req.body;
  const organization = await OrganizationService.createOrganization(name, slug);
  res.status(201).json(organization);
}));

/**
 * PUT /admin/organizations/:id
 * Actualiza una organización.
 */
router.put('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(organizationUpdateSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, is_active } = req.body;
  const result = await OrganizationService.updateOrganization(id, { name, slug, is_active });
  res.json(result);
}));

/**
 * DELETE /admin/organizations/:id
 * Alterna el estado activo/inactivo de una organización.
 */
router.delete('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await OrganizationService.toggleOrganizationStatus(id);
  res.json({ message: `Organización ${organization.is_active ? 'activada' : 'suspendida'} correctamente`, organization });
}));

/**
 * GET /admin/organizations/:id
 * Obtiene el detalle de una organización y la lista de sus usuarios.
 */
router.get('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const result = await OrganizationService.getOrganizationDetails(req.params.id);
  res.json(result);
}));

/**
 * POST /admin/organizations/:id/users
 * Agrega un usuario individual a la organización. Si no existe, lo crea con password temporal.
 */
router.post('/organizations/:id/users', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(addOrgUserSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { displayName, email, role } = req.body;
  const result = await OrganizationService.addUserToOrganization(id, { displayName, email, role });
  res.status(201).json(result);
}));

/**
 * POST /admin/organizations/:id/users/bulk
 * Subida masiva de usuarios en formato JSON.
 */
router.post('/organizations/:id/users/bulk', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(bulkOrgUsersSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { users } = req.body;
  const result = await OrganizationService.bulkAddUsersToOrganization(id, users);
  res.json(result);
}));

/**
 * DELETE /admin/organizations/:id/users/:userId
 * Remueve un usuario de la organización (desasociar sin eliminar la cuenta).
 */
router.delete('/organizations/:id/users/:userId', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const result = await OrganizationService.removeUserFromOrganization(id, userId);
  res.json(result);
}));

/**
 * POST /admin/recipes
 * Crea una nueva receta global (Wati core).
 */
router.post('/recipes', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(adminRecipeSchema), asyncHandler(async (req, res) => {
  const recipe = await AdminRecipeService.createGlobalRecipe(req.body);
  res.status(201).json(recipe);
}));

/**
 * PUT /admin/recipes/:id
 * Actualiza una receta global.
 */
router.put('/recipes/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(adminRecipeSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recipe = await AdminRecipeService.updateGlobalRecipe(id, req.body);
  res.json(recipe);
}));

/**
 * DELETE /admin/recipes/:id
 * Elimina una receta global.
 */
router.delete('/recipes/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await AdminRecipeService.deleteGlobalRecipe(id);
  res.json(result);
}));

/**
 * POST /admin/tags
 * Crea una nueva etiqueta global.
 */
router.post('/tags', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(tagSchema), asyncHandler(async (req, res) => {
  const { key, es, en } = req.body;
  const tag = await AdminTagService.createTag(key, es, en);
  res.status(201).json(tag);
}));

/**
 * PUT /admin/tags/:id
 * Actualiza una etiqueta global.
 */
router.put('/tags/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(tagSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { key, es, en } = req.body;
  const tag = await AdminTagService.updateTag(id, { key, es, en });
  res.json(tag);
}));

/**
 * DELETE /admin/tags/:id
 * Elimina una etiqueta global.
 */
router.delete('/tags/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await AdminTagService.deleteTag(id);
  res.json(result);
}));

/**
 * POST /admin/translate
 * Traduce un texto entre ES y EN de manera bidireccional usando NVIDIA NIM o Gemini.
 */
router.post('/translate', optionalAuthenticateToken, checkRole(['super_admin', 'admin']), validateBody(translateSchema), asyncHandler(async (req, res) => {
  const { text, from, to } = req.body;
  const apiKey = config.NVIDIA_API_KEY || config.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'No translation API key configured (NVIDIA or GEMINI)' });
  }

  const translation = await translateText(text, from, to, apiKey);
  res.json({ translation });
}));

export default router;
