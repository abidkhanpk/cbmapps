import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserWithRoles } from '@/types';
import prisma from '@/config/database';

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.session?.userId) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return res.redirect('/auth/login');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }
      return res.redirect('/auth/login');
    }

    req.user = user as UserWithRoles;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.userRoles.map(ur => ur.role.name);
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(403).render('error', { 
        message: 'Access Denied', 
        error: { status: 403, stack: '' } 
      });
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.session?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (user && user.isActive) {
        req.user = user as UserWithRoles;
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};
