import express from 'express';
import { Op, fn, col, literal } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sequelize } from '../config/database.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { FavoriteRecipe } from '../models/FavoriteRecipe.js';
import { Organization } from '../models/Organization.js';
import { Recipe } from '../models/Recipe.js';
import { Tag } from '../models/Tag.js';
import { User } from '../models/User.js';
import { UserOrganization } from '../models/UserOrganization.js';
import { Profile } from '../models/Profile.js';
import { ActivityLogger } from '../services/ActivityLogger.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { 
  organizationSchema, 
  organizationUpdateSchema, 
  adminRecipeSchema, 
  tagSchema,
  addOrgUserSchema,
  bulkOrgUsersSchema
} from '../models/validators.js';

const router = express.Router();

import { config } from '../config/env.js';

import { optionalAuthenticateToken, checkRole } from '../middleware/auth.js';

/**
 * GET /admin/stats
 *
 * Devuelve:
 *  - top_searches:           5 términos más buscados en los últimos 7 días
 *  - failed_searches:        10 búsquedas sin resultados (últimos 7 días)
 *  - low_conversion_recipes: 3 recetas con más vistas pero menos favoritos
 *  - nvidia:                 uptime estimado de NVIDIA APIs (últimas 24h)
 *  - ingest_by_day:          recetas procesadas por día (últimos 7 días)
 */
router.get('/stats', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo   = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // ── 1. Top 5 búsquedas exitosas (7 días) ────────────────────────────────
  const topSearches = await ActivityLog.findAll({
    where: {
      action: 'SEARCH',
      failed_search: false,
      created_at: { [Op.gte]: sevenDaysAgo }
    },
    attributes: [
      [fn('lower', literal("metadata->>'query'")), 'term'],
      [fn('count', col('id')), 'count']
    ],
    group: [literal("lower(metadata->>'query')")],
    order: [[literal('count'), 'DESC']],
    limit: 5,
    raw: true
  });

  // ── 2. Búsquedas fallidas (sin resultados) últimos 7 días ───────────────
  const failedSearches = await ActivityLog.findAll({
    where: {
      action: 'SEARCH',
      failed_search: true,
      created_at: { [Op.gte]: sevenDaysAgo }
    },
    attributes: [
      [literal("metadata->>'query'"), 'term'],
      [fn('count', col('id')), 'count']
    ],
    group: [literal("metadata->>'query'")],
    order: [[literal('count'), 'DESC']],
    limit: 10,
    raw: true
  });

  // ── 3. Recetas con más vistas pero menos favoritos (baja conversión) ─────
  const topViewed = await ActivityLog.findAll({
    where: {
      action: 'VIEW_RECIPE',
      created_at: { [Op.gte]: sevenDaysAgo }
    },
    attributes: [
      [literal("metadata->>'recipeId'"), 'recipe_id'],
      [literal("metadata->>'title'"),    'title'],
      [fn('count', col('id')),           'views']
    ],
    group: [
      literal("metadata->>'recipeId'"),
      literal("metadata->>'title'")
    ],
    order: [[literal('views'), 'DESC']],
    limit: 20,
    raw: true
  });

  // Enriquecer con conteo de favoritos
  const recipeIds = topViewed.map(r => r.recipe_id).filter(Boolean);
  let favoriteCounts = {};

  if (recipeIds.length > 0) {
    const favRows = await FavoriteRecipe.findAll({
      where: { recipe_id: { [Op.in]: recipeIds } },
      attributes: [
        'recipe_id',
        [fn('count', col('id')), 'fav_count']
      ],
      group: ['recipe_id'],
      raw: true
    });
    favRows.forEach(f => {
      favoriteCounts[f.recipe_id] = parseInt(f.fav_count, 10);
    });
  }

  const lowConversionRecipes = topViewed
    .map(r => ({
      recipe_id:      r.recipe_id,
      title:          r.title,
      views:          parseInt(r.views, 10),
      favorites:      favoriteCounts[r.recipe_id] || 0,
      conversionRate: parseFloat(
        ((favoriteCounts[r.recipe_id] || 0) / parseInt(r.views, 10)).toFixed(4)
      )
    }))
    .sort((a, b) => a.conversionRate - b.conversionRate)
    .slice(0, 3);

  // ── 4. Uptime NVIDIA (últimas 24h) ───────────────────────────────────────
  const [nvidiaSuccess, nvidiaFail] = await Promise.all([
    ActivityLog.count({
      where: { action: 'INGEST_SUCCESS', created_at: { [Op.gte]: oneDayAgo } }
    }),
    ActivityLog.count({
      where: { action: 'INGEST_FAIL', created_at: { [Op.gte]: oneDayAgo } }
    })
  ]);

  const totalNvidia = nvidiaSuccess + nvidiaFail;
  const nvidiaUptime = totalNvidia > 0
    ? parseFloat(((nvidiaSuccess / totalNvidia) * 100).toFixed(1))
    : null;

  // ── 5. Ingestas por día (7 días) ─────────────────────────────────────────
  const ingestByDay = await ActivityLog.findAll({
    where: {
      action:     { [Op.in]: ['INGEST_SUCCESS', 'INGEST_FAIL'] },
      created_at: { [Op.gte]: sevenDaysAgo }
    },
    attributes: [
      [fn('date', col('created_at')), 'day'],
      'action',
      [fn('count', col('id')),       'count']
    ],
    group: [fn('date', col('created_at')), 'action'],
    order: [[fn('date', col('created_at')), 'ASC']],
    raw: true
  });

  res.json({
    generated_at:           new Date().toISOString(),
    top_searches:           topSearches,
    failed_searches:        failedSearches,
    low_conversion_recipes: lowConversionRecipes,
    nvidia: {
      uptime_percent_24h:   nvidiaUptime,
      success_24h:          nvidiaSuccess,
      failures_24h:         nvidiaFail
    },
    ingest_by_day:          ingestByDay
  });
}));

