import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticateToken } from '../middleware/auth.js';
import { DietPlanService } from '../services/DietPlanService.js';

const router = express.Router();

// Todos los endpoints de /api/plans requieren autenticación
router.use(authenticateToken);

/**
 * GET /api/plans/current
 * Retorna el plan nutricional activo de hoy para el paciente en sesión.
 * Resuelve las recetas referenciadas de forma completa.
 */
router.get('/current', asyncHandler(async (req, res) => {
  const patientId = req.user.id;
  const activePlan = await DietPlanService.getActivePlanForPatient(patientId);

  if (!activePlan) {
    return res.json({ message: 'No tienes un plan alimentario activo asignado en este momento.', plan: null });
  }

  res.json({ plan: activePlan });
}));

export default router;
