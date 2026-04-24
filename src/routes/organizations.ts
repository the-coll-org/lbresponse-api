import { Router } from 'express';
import { listOrganizations } from '../controllers/organizationsController';

const router = Router();
router.get('/', listOrganizations);
export default router;
