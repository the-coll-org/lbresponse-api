import { Router } from 'express';
import {
  createOrganization,
  listOrganizations,
} from '../controllers/organizationsController';

const router = Router();
router.get('/', listOrganizations);
router.post('/', createOrganization);
export default router;
