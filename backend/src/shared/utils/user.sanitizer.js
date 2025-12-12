/**
 * Sanitize user object for API responses
 * Removes sensitive fields like passwordHash
 *
 * @param {Object} user - User document from database
 * @returns {Object} Sanitized user DTO
 */
export const sanitizeUser = user => {
  if (!user) return null;

  return {
    id: user._id,
    email: user.email,
    username: user.username,
    profile: {
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
    },
    stats: user.stats || {
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
    },
    role: user.role,
    status: user.status,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Sanitize array of users
 * @param {Array<Object>} users
 * @returns {Array<Object>}
 */
export const sanitizeUsers = users => {
  if (!Array.isArray(users)) return [];
  return users.map(sanitizeUser);
};
