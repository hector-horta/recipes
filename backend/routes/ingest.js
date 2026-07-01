import { Router } from 'express';
import { checkRole, optionalAuthenticateToken } from '../middleware/auth.js';
import * as ingestController from '../controllers/ingestController.js';

const router = Router();

router.use(optionalAuthenticateToken);
router.use(checkRole(['admin', 'super_admin']));

router.post('/image', ingestController.ingestImage);
router.post('/images', ingestController.ingestImages);
router.post('/text', ingestController.ingestText);
router.post('/transcribe', ingestController.transcribe);
router.post('/voice', ingestController.ingestVoice);
router.post('/save', ingestController.save);
router.post('/:slug/:action', ingestController.executeAction);
router.get('/logs', ingestController.getLogs);

export default router;
