import path from 'path';
import { fileURLToPath } from 'url';
import { IngestionService } from '../services/IngestionService.js';
import { RecipeActionService } from '../services/RecipeActionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  ingestImageSchema,
  ingestImagesSchema,
  ingestTextSchema,
  transcribeSchema
} from '../models/validators.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '..', 'ingest_logs');

const handleIngestConflict = (res, err) => {
  if (err.status === 409 && err.conflict) {
    return res.status(409).json({ error: err.message, conflict: true, recipe: err.recipe });
  }
  throw err;
};

const validateBodyData = (schema, body) => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error('Datos de ingesta inválidos');
    error.status = 400;
    error.name = 'ZodError';
    error.errors = result.error.errors;
    throw error;
  }
  return result.data;
};

export const ingestImage = asyncHandler(async (req, res) => {
  const data = validateBodyData(ingestImageSchema, req.body);
  try {
    const result = await IngestionService.ingestImage({
      ...data,
      user: req.user,
      ip: req.ip,
      adminKeyFingerprint: req.adminKeyFingerprint,
      bodyOrgId: req.body.organization_id
    });
    res.json(result);
  } catch (err) {
    handleIngestConflict(res, err);
  }
});

export const ingestImages = asyncHandler(async (req, res) => {
  const data = validateBodyData(ingestImagesSchema, req.body);
  try {
    const result = await IngestionService.ingestImages({
      ...data,
      user: req.user,
      ip: req.ip,
      adminKeyFingerprint: req.adminKeyFingerprint,
      bodyOrgId: req.body.organization_id
    });
    res.json(result);
  } catch (err) {
    handleIngestConflict(res, err);
  }
});

export const ingestText = asyncHandler(async (req, res) => {
  const data = validateBodyData(ingestTextSchema, req.body);
  try {
    const result = await IngestionService.ingestText({
      ...data,
      user: req.user,
      ip: req.ip,
      adminKeyFingerprint: req.adminKeyFingerprint,
      bodyOrgId: req.body.organization_id
    });
    res.json(result);
  } catch (err) {
    handleIngestConflict(res, err);
  }
});

export const transcribe = asyncHandler(async (req, res) => {
  const data = validateBodyData(transcribeSchema, req.body);
  const result = await IngestionService.transcribeAudio({
    ...data,
    user: req.user,
    ip: req.ip,
    adminKeyFingerprint: req.adminKeyFingerprint
  });
  res.json(result);
});

export const ingestVoice = asyncHandler(async (req, res) => {
  const data = validateBodyData(transcribeSchema, req.body);
  try {
    const result = await IngestionService.ingestVoice({
      ...data,
      user: req.user,
      ip: req.ip,
      adminKeyFingerprint: req.adminKeyFingerprint,
      bodyOrgId: req.body.organization_id
    });
    res.json(result);
  } catch (err) {
    handleIngestConflict(res, err);
  }
});

export const save = asyncHandler(async (req, res) => {
  const { status, generateImage, ...recipeData } = req.body;
  const result = await RecipeActionService.saveRecipe({
    recipeData,
    status,
    generateImage,
    user: req.user,
    ip: req.ip,
    adminKeyFingerprint: req.adminKeyFingerprint,
    bodyOrgId: req.body.organization_id
  });
  res.status(result.status === 'created' ? 201 : 200).json(result);
});

export const executeAction = asyncHandler(async (req, res) => {
  const { slug, action } = req.params;
  const { issue } = req.body || {};
  const result = await RecipeActionService.executeRecipeAction({
    slugOrId: slug,
    action,
    issue,
    user: req.user,
    ip: req.ip,
    adminKeyFingerprint: req.adminKeyFingerprint
  });

  if (result.type === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.attachment(result.filename);
    return res.send(result.data);
  }
  if (result.type === 'curl') {
    return res.json({ command: result.command });
  }
  res.json(result);
});

export const getLogs = asyncHandler(async (req, res) => {
  const result = await RecipeActionService.getLogs(logsDir);
  res.json(result);
});
