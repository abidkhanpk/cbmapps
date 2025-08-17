import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '@/services/auth';
import { AuditService } from '@/services/audit';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// Login page
router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { title: 'Login', error: null });
});

// Login handler
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Please provide valid email and password',
      });
    }

    const { email, password } = req.body;
    const user = await AuthService.findUserByEmail(email);

    if (!user || !user.isActive) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid credentials',
      });
    }

    const isValidPassword = await AuthService.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid credentials',
      });
    }

    req.session.userId = user.id;
    await AuthService.updateLastLogin(user.id);
    await AuditService.log(user.id, 'login', 'user', user.id, { email });

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      title: 'Login',
      error: 'An error occurred during login',
    });
  }
});

// Logout
router.post('/logout', (req: AuthenticatedRequest, res) => {
  const userId = req.session?.userId;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    
    if (userId) {
      AuditService.log(userId, 'logout', 'user', userId, {});
    }
    
    res.redirect('/auth/login');
  });
});

export default router;
