import { Router } from 'express';
import { getHotline, listHotlines } from '../controllers/hotlinesController';

const router = Router();
router.get('/:id', getHotline);
router.get('/', listHotlines);
export default router;