/**
 * GET /admin/organizations
 * Retorna todas las organizaciones con conteo de usuarios.
 */
router.get('/organizations', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const organizations = await Organization.findAll({
    attributes: {
      include: [
        [
          literal(`(
            SELECT COUNT(*)
            FROM user_organizations AS uo
            WHERE uo.organization_id = "Organization".id
          )`),
          'userCount'
        ]
      ]
    },
    order: [['name', 'ASC']]
  });

  // Mapear para que el status coincida con lo esperado por el frontend si es necesario
  // En el modelo es is_active, en el frontend esperan 'active' | 'suspended' | 'pending'
  const result = organizations.map(org => ({
    ...org.toJSON(),
    status: org.is_active ? 'active' : 'suspended',
    userCount: parseInt(org.getDataValue('userCount'), 10) || 0
  }));

  res.json(result);
}));

/**
 * GET /admin/recipes
 * Retorna las recetas globales (Wati core).
 */
router.get('/recipes', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const recipes = await Recipe.findAll({
    where: { organization_id: null },
    order: [['created_at', 'DESC']]
  });
  res.json(recipes);
}));

/**
 * GET /admin/tags
 * Retorna el diccionario global de etiquetas.
 */
router.get('/tags', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const tags = await Tag.findAll({
    order: [['key', 'ASC']]
  });
  res.json(tags);
}));

/**
 * POST /admin/organizations
 * Crea una nueva organización.
 */
router.post('/organizations', validateBody(organizationSchema), asyncHandler(async (req, res) => {
  const { name, slug } = req.body;

  const existing = await Organization.findOne({
    where: {
      [Op.or]: [
        { name },
        { slug: slug.toLowerCase() }
      ]
    }
  });

  if (existing) {
    const error = new Error('Ya existe una organización con ese nombre o slug.');
    error.status = 409;
    throw error;
  }

  const organization = await Organization.create({ 
    name, 
    slug: slug.toLowerCase(),
    is_active: true,
    settings: {}
  });
  
  ActivityLogger.log('ADMIN_ORG_CREATE', { organizationId: organization.id, name: organization.name });

  res.status(201).json(organization);
}));

/**
 * PUT /admin/organizations/:id
 * Actualiza una organización.
 */
router.put('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(organizationUpdateSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, is_active } = req.body;

  const organization = await Organization.findByPk(id);
  if (!organization) {
    const error = new Error('Organización no encontrada.');
    error.status = 404;
    throw error;
  }

  // Verificar duplicados (excluyendo la actual)
  const existing = await Organization.findOne({
    where: {
      [Op.and]: [
        { id: { [Op.ne]: id } },
        {
          [Op.or]: [
            { name },
            { slug: slug.toLowerCase() }
          ]
        }
      ]
    }
  });

  if (existing) {
    const error = new Error('Ya existe otra organización con ese nombre o slug.');
    error.status = 409;
    throw error;
  }

  const updateFields = {
    name,
    slug: slug.toLowerCase()
  };
  if (is_active !== undefined) {
    updateFields.is_active = is_active;
  }

  await organization.update(updateFields);

  ActivityLogger.log('ADMIN_ORG_UPDATE', { 
    organizationId: organization.id, 
    name: organization.name,
    is_active: organization.is_active
  });

  res.json({
    ...organization.toJSON(),
    status: organization.is_active ? 'active' : 'suspended'
  });
}));

