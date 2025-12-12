import responseUtils from '../../shared/utils/response.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import userService from './user.service.js';

const { successResponse } = responseUtils;
const { getUserById, updateUserProfile } = userService;

const sanitizeUser = user => ({
  id: user._id,
  email: user.email,
  username: user.username,
  profile: {
    firstName: user.profile?.firstName || null,
    lastName: user.profile?.lastName || null,
    avatarUrl: user.profile?.avatarUrl || null,
    bio: user.profile?.bio || null,
  },
  stats: user.stats,
  role: user.role,
  status: user.status,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

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
