import { Router } from 'express';
import {
  getOrganization,
  listOrganizations,
  mapListOrganizations,
} from '../controllers/organizationsController';

// Public, read-only. Organization creation is handled by the authenticated
// admin dashboard (see src/routes/admin.ts), not an open HTTP endpoint.
const router = Router();
router.get('/map', mapListOrganizations);
router.get('/:id', getOrganization);
router.get('/', listOrganizations);
export default router;
