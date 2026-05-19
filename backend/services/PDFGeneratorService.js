import PDFDocument from 'pdfkit';

export class PDFGeneratorService {
  /**
   * Genera un documento PDF utilizando una plantilla de diseño (Strategy).
   * 
   * @param {Object} template - Instancia de la clase plantilla que implementa render(doc, data)
   * @param {Object} data - Datos en formato JSON
   * @returns {Promise<Buffer>} Buffer del documento PDF generado
   */
  static generatePDF(template, data) {
    return new Promise((resolve, reject) => {
      try {
        const options = typeof template.getOptions === 'function' 
          ? template.getOptions() 
          : { margin: 50, size: 'A4' };

        const doc = new PDFDocument(options);
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
        doc.on('error', reject);

        template.render(doc, data);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
