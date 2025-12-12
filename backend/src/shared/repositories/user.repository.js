import User from '../models/User.model.js';

/**
 * User repository - isolates database operations
 * Enables dependency injection and mocking in tests
 */
export const createUserRepository = (UserModel = User) => ({

  findByEmailOrUsername: async (email, username) => {
    return UserModel.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { username: username?.toLowerCase() },
      ],
    });
  },

  findById: async userId => {
    return UserModel.findById(userId);
  },

  create: async userData => {
    return UserModel.create(userData);
  },

  updateById: async (userId, updates) => {
    return UserModel.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    });
  },

  findWithPagination: async (filter, options = {}) => {
    const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      UserModel.find(filter).sort(sort).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
    };
  },

  searchByText: async (query, options = {}) => {
    const { limit = 20 } = options;
    return UserModel.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit);
  },
});

// Export default instance
export default createUserRepository();
