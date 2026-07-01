import { NutriRecipeService } from '../services/NutriRecipeService.js';
import { DietPlanService } from '../services/DietPlanService.js';
import { User } from '../models/User.js';
import { PDFGeneratorService } from '../services/PDFGeneratorService.js';
import { DietPlanTemplate } from '../services/pdf/templates/DietPlanTemplate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getRecipes = asyncHandler(async (req, res) => {
  const { number, offset } = req.query;
  const organizationId = req.user.organization_id;
  const result = await NutriRecipeService.getNutriRecipes(organizationId, number, offset);
  res.json(result);
});

export const createRecipe = asyncHandler(async (req, res) => {
  const organizationId = req.user.organization_id;
  const recipe = await NutriRecipeService.createNutriRecipe(organizationId, req.body);
  res.status(201).json(recipe);
});

export const updateRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const recipe = await NutriRecipeService.updateNutriRecipe(id, organizationId, req.body);
  res.json(recipe);
});

export const deleteRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.user.organization_id;
  const result = await NutriRecipeService.deleteNutriRecipe(id, organizationId);
  res.json(result);
});

export const searchPatient = asyncHandler(async (req, res) => {
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
});

export const getPatients = asyncHandler(async (req, res) => {
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const patients = await DietPlanService.getUniquePatients(creatorId, organizationId);
  res.json(patients);
});

export const getPlans = asyncHandler(async (req, res) => {
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plans = await DietPlanService.getPlans(creatorId, organizationId);
  res.json(plans);
});

export const getPlanDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plan = await DietPlanService.getPlanDetails(id, creatorId, organizationId);
  res.json(plan);
});

export const createPlan = asyncHandler(async (req, res) => {
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plan = await DietPlanService.createPlan(req.body, creatorId, organizationId);
  res.status(201).json(plan);
});

export const updatePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const plan = await DietPlanService.updatePlan(id, req.body, creatorId, organizationId);
  res.json(plan);
});

export const deletePlan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const creatorId = req.user.id;
  const organizationId = req.user.organization_id;
  const result = await DietPlanService.deletePlan(id, creatorId, organizationId);
  res.json(result);
});

export const exportPlanPDF = asyncHandler(async (req, res) => {
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
});
