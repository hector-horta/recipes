import { AdminStatsService } from '../services/AdminStatsService.js';
import { OrganizationService } from '../services/OrganizationService.js';
import { AdminRecipeService } from '../services/AdminRecipeService.js';
import { AdminTagService } from '../services/AdminTagService.js';
import { translateText } from '../services/NvidiaNIM.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (req, res) => {
  const stats = await AdminStatsService.getAdminStats();
  res.json(stats);
});

export const getOrganizations = asyncHandler(async (req, res) => {
  const organizations = await OrganizationService.getAllOrganizations();
  res.json(organizations);
});

export const getRecipes = asyncHandler(async (req, res) => {
  const { number, offset } = req.query;
  const result = await AdminRecipeService.getGlobalRecipes(number, offset);
  res.json(result);
});

export const getTags = asyncHandler(async (req, res) => {
  const tags = await AdminTagService.getAllTags();
  res.json(tags);
});

export const createOrganization = asyncHandler(async (req, res) => {
  const { name, slug } = req.body;
  const organization = await OrganizationService.createOrganization(name, slug);
  res.status(201).json(organization);
});

export const updateOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, slug, is_active } = req.body;
  const result = await OrganizationService.updateOrganization(id, { name, slug, is_active });
  res.json(result);
});

export const toggleOrganizationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await OrganizationService.toggleOrganizationStatus(id);
  res.json({
    message: `Organización ${organization.is_active ? 'activada' : 'suspendida'} correctamente`,
    organization
  });
});

export const getOrganizationDetails = asyncHandler(async (req, res) => {
  const result = await OrganizationService.getOrganizationDetails(req.params.id);
  res.json(result);
});

export const addUserToOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { displayName, email, role } = req.body;
  const result = await OrganizationService.addUserToOrganization(id, { displayName, email, role });
  res.status(201).json(result);
});

export const bulkAddUsersToOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { users } = req.body;
  const result = await OrganizationService.bulkAddUsersToOrganization(id, users);
  res.json(result);
});

export const removeUserFromOrganization = asyncHandler(async (req, res) => {
  const { id, userId } = req.params;
  const result = await OrganizationService.removeUserFromOrganization(id, userId);
  res.json(result);
});

export const createGlobalRecipe = asyncHandler(async (req, res) => {
  const recipe = await AdminRecipeService.createGlobalRecipe(req.body);
  res.status(201).json(recipe);
});

export const updateGlobalRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recipe = await AdminRecipeService.updateGlobalRecipe(id, req.body);
  res.json(recipe);
});

export const deleteGlobalRecipe = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await AdminRecipeService.deleteGlobalRecipe(id);
  res.json(result);
});

export const createTag = asyncHandler(async (req, res) => {
  const { key, es, en } = req.body;
  const tag = await AdminTagService.createTag(key, es, en);
  res.status(201).json(tag);
});

export const updateTag = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { key, es, en } = req.body;
  const tag = await AdminTagService.updateTag(id, { key, es, en });
  res.json(tag);
});

export const deleteTag = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await AdminTagService.deleteTag(id);
  res.json(result);
});

export const translate = asyncHandler(async (req, res) => {
  const { text, from, to } = req.body;
  const apiKey = config.NVIDIA_API_KEY || config.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'No translation API key configured (NVIDIA or GEMINI)' });
  }

  const translation = await translateText(text, from, to, apiKey);
  res.json({ translation });
});
