import { Router } from 'express';
import {
  createOrganization,
  getOrganization,
  listOrganizations,
  mapListOrganizations,
} from '../controllers/organizationsController';

const router = Router();
router.get('/map', mapListOrganizations);
router.get('/:id', getOrganization);
router.get('/', listOrganizations);
router.post('/', createOrganization);
export default router;
