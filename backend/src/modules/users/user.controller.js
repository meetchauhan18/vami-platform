import responseUtils from '../../shared/utils/response.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import userService from './user.service.js';
import { sanitizeUser } from '../../shared/utils/user.sanitizer.js';

const { successResponse } = responseUtils;
const { getUserById, updateUserProfile } = userService;

/**
 * GET /users/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await getUserById(req.user?.id);
  return successResponse(res, sanitizeUser(user));
});

/**
 * PATCH /users/me
 */
const updateMe = asyncHandler(async (req, res) => {
  const { profile } = req.body;
  const user = await updateUserProfile(req.user?.id, profile);
  return successResponse(res, sanitizeUser(user));
});

export default {
  getMe,
  updateMe,
};
