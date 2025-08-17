import request from 'supertest';
import app from '../src/server';
import { prisma } from './setup';

describe('Authentication', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create test user
      const role = await prisma.role.create({
        data: { name: 'admin' },
      });

      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash: '$2b$10$test', // Mock hash
          fullName: 'Test User',
          userRoles: {
            create: {
              roleId: role.id,
            },
          },
        },
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/dashboard');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Invalid credentials');
    });
  });
});
