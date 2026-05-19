import PDFDocument from 'pdfkit';

export class PDFGeneratorService {
  /**
   * Genera una Orden de Compra Consolidada en formato PDF.
   * 
   * @param {Object} data - Datos devueltos por IngredientConsolidatorService
   * @returns {Promise<Buffer>} Buffer del documento PDF generado
   */
  static generatePurchaseOrderPDF(data) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // --- Estilos generales ---
      const primaryColor = '#1e3a8a'; // Azul corporativo
      const darkColor = '#1f2937';    // Gris carbón para texto principal
      const lightColor = '#4b5563';   // Gris para texto secundario
      const dividerColor = '#d1d5db'; // Línea divisoria

      // --- Header / Encabezado ---
      doc.fillColor(primaryColor)
         .fontSize(20)
         .text('ORDEN DE COMPRA CONSOLIDADA', { align: 'center', paragraphGap: 5 });
         
      doc.fillColor(lightColor)
         .fontSize(10)
         .text(`Fecha de Emisión: ${new Date().toLocaleString()}`, { align: 'center' })
         .moveDown(1.5);

      // --- Resumen de Pacientes ---
      doc.fillColor(primaryColor)
         .fontSize(12)
         .text('Planes Alimenticios y Pacientes Incluidos:', { underline: true })
         .moveDown(0.4);

      const patients = data.patients || [];
      if (patients.length === 0) {
        doc.fillColor(darkColor)
           .fontSize(10)
           .text('No hay pacientes incluidos en esta orden de compra.')
           .moveDown(1);
      } else {
        patients.forEach((p, idx) => {
          doc.fillColor(darkColor)
             .fontSize(10)
             .text(`${idx + 1}. ${p.displayName} (${p.email}) - Plan: "${p.planTitle}"`, { indent: 15 });
        });
        doc.moveDown(1.5);
      }

      // --- Tabla de Ingredientes Consolidados ---
      doc.fillColor(primaryColor)
         .fontSize(12)
         .text('Ingredientes Consolidados Requeridos:', { underline: true })
         .moveDown(0.6);

      // Encabezados de columnas de la tabla
      let tableTop = doc.y;
      doc.fillColor(primaryColor).fontSize(10);
      doc.text('Ingrediente (ES)', 50, tableTop);
      doc.text('Ingredient (EN)', 200, tableTop);
      doc.text('Cantidad', 350, tableTop, { align: 'right', width: 60 });
      doc.text('Unidad', 430, tableTop);
      doc.text('Sibo Alerta', 500, tableTop, { align: 'right', width: 50 });

      // Línea separadora de cabecera
      doc.moveTo(50, tableTop + 13)
         .lineTo(550, tableTop + 13)
         .strokeColor(dividerColor)
         .stroke();

      let rowY = tableTop + 22;
      const ingredients = data.ingredients || [];

      if (ingredients.length === 0) {
        doc.fillColor(darkColor)
           .fontSize(10)
           .text('No se encontraron ingredientes para consolidar.', 50, rowY);
      } else {
        ingredients.forEach(ing => {
          // Salto de página automático si se acerca al final de la página A4
          if (rowY > 750) {
            doc.addPage();
            rowY = 50;
            // Dibujar cabecera nuevamente
            doc.fillColor(primaryColor).fontSize(10);
            doc.text('Ingrediente (ES)', 50, rowY);
            doc.text('Ingredient (EN)', 200, rowY);
            doc.text('Cantidad', 350, rowY, { align: 'right', width: 60 });
            doc.text('Unidad', 430, rowY);
            doc.text('Sibo Alerta', 500, rowY, { align: 'right', width: 50 });

            doc.moveTo(50, rowY + 13)
               .lineTo(550, rowY + 13)
               .strokeColor(dividerColor)
               .stroke();
            rowY += 22;
          }

          doc.fillColor(darkColor).fontSize(9);
          // Nombre español
          doc.text(ing.nameEs, 50, rowY, { width: 140, ellipsis: true });
          // Nombre inglés
          doc.text(ing.nameEn, 200, rowY, { width: 140, ellipsis: true });
          // Cantidad
          doc.text(ing.quantity, 350, rowY, { align: 'right', width: 60 });
          // Unidad
          doc.text(ing.unitEs || 'unidades', 430, rowY, { width: 60, ellipsis: true });
          // Sibo
          if (ing.siboAlert) {
            doc.fillColor('#dc2626') // Color rojo para advertencia SIBO
               .text('Alerta', 500, rowY, { align: 'right', width: 50 });
            doc.fillColor(darkColor); // Reset color
          } else {
            doc.text('-', 500, rowY, { align: 'right', width: 50 });
          }

          rowY += 18;
        });
      }

      doc.end();
    });
  }
}
