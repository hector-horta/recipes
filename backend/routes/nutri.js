import express from 'express';
import { validateBody } from '../middleware/validate.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { nutriRecipeSchema, nutritionalPlanSchema } from '../models/validators.js';
import * as nutriController from '../controllers/nutriController.js';

const router = express.Router();

// Todos los endpoints de /api/nutri requieren autenticación y rol de health_professional o superior
router.use(authenticateToken);
router.use(checkRole(['health_professional']));

// Recetas específicas de organización/clínica
router.get('/recipes', nutriController.getRecipes);
router.post('/recipes', validateBody(nutriRecipeSchema), nutriController.createRecipe);
router.put('/recipes/:id', validateBody(nutriRecipeSchema), nutriController.updateRecipe);
router.delete('/recipes/:id', nutriController.deleteRecipe);

// Búsqueda y gestión de pacientes
router.get('/patients/search', nutriController.searchPatient);
router.get('/patients', nutriController.getPatients);

// Gestión de planes nutricionales
router.get('/plans', nutriController.getPlans);
router.get('/plans/:id', nutriController.getPlanDetails);
router.post('/plans', validateBody(nutritionalPlanSchema), nutriController.createPlan);
router.put('/plans/:id', validateBody(nutritionalPlanSchema), nutriController.updatePlan);
router.delete('/plans/:id', nutriController.deletePlan);
router.get('/plans/:id/export-pdf', nutriController.exportPlanPDF);

export default router;
