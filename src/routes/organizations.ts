import { Router } from 'express';
import {
  listOrganizations,
  mapListOrganizations,
  getOrganization,
} from '../controllers/organizationsController';

const router = Router();
router.get('/map', mapListOrganizations);
router.get('/:id', getOrganization);
router.get('/', listOrganizations);
export default router;
