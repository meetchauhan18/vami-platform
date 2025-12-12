import express from 'express';
import authMiddlewareModule from '../../shared/middleware/auth.middleware.js';
import validateMiddleware from '../../shared/middleware/validate.middleware.js';
import userController from './user.controller.js';
import userValidators from './user.validators.js';

const { authMiddleware } = authMiddlewareModule;
const { validateBody } = validateMiddleware;
const { getMe, updateMe } = userController;
const { updateProfileSchema } = userValidators;

const router = express.Router();

router.get('/me', authMiddleware, getMe);
router.patch(
  '/me',
  authMiddleware,
  validateBody(updateProfileSchema),
  updateMe
);

export default router;
