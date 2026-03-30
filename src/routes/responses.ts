import { Router } from 'express';
import { getResponses } from '../controllers/responseController';

const router = Router();

router.get('/', getResponses);

export default router;
