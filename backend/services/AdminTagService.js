import { Op } from 'sequelize';
import { Tag } from '../models/Tag.js';
import { ActivityLogger } from './ActivityLogger.js';
import { TagService } from './TagService.js';
import { RecipeProvider } from './RecipeProvider.js';

export class AdminTagService {
  /**
   * Obtiene todas las etiquetas globales ordenadas por clave (key).
   */
  static async getAllTags() {
    return Tag.findAll({
      order: [['key', 'ASC']]
    });
  }

  /**
   * Crea una nueva etiqueta global.
   * Valida que no exista una etiqueta previa con la misma clave.
   * Invalida cachés tras la creación.
   */
  static async createTag(key, es, en) {
    const existing = await Tag.findOne({ where: { key } });
    if (existing) {
      const error = new Error('Ya existe una etiqueta con esa clave.');
      error.status = 409;
      throw error;
    }

    const tag = await Tag.create({ key, es, en });
    ActivityLogger.log('ADMIN_TAG_CREATE', { tagId: tag.id, key: tag.key });
    await TagService.invalidateCache();
    await RecipeProvider.clearCache();
    return tag;
  }

  /**
   * Actualiza una etiqueta global por ID.
   * Valida duplicados de clave excluyendo la actual.
   * Invalida cachés tras la actualización.
   */
  static async updateTag(id, { key, es, en }) {
    const tag = await Tag.findByPk(id);
    if (!tag) {
      const error = new Error('Etiqueta no encontrada.');
      error.status = 404;
      throw error;
    }

    // Verificar si la nueva clave ya existe en otro tag
    const existing = await Tag.findOne({ 
      where: { 
        key,
        id: { [Op.ne]: id }
      } 
    });
    if (existing) {
      const error = new Error('Ya existe otra etiqueta con esa clave.');
      error.status = 409;
      throw error;
    }

    await tag.update({ key, es, en });
    ActivityLogger.log('ADMIN_TAG_UPDATE', { tagId: tag.id, key: tag.key });
    await TagService.invalidateCache();
    await RecipeProvider.clearCache();
    return tag;
  }

  /**
   * Elimina una etiqueta global por ID.
   * Invalida cachés tras la eliminación.
   */
  static async deleteTag(id) {
    const tag = await Tag.findByPk(id);

    if (!tag) {
      const error = new Error('Etiqueta no encontrada.');
      error.status = 404;
      throw error;
    }

    await tag.destroy();
    ActivityLogger.log('ADMIN_TAG_DELETE', { tagId: id, key: tag.key });
    await TagService.invalidateCache();
    await RecipeProvider.clearCache();
    return { message: 'Etiqueta eliminada correctamente' };
  }
}
