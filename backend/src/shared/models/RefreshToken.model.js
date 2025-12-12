import mongoose from 'mongoose';

/**
 * RefreshToken schema for token revocation and rotation
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Don't use index: true here, we'll use TTL index below
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    deviceInfo: {
      userAgent: { type: String },
      ip: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

/**
 * TTL index - MongoDB automatically deletes documents after expiresAt
 */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Index for efficient revocation queries
 */
refreshTokenSchema.index({ userId: 1, revokedAt: 1 });

/**
 * Instance method to check if token is valid
 */
refreshTokenSchema.methods.isValid = function () {
  if (this.revokedAt) return false;
  if (this.expiresAt < new Date()) return false;
  return true;
};

/**
 * Static method to revoke all tokens for a user
 */
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
  return this.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
