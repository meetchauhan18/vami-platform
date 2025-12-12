import responseUtils from '../../shared/utils/response.js';
import asyncHandler from '../../shared/utils/asyncHandler.js';
import authService from './auth.service.js';
import tokenService from './token.service.js';
import { sanitizeUser } from '../../shared/utils/user.sanitizer.js';
import config from '../../shared/config/index.js';

const { successResponse } = responseUtils;
const { registerUser, loginUser, logoutUser } = authService;
const { refreshTokens } = tokenService;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config?.env === 'production',
  sameSite: 'strict',
    maxAge: config?.jwt?.refreshExpiryMs,
};

/**
 * POST /auth/register
 */
const registerController = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await registerUser(req.body);

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

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

/**
 * POST /auth/logout
 */
const logoutController = asyncHandler(async (req, res) => {
  const tokenFromCookie = req.cookies?.refreshToken;
  const tokenFromBody = req.body?.refreshToken;
  const refreshToken = tokenFromCookie || tokenFromBody;

  await logoutUser(refreshToken);

  // Clear cookie
  res.clearCookie('refreshToken');

  return successResponse(res, {
    message: 'Logged out successfully',
  });
});

export default {
  registerController,
  loginController,
  refreshController,
  logoutController,
};
