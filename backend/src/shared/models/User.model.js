import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profile: {
      firstName: { type: String, trim: true, maxlength: 50 },
      lastName: { type: String, trim: true, maxlength: 50 },
      bio: { type: String, trim: true, maxlength: 200 },
      avatarUrl: { type: String, trim: true },
    },
    stats: {
      followersCount: { type: Number, default: 0 },
      followingCount: { type: Number, default: 0 },
      postsCount: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted', 'banned'],
      default: 'active',
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    lastSeen: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for text search (later for user search)
userSchema.index({
  username: 'text',
  'profile.firstName': 'text',
  'profile.lastName': 'text',
});

const User = mongoose.model('User', userSchema);

export default User;
