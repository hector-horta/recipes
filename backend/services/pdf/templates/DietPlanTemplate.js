export class DietPlanTemplate {
  /**
   * Retorna las opciones de configuración de PDFKit para este reporte.
   */
  getOptions() {
    return {
      margin: 50,
      size: 'A4'
    };
  }

  /**
   * Renderiza el contenido de la pauta alimenticia sobre el documento provisto.
   * 
   * @param {Object} doc - Instancia del documento PDFKit
   * @param {Object} data - Detalle completo del NutritionalPlan
   */
  render(doc, data) {
    const primaryColor = '#0d9488'; // Teal para salud/nutrición
    const darkColor = '#1f2937';    // Gris carbón
    const lightColor = '#6b7280';   // Gris claro
    const dividerColor = '#cbd5e1'; // Gris borde

    // --- Header ---
    doc.fillColor(primaryColor)
       .fontSize(20)
       .text('PLAN NUTRICIONAL Y PAUTA ALIMENTICIA', { align: 'center', paragraphGap: 5 });

    doc.fillColor(lightColor)
       .fontSize(10)
       .text(`Plan: "${data.title}"`, { align: 'center' })
       .moveDown(1.5);

    // --- Caja de Detalles (Paciente y Profesional) ---
    const startY = doc.y;
    doc.rect(50, startY, 495, 80)
       .fillAndStroke('#f0fdfa', primaryColor)
       .lineWidth(1);

    doc.fillColor(darkColor).fontSize(10);
    // Columna Izquierda: Paciente
    doc.text('PACIENTE:', 65, startY + 12, { bold: true });
    doc.text(data.patient?.displayName || data.patient?.display_name || 'No especificado', 130, startY + 12);
    doc.text('CORREO:', 65, startY + 28, { bold: true });
    doc.text(data.patient?.email || '-', 130, startY + 28);
    doc.text('VIGENCIA:', 65, startY + 44, { bold: true });
    doc.text(`Desde ${data.start_date} hasta ${data.end_date}`, 130, startY + 44);

    // Columna Derecha: Profesional
    doc.text('PROFESIONAL:', 300, startY + 12, { bold: true });
    doc.text(data.creator?.displayName || data.creator?.display_name || 'Nutricionista Asignado', 390, startY + 12);
    doc.text('CLÍNICA:', 300, startY + 28, { bold: true });
    doc.text(data.organization?.name || 'Clínica Asociada', 390, startY + 28);

    doc.moveDown(6.5);

    // --- Cuerpo de la Pauta Alimenticia ---
    const meals = Array.isArray(data.meals) ? data.meals : [];
    if (meals.length === 0) {
      doc.fillColor(lightColor)
         .fontSize(12)
         .text('No hay comidas planificadas en este plan nutricional.', { align: 'center' });
      return;
    }

    let currentY = doc.y;

    meals.forEach(daySchedule => {
      // Salto de página preventivo si queda poco espacio para un bloque de día completo
      if (currentY > 650) {
        doc.addPage();
        currentY = 50;
      } else {
        doc.moveDown(1);
        currentY = doc.y;
      }

      const dayName = (daySchedule.day || '').toUpperCase();

      // Banner/Título del día
      doc.rect(50, currentY, 495, 20)
         .fill(primaryColor);
      
      doc.fillColor('#ffffff')
         .fontSize(10)
         .text(dayName, 60, currentY + 5, { bold: true });

      currentY += 25;
      doc.y = currentY;

      const dayMeals = Array.isArray(daySchedule.meals) ? daySchedule.meals : [];
      if (dayMeals.length === 0) {
        doc.fillColor(lightColor)
           .fontSize(9)
           .text('Sin comidas programadas para este día.', 65, currentY);
        currentY += 15;
      } else {
        dayMeals.forEach(meal => {
          if (currentY > 730) {
            doc.addPage();
            currentY = 50;
          }

          doc.fillColor(primaryColor)
             .fontSize(10)
             .text((meal.type || '').toUpperCase(), 65, currentY, { bold: true, width: 90 });

          // Nombre de la receta
          const recipeTitle = meal.recipe 
            ? `${meal.recipe.title_es || meal.recipe.title} (${meal.recipe.title_en || ''})`
            : 'Receta Personalizada';
          
          doc.fillColor(darkColor)
             .fontSize(9)
             .text(recipeTitle, 160, currentY, { width: 370 });

          currentY += 14;

          // Notas de la comida
          if (meal.notes) {
            doc.fillColor(lightColor)
               .fontSize(8)
               .text(`Nota: ${meal.notes}`, 160, currentY, { oblique: true, width: 370 });
            
            // Estimar altura de notas para evitar solapamientos
            const noteHeight = doc.heightOfString(`Nota: ${meal.notes}`, { width: 370 });
            currentY += noteHeight + 4;
          } else {
            currentY += 4;
          }

          // Dibujar pequeña línea divisoria entre comidas
          doc.moveTo(160, currentY)
             .lineTo(530, currentY)
             .strokeColor(dividerColor)
             .stroke();

          currentY += 8;
          doc.y = currentY;
        });
      }
    });
  }
}
