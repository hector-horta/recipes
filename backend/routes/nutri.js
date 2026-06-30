import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { NutriRecipeService } from '../services/NutriRecipeService.js';
import { DietPlanService } from '../services/DietPlanService.js';
import { User } from '../models/User.js';
import { PDFGeneratorService } from '../services/PDFGeneratorService.js';
import { DietPlanTemplate } from '../services/pdf/templates/DietPlanTemplate.js';
import { 
  nutriRecipeSchema, 
  nutritionalPlanSchema 
} from '../models/validators.js';

const router = express.Router();

// Todos los endpoints de /api/nutri requieren autenticación y rol de health_professional o superior
router.use(authenticateToken);
router.use(checkRole(['health_professional']));

/**
 * GET /api/nutri/recipes
 * Lista recetas globales y de la organización del profesional.
 */
router.get('/recipes', asyncHandler(async (req, res) => {
  const { number, offset } = req.query;
  const organizationId = req.user.organization_id;
  const result = await NutriRecipeService.getNutriRecipes(organizationId, number, offset);
  res.json(result);
}));

/**
 * POST /api/nutri/recipes
 * Crea una receta específica para la organización del profesional.
 */
router.post('/recipes', validateBody(nutriRecipeSchema), asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const recipe = await NutriRecipeService.createNutriRecipe(organizationId, req.body);
  res.status(201).json(recipe);
}));

/**
 * PUT /api/nutri/recipes/:id
 * Actualiza una receta específica de la organización del profesional.
 */
router.put('/recipes/:id', validateBody(nutriRecipeSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const recipe = await NutriRecipeService.updateNutriRecipe(id, organizationId, req.body);
  res.json(recipe);
}));

/**
 * DELETE /api/nutri/recipes/:id
 * Elimina una receta específica de la organización del profesional.
 */
router.delete('/recipes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const result = await NutriRecipeService.deleteNutriRecipe(id, organizationId);
  res.json(result);
}));

/**
 * GET /api/nutri/patients/search
 * Busca un paciente global en el sistema por correo electrónico.
 */
router.get('/patients/search', asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'El parámetro email es requerido' });
  }

  const patient = await User.findOne({
    where: {
      email: email.trim().toLowerCase(),
      role: 'user'
    },
    attributes: ['id', 'email', 'display_name']
  });

  if (!patient) {
    return res.status(404).json({ error: 'Paciente no encontrado en el sistema.' });
  }

  res.json(patient);
}));

/**
 * GET /api/nutri/patients
 * Lista los pacientes únicos a quienes este profesional les ha asignado planes.
 */
router.get('/patients', asyncHandler(async (req, res) => {
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const patients = await DietPlanService.getUniquePatients(creatorId, organizationId);
  res.json(patients);
}));

/**
 * GET /api/nutri/plans
 * Lista los planes nutricionales creados por el profesional o dentro de su organización.
 */
router.get('/plans', asyncHandler(async (req, res) => {
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plans = await DietPlanService.getPlans(creatorId, organizationId);
  res.json(plans);
}));

/**
 * GET /api/nutri/plans/:id
 * Obtiene el detalle completo de un plan nutricional específico.
 */
router.get('/plans/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plan = await DietPlanService.getPlanDetails(id, creatorId, organizationId);
  res.json(plan);
}));

/**
 * POST /api/nutri/plans
 * Crea y asigna un nuevo plan nutricional para un paciente.
 */
router.post('/plans', validateBody(nutritionalPlanSchema), asyncHandler(async (req, res) => {
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plan = await DietPlanService.createPlan(req.body, creatorId, organizationId);
  res.status(201).json(plan);
}));

/**
 * PUT /api/nutri/plans/:id
 * Actualiza un plan nutricional existente.
 */
router.put('/plans/:id', validateBody(nutritionalPlanSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plan = await DietPlanService.updatePlan(id, req.body, creatorId, organizationId);
  res.json(plan);
}));

/**
 * DELETE /api/nutri/plans/:id
 * Elimina un plan nutricional existente.
 */
router.delete('/plans/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const result = await DietPlanService.deletePlan(id, creatorId, organizationId);
  res.json(result);
}));

/**
 * GET /api/nutri/plans/:id/export-pdf
 * Genera y descarga la pauta alimenticia del plan en formato PDF
 */
router.get('/plans/:id/export-pdf', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;

  const planDetails = await DietPlanService.getPlanDetails(id, creatorId, organizationId);

  if (!planDetails) {
    return res.status(404).json({ error: 'Plan nutricional no encontrado.' });
  }

  const pdfBuffer = await PDFGeneratorService.generatePDF(new DietPlanTemplate(), planDetails);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="pauta-alimenticia-${id}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.end(pdfBuffer);
}));

export default router;