/**
 * DELETE /admin/organizations/:id
 * Alterna el estado activo/inactivo de una organización.
 */
router.delete('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const organization = await Organization.findByPk(id);
  if (!organization) {
    const error = new Error('Organización no encontrada.');
    error.status = 404;
    throw error;
  }

  await organization.update({
    is_active: !organization.is_active
  });

  ActivityLogger.log('ADMIN_ORG_TOGGLE_STATUS', { 
    organizationId: organization.id, 
    name: organization.name,
    is_active: organization.is_active 
  });

  res.json({ message: `Organización ${organization.is_active ? 'activada' : 'suspendida'} correctamente`, organization });
}));

/**
 * GET /admin/organizations/:id
 * Obtiene el detalle de una organización y la lista de sus usuarios.
 */
router.get('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const org = await Organization.findByPk(req.params.id, {
    include: [{
      model: User,
      as: 'users',
      attributes: ['id', 'email', 'display_name', 'is_active'],
      through: { attributes: ['role', 'created_at'] }
    }]
  });
  if (!org) {
    const error = new Error('Organización no encontrada.');
    error.status = 404;
    throw error;
  }

  res.json({
    ...org.toJSON(),
    status: org.is_active ? 'active' : 'suspended',
    userCount: org.users.length,
    users: org.users.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      isActive: u.is_active,
      role: u.UserOrganization.role,
      joinedAt: u.UserOrganization.created_at
    }))
  });
}));

/**
 * POST /admin/organizations/:id/users
 * Agrega un usuario individual a la organización. Si no existe, lo crea con password temporal.
 */
router.post('/organizations/:id/users', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(addOrgUserSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { displayName, email, role } = req.body;

  const org = await Organization.findByPk(id);
  if (!org) {
    const error = new Error('Organización no encontrada.');
    error.status = 404;
    throw error;
  }

  // Buscar usuario
  let user = await User.findOne({ where: { email: email.toLowerCase() } });
  let createdNewUser = false;

  if (user) {
    // Verificar si ya pertenece a la organización
    const exists = await UserOrganization.findOne({
      where: {
        user_id: user.id,
        organization_id: org.id
      }
    });
    if (exists) {
      const error = new Error('El usuario ya pertenece a esta organización.');
      error.status = 409;
      throw error;
    }
  } else {
    // Crear nuevo usuario
    const saltRounds = 12;
    const tempPassword = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

    user = await User.create({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      display_name: displayName,
      accepted_terms_at: new Date(),
      is_verified: false
    });
    createdNewUser = true;

    // Crear perfil por defecto
    await Profile.create({ user_id: user.id, language: 'es' });
  }

  // Asociar al tenant
  const userOrg = await UserOrganization.create({
    user_id: user.id,
    organization_id: org.id,
    role: role || 'user'
  });

  ActivityLogger.log('ADMIN_ORG_USER_ADD', { 
    organizationId: org.id, 
    userId: user.id, 
    role: userOrg.role,
    createdNewUser 
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    isActive: user.is_active,
    role: userOrg.role,
    joinedAt: userOrg.created_at,
    createdNewUser
  });
}));

/**
 * POST /admin/organizations/:id/users/bulk
 * Subida masiva de usuarios en formato JSON.
 */
router.post('/organizations/:id/users/bulk', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(bulkOrgUsersSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { users } = req.body;

  const org = await Organization.findByPk(id);
  if (!org) {
    const error = new Error('Organización no encontrada.');
    error.status = 404;
    throw error;
  }

  const results = {
    total: users.length,
    created: 0,
    associated: 0,
    errors: []
  };

  await sequelize.transaction(async (t) => {
    for (let i = 0; i < users.length; i++) {
      const uData = users[i];
      const emailLower = uData.email.toLowerCase();
      try {
        let user = await User.findOne({ where: { email: emailLower } }, { transaction: t });
        let createdNewUser = false;

        if (user) {
          // Verificar si ya pertenece a la organización
          const exists = await UserOrganization.findOne({
            where: {
              user_id: user.id,
              organization_id: org.id
            }
          }, { transaction: t });

          if (exists) {
            results.errors.push({
              row: i + 1,
              email: uData.email,
              reason: 'El usuario ya pertenece a esta organización.'
            });
            continue;
          }
        } else {
          // Crear nuevo usuario
          const saltRounds = 12;
          const tempPassword = crypto.randomUUID();
          const passwordHash = await bcrypt.hash(tempPassword, saltRounds);

          user = await User.create({
            email: emailLower,
            password_hash: passwordHash,
            display_name: uData.displayName,
            accepted_terms_at: new Date(),
            is_verified: false
          }, { transaction: t });

          await Profile.create({ user_id: user.id, language: 'es' }, { transaction: t });
          createdNewUser = true;
        }

        // Asociar
        await UserOrganization.create({
          user_id: user.id,
          organization_id: org.id,
          role: uData.role || 'user'
        }, { transaction: t });

        if (createdNewUser) {
          results.created++;
        } else {
          results.associated++;
        }
      } catch (err) {
        results.errors.push({
          row: i + 1,
          email: uData.email,
          reason: err.message || 'Error inesperado al procesar el usuario.'
        });
      }
    }
  });

  ActivityLogger.log('ADMIN_ORG_USER_BULK', { 
    organizationId: org.id, 
    total: results.total,
    created: results.created,
    associated: results.associated,
    errorsCount: results.errors.length
  });

  res.json(results);
}));

