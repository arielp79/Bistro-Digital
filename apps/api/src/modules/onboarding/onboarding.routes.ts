import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { checkSlug, listPlans, registerTenant, suggestSlug } from './onboarding.controller.js';

const router = Router();

const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: 'Demasiados intentos de registro. Probá más tarde.' },
});

router.get('/plans', listPlans);
router.get('/check-slug', checkSlug);
router.get('/suggest-slug', suggestSlug);
router.post('/register', onboardingLimiter, registerTenant);

export default router;
