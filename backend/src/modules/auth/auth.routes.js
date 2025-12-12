import express from 'express';
import authController from './auth.controller.js';
import validateMiddleware from '../../shared/middleware/validate.middleware.js';
import authValidator from './auth.validator.js';
import {
  loginRateLimiter,
  registrationRateLimiter,
} from '../../shared/middleware/rate-limit.middleware.js';

const {
  registerController,
  loginController,
  refreshController,
  logoutController,
} = authController;
const { validateBody } = validateMiddleware;
const { registerSchema, loginSchema } = authValidator;

const router = express.Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  registrationRateLimiter,
  validateBody(registerSchema),
  registerController
);

// POST /api/v1/auth/login
router.post(
  '/login',
  loginRateLimiter,
  validateBody(loginSchema),
  loginController
);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshController);

// POST /api/v1/auth/logout
router.post('/logout', logoutController);

export default router;