/**
 * DELETE /admin/organizations/:id/users/:userId
 * Remueve un usuario de la organización (desasociar sin eliminar la cuenta).
 */
router.delete('/organizations/:id/users/:userId', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id, userId } = req.params;

  const org = await Organization.findByPk(id);
  if (!org) {
    const error = new Error('Organización no encontrada.');
    error.status = 404;
    throw error;
  }

  const relation = await UserOrganization.findOne({
    where: {
      user_id: userId,
      organization_id: org.id
    }
  });

  if (!relation) {
    const error = new Error('El usuario no pertenece a esta organización.');
    error.status = 404;
    throw error;
  }

  await relation.destroy();

  ActivityLogger.log('ADMIN_ORG_USER_REMOVE', { 
    organizationId: org.id, 
    userId 
  });

  res.json({ message: 'Usuario removido de la organización correctamente' });
}));

/**
 * POST /admin/recipes
 * Crea una nueva receta global (Wati core).
 */
router.post('/recipes', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(adminRecipeSchema), asyncHandler(async (req, res) => {
  const recipeData = {
    ...req.body,
    organization_id: null,
    source_type: 'manual'
  };

  const recipe = await Recipe.create(recipeData);
  ActivityLogger.log('ADMIN_RECIPE_CREATE', { recipeId: recipe.id, title: recipe.title_es });
  res.status(201).json(recipe);
}));

/**
 * PUT /admin/recipes/:id
 * Actualiza una receta global.
 */
router.put('/recipes/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(adminRecipeSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recipe = await Recipe.findByPk(id);

  if (!recipe) {
    const error = new Error('Receta no encontrada.');
    error.status = 404;
    throw error;
  }

  await recipe.update(req.body);
  ActivityLogger.log('ADMIN_RECIPE_UPDATE', { recipeId: recipe.id, title: recipe.title_es });
  res.json(recipe);
}));

/**
 * DELETE /admin/recipes/:id
 * Elimina una receta global.
 */
router.delete('/recipes/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recipe = await Recipe.findByPk(id);

  if (!recipe) {
    const error = new Error('Receta no encontrada.');
    error.status = 404;
    throw error;
  }

  await recipe.destroy();
  ActivityLogger.log('ADMIN_RECIPE_DELETE', { recipeId: id, title: recipe.title_es });
  res.json({ message: 'Receta eliminada correctamente' });
}));

/**
 * POST /admin/tags
 * Crea una nueva etiqueta global.
 */
router.post('/tags', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(tagSchema), asyncHandler(async (req, res) => {
  const { key, es, en } = req.body;

  const existing = await Tag.findOne({ where: { key } });
  if (existing) {
    const error = new Error('Ya existe una etiqueta con esa clave.');
    error.status = 409;
    throw error;
  }

  const tag = await Tag.create({ key, es, en });
  ActivityLogger.log('ADMIN_TAG_CREATE', { tagId: tag.id, key: tag.key });
  res.status(201).json(tag);
}));

/**
 * PUT /admin/tags/:id
 * Actualiza una etiqueta global.
 */
router.put('/tags/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(tagSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { key, es, en } = req.body;

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
  res.json(tag);
}));

/**
 * DELETE /admin/tags/:id
 * Elimina una etiqueta global.
 */
router.delete('/tags/:id', optionalAuthenticateToken, checkRole(['super_admin']), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tag = await Tag.findByPk(id);

  if (!tag) {
    const error = new Error('Etiqueta no encontrada.');
    error.status = 404;
    throw error;
  }

  await tag.destroy();
  ActivityLogger.log('ADMIN_TAG_DELETE', { tagId: id, key: tag.key });
  res.json({ message: 'Etiqueta eliminada correctamente' });
}));

export default router;
