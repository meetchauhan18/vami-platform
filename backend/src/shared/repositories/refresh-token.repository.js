import RefreshToken from '../models/RefreshToken.model.js';

/**
 * RefreshToken repository - isolates token database operations
 */
export const createRefreshTokenRepository = (
  RefreshTokenModel = RefreshToken
) => ({
  /**
   * Create new refresh token record
   * @param {Object} tokenData
   * @returns {Promise<Object>}
   */
  create: async tokenData => {
    return RefreshTokenModel.create(tokenData);
  },

  /**
   * Find token by hash
   * @param {string} tokenHash
   * @returns {Promise<Object|null>}
   */
  findByHash: async tokenHash => {
    return RefreshTokenModel.findOne({ tokenHash });
  },

  /**
   * Find valid (non-revoked, non-expired) token by hash
   * @param {string} tokenHash
   * @returns {Promise<Object|null>}
   */
  findValidByHash: async tokenHash => {
    return RefreshTokenModel.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  },

  /**
   * Revoke token by hash
   * @param {string} tokenHash
   * @returns {Promise<Object|null>}
   */
  revoke: async tokenHash => {
    return RefreshTokenModel.findOneAndUpdate(
      { tokenHash },
      { revokedAt: new Date() },
      { new: true }
    );
  },

  /**
   * Revoke all tokens for a user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  revokeAllForUser: async userId => {
    return RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date() }
    );
  },

  /**
   * Delete expired tokens (cleanup)
   * @returns {Promise<Object>}
   */
  deleteExpired: async () => {
    return RefreshTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  },

  /**
   * Count active tokens for user
   * @param {string} userId
   * @returns {Promise<number>}
   */
  countActiveForUser: async userId => {
    return RefreshTokenModel.countDocuments({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
  },
});

// Export default instance
export default createRefreshTokenRepository();
