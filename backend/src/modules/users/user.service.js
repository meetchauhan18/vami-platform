import User from '../../shared/models/User.model.js';
import logger from '../../shared/utils/logger.js';

/**
 * Get user by ID
 */
const getUserById = async userId => {
  const user = await User.findById(userId);

  if (!user || user?.status === 'deleted') {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  logger?.info('User retrieved', { userId: user?._id });

  return user;
};

/**
 * Update user profile
 */
const updateUserProfile = async (userId, profileData) => {
  const user = await User.findById(userId);

  if (!user || user?.status === 'deleted') {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Apply partial updates to profile
  if (profileData) {
    user.profile = {
      ...user.profile.toObject(),
      ...profileData,
    };
  }

  await user.save();

  logger?.info('User profile updated', { userId: user?._id });

  return user;
};

export default {
  getUserById,
  updateUserProfile,
};
