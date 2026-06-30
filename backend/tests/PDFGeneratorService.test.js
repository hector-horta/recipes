import { describe, it, expect } from 'vitest';
import { PDFGeneratorService } from '../services/PDFGeneratorService.js';
import { PurchaseOrderTemplate } from '../services/pdf/templates/PurchaseOrderTemplate.js';
import { DietPlanTemplate } from '../services/pdf/templates/DietPlanTemplate.js';

describe('PDFGeneratorService & Templates Integration', () => {
  describe('PurchaseOrderTemplate', () => {
    it('should generate a valid PDF buffer starting with PDF magic headers', async () => {
      const mockData = {
        patients: [
          { displayName: 'Carlos Santana', email: 'carlos@test.com', planTitle: 'Dieta K' }
        ],
        ingredients: [
          { nameEs: 'Manzana', nameEn: 'Apple', quantity: '5', unitEs: 'unidades', siboAlert: false },
          { nameEs: 'Pollo', nameEn: 'Chicken', quantity: '300', unitEs: 'g', siboAlert: true }
        ]
      };

      const template = new PurchaseOrderTemplate();
      const pdfBuffer = await PDFGeneratorService.generatePDF(template, mockData);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(100);
      
      // El formato PDF inicia con el marcador de firma "%PDF-"
      const pdfHeader = pdfBuffer.toString('utf-8', 0, 5);
      expect(pdfHeader).toBe('%PDF-');
    });
  });

  describe('DietPlanTemplate', () => {
    it('should generate a valid PDF buffer for patient diet plan', async () => {
      const mockPlan = {
        title: 'Plan de Fuerza Semanal',
        start_date: '2026-05-19',
        end_date: '2026-05-26',
        patient: { displayName: 'María Carey', email: 'maria@test.com' },
        creator: { displayName: 'Dr. Valdivia' },
        organization: { name: 'Hospital Central' },
        meals: [
          {
            day: 'Monday',
            meals: [
              {
                type: 'Breakfast',
                notes: 'Servir con agua templada',
                recipe: {
                  title_es: 'Avena',
                  title_en: 'Oatmeal'
                }
              }
            ]
          }
        ]
      };

      const template = new DietPlanTemplate();
      const pdfBuffer = await PDFGeneratorService.generatePDF(template, mockPlan);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(100);

      const pdfHeader = pdfBuffer.toString('utf-8', 0, 5);
      expect(pdfHeader).toBe('%PDF-');
    });
  });
});
