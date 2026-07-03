import { Router } from 'express';
import { authMiddleware, requirePlatformAdmin } from '../../middlewares/auth.middleware.js';
import {
  cleanupE2eTenants,
  deleteTenant,
  endImpersonationLog,
  getMetrics,
  getTenantDetail,
  impersonateTenant,
  listImpersonationLogs,
  listTenants,
  platformLogin,
  updateTenantPlan,
  updateTenantStatus,
} from './platform.controller.js';

const router = Router();

router.post('/auth/login', platformLogin);

const platformAuth = [authMiddleware, requirePlatformAdmin];

router.get('/tenants', ...platformAuth, listTenants);
router.delete('/tenants/e2e-cleanup', ...platformAuth, cleanupE2eTenants);
router.get('/tenants/:tenantId', ...platformAuth, getTenantDetail);
router.delete('/tenants/:tenantId', ...platformAuth, deleteTenant);
router.post('/tenants/:tenantId/impersonate', ...platformAuth, impersonateTenant);
router.patch('/tenants/:tenantId/status', ...platformAuth, updateTenantStatus);
router.patch('/tenants/:tenantId/plan', ...platformAuth, updateTenantPlan);
router.get('/metrics', ...platformAuth, getMetrics);
router.get('/impersonation-logs', ...platformAuth, listImpersonationLogs);
router.post('/impersonation-logs/:auditLogId/end', ...platformAuth, endImpersonationLog);

export default router;
