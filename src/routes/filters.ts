import { Router } from 'express';
import { listFilters } from '../controllers/filtersController';

const router = Router();
router.get('/', listFilters);
export default router;
