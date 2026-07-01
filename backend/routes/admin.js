import express from 'express';
import { validateBody } from '../middleware/validate.js';
import { optionalAuthenticateToken, checkRole } from '../middleware/auth.js';
import { 
  organizationSchema, 
  organizationUpdateSchema, 
  adminRecipeSchema, 
  tagSchema,
  addOrgUserSchema,
  bulkOrgUsersSchema,
  translateSchema
} from '../models/validators.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Stats & General admin endpoints
router.get('/stats', optionalAuthenticateToken, checkRole(['super_admin']), adminController.getStats);
router.get('/recipes', optionalAuthenticateToken, checkRole(['super_admin']), adminController.getRecipes);
router.get('/tags', optionalAuthenticateToken, checkRole(['super_admin']), adminController.getTags);

// Translation endpoint
router.post('/translate', optionalAuthenticateToken, checkRole(['super_admin', 'admin']), validateBody(translateSchema), adminController.translate);

// Organization Management
router.get('/organizations', optionalAuthenticateToken, checkRole(['super_admin']), adminController.getOrganizations);
router.post('/organizations', validateBody(organizationSchema), adminController.createOrganization);
router.get('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), adminController.getOrganizationDetails);
router.put('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(organizationUpdateSchema), adminController.updateOrganization);
router.delete('/organizations/:id', optionalAuthenticateToken, checkRole(['super_admin']), adminController.toggleOrganizationStatus);

// Organization User Management
router.post('/organizations/:id/users', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(addOrgUserSchema), adminController.addUserToOrganization);
router.post('/organizations/:id/users/bulk', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(bulkOrgUsersSchema), adminController.bulkAddUsersToOrganization);
router.delete('/organizations/:id/users/:userId', optionalAuthenticateToken, checkRole(['super_admin']), adminController.removeUserFromOrganization);

// Recipe CRUD Management
router.post('/recipes', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(adminRecipeSchema), adminController.createGlobalRecipe);
router.put('/recipes/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(adminRecipeSchema), adminController.updateGlobalRecipe);
router.delete('/recipes/:id', optionalAuthenticateToken, checkRole(['super_admin']), adminController.deleteGlobalRecipe);

// Tag CRUD Management
router.post('/tags', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(tagSchema), adminController.createTag);
router.put('/tags/:id', optionalAuthenticateToken, checkRole(['super_admin']), validateBody(tagSchema), adminController.updateTag);
router.delete('/tags/:id', optionalAuthenticateToken, checkRole(['super_admin']), adminController.deleteTag);

export default router;
