import responseUtils from '../../shared/utils/response.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import authService from './auth.service.js';
import tokenService from './token.service.js';

const { successResponse } = responseUtils;
const { registerUser, loginUser } = authService;
const { refreshTokens } = tokenService;

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
 * POST /auth/register
 */
const registerController = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await registerUser(req.body);

  // Set refresh token as httpOnly cookie (better for security)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return successResponse(
    res,
    {
      user: sanitizeUser(user),
      tokens: {
        accessToken,
        expiresIn: 24 * 60 * 60, // 24h in seconds
      },
    },
    201
  );
});

/**
 * POST /auth/login
 */
const loginController = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await loginUser(req.body);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return successResponse(res, {
    user: sanitizeUser(user),
    tokens: {
      accessToken,
      expiresIn: 24 * 60 * 60,
    },
  });
});

/**
 * POST /auth/refresh
 */
const refreshController = asyncHandler(async (req, res) => {
  const tokenFromCookie = req.cookies?.refreshToken;
  const tokenFromBody = req.body?.refreshToken;
  const refreshToken = tokenFromCookie || tokenFromBody;

  const {
    user,
    accessToken,
    refreshToken: newRefreshToken,
  } = await refreshTokens(refreshToken);

  // rotate cookie
  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return successResponse(res, {
    user: sanitizeUser(user),
    tokens: {
      accessToken,
      expiresIn: 24 * 60 * 60,
    },
  });
});

export default {
  registerController,
  loginController,
  refreshController,
};
