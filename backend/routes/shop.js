import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';
import { IngredientConsolidatorService } from '../services/IngredientConsolidatorService.js';
import { PDFGeneratorService } from '../services/PDFGeneratorService.js';
import { PurchaseOrderTemplate } from '../services/pdf/templates/PurchaseOrderTemplate.js';

const router = express.Router();

// Todos los endpoints de /api/shop requieren autenticación y rol corporativo
router.use(authenticateToken);
router.use(checkRole(['health_professional', 'admin', 'super_admin']));

/**
 * POST /api/shop/orders/consolidate
 * Consolida ingredientes para una lista de pacientes con planes activos
 */
router.post('/orders/consolidate', asyncHandler(async (req, res) => {
  const { patientIds } = req.body;

  if (!Array.isArray(patientIds) || patientIds.length === 0) {
    return res.status(400).json({ error: 'Debe proveer una lista de patientIds válida.' });
  }

  const result = await IngredientConsolidatorService.consolidateIngredients(patientIds);
  res.json(result);
}));

/**
 * POST /api/shop/orders/export-pdf
 * Genera y descarga el PDF de la orden de compra consolidada
 */
router.post('/orders/export-pdf', asyncHandler(async (req, res) => {
  const { patientIds } = req.body;

  if (!Array.isArray(patientIds) || patientIds.length === 0) {
    return res.status(400).json({ error: 'Debe proveer una lista de patientIds válida.' });
  }

  const consolidation = await IngredientConsolidatorService.consolidateIngredients(patientIds);
  
  if (!consolidation.ingredients || consolidation.ingredients.length === 0) {
    return res.status(404).json({ error: 'No se encontraron ingredientes consolidados para los pacientes provistos.' });
  }

  const pdfBuffer = await PDFGeneratorService.generatePDF(new PurchaseOrderTemplate(), consolidation);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="orden-compra.pdf"');
  res.setHeader('Content-Length', pdfBuffer.length);
  res.end(pdfBuffer);
}));

export default router;
