import request from 'supertest';
import app from '../../app.js';
import { createTestUser } from '../../test-utils/factories.js';

describe('Auth Integration Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const payload = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'Password123!@#',
        firstName: 'New',
        lastName: 'User',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.user.email).toBe(payload.email.toLowerCase());
      expect(res.body.data.tokens).toHaveProperty('accessToken');

      // Check httpOnly cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(cookie => cookie.startsWith('refreshToken='))).toBe(
        true
      );
    });

    it('should reject duplicate email', async () => {
      const user = await createTestUser({ email: 'duplicate@example.com' });

      const payload = {
        email: 'duplicate@example.com',
        username: 'different',
        password: 'Password123!@#',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should reject invalid password (too weak)', async () => {
      const payload = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login existing user', async () => {
      // Create user first
      const user = await createTestUser({
        email: 'login@example.com',
        username: 'loginuser',
      });

      const payload = {
        identifier: 'loginuser',
        password: 'Password123!@#', // This matches the default password in createTestUser
      };

      const res = await request(app).post('/api/v1/auth/login').send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('loginuser');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    it('should reject invalid credentials', async () => {
      const payload = {
        identifier: 'nonexistent',
        password: 'WrongPassword123!',
      };

      const res = await request(app).post('/api/v1/auth/login').send(payload);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout user and revoke token', async () => {
      // Register and login
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'logout@example.com',
          username: 'logoutuser',
          password: 'Password123!@#',
        });

      const cookies = registerRes.headers['set-cookie'];
      const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', refreshCookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.message).toContain('Logged out');

      // Try to refresh with revoked token (should fail)
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      // Register first
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'refresh@example.com',
          username: 'refreshuser',
          password: 'Password123!@#',
        });

      const cookies = registerRes.headers['set-cookie'];
      const refreshCookie = cookies.find(c => c.startsWith('refreshToken='));

      // Wait a bit to ensure different token
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', refreshCookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.tokens).toHaveProperty('accessToken');

      // Should get new refresh token
      const newCookies = refreshRes.headers['set-cookie'];
      expect(newCookies).toBeDefined();
    });
  });
});
