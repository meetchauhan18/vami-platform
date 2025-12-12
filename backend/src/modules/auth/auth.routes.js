import express from 'express';
import authController from './auth.controller.js';
import validateMiddleware from '../../shared/middleware/validate.middleware.js';
import authValidator from './auth.validator.js';

const { registerController, loginController, refreshController } = authController;
const { validateBody } = validateMiddleware;
const { registerSchema, loginSchema } = authValidator;

const router = express.Router();

// POST /api/v1/auth/register
router.post('/register', validateBody(registerSchema), registerController);

// POST /api/v1/auth/login
router.post('/login', validateBody(loginSchema), loginController);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshController);

export default router;
