import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireRole } from '@/middlewares/auth';
import { requirePermission, canManageUsers } from '@/middlewares/rbac';
import { AuthService } from '@/services/auth';
import { AuditService } from '@/services/audit';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List users (admin only)
router.get('/', requirePermission(canManageUsers), async (req: AuthenticatedRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.render('users/index', {
      title: 'Users',
      users,
    });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).render('error', {
      message: 'Error loading users',
      error: { status: 500, stack: '' },
    });
  }
});

// Create user form
router.get('/create', requirePermission(canManageUsers), async (req: AuthenticatedRequest, res) => {
  try {
    const roles = await prisma.role.findMany();
    res.render('users/create', {
      title: 'Create User',
      roles,
    });
  } catch (error) {
    console.error('Create user form error:', error);
    res.status(500).render('error', {
      message: 'Error loading create user form',
      error: { status: 500, stack: '' },
    });
  }
});

// Create user
router.post('/', requirePermission(canManageUsers), [
  body('email').isEmail().normalizeEmail(),
  body('fullName').isLength({ min: 2 }),
  body('password').isLength({ min: 8 }),
  body('roles').isArray({ min: 1 }),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const roles = await prisma.role.findMany();
      return res.render('users/create', {
        title: 'Create User',
        roles,
        errors: errors.array(),
        formData: req.body,
      });
    }

    const { email, fullName, password, roles } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const allRoles = await prisma.role.findMany();
      return res.render('users/create', {
        title: 'Create User',
        roles: allRoles,
        errors: [{ msg: 'User with this email already exists' }],
        formData: req.body,
      });
    }

    const user = await AuthService.createUser(email, password, fullName, roles);
    await AuditService.log(req.user!.id, 'create', 'user', user.id, { email, fullName, roles });

    res.redirect('/users');
  } catch (error) {
    console.error('Create user error:', error);
    const roles = await prisma.role.findMany();
    res.render('users/create', {
      title: 'Create User',
      roles,
      errors: [{ msg: 'Error creating user' }],
      formData: req.body,
    });
  }
});

export default router;
