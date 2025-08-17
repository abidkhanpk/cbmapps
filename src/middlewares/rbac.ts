import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '@/types';

export const hasRole = (req: AuthenticatedRequest, roleName: string): boolean => {
  if (!req.user) return false;
  return req.user.userRoles.some(ur => ur.role.name === roleName);
};

export const hasAnyRole = (req: AuthenticatedRequest, roleNames: string[]): boolean => {
  if (!req.user) return false;
  const userRoles = req.user.userRoles.map(ur => ur.role.name);
  return roleNames.some(role => userRoles.includes(role));
};

export const canManageUsers = (req: AuthenticatedRequest): boolean => {
  return hasRole(req, 'admin');
};

export const canManageFmeca = (req: AuthenticatedRequest): boolean => {
  return hasAnyRole(req, ['admin', 'reliability_engineer']);
};

export const canApproveFmeca = (req: AuthenticatedRequest): boolean => {
  return hasAnyRole(req, ['admin', 'manager']);
};

export const canManageActions = (req: AuthenticatedRequest): boolean => {
  return hasAnyRole(req, ['admin', 'reliability_engineer', 'maint_planner', 'manager']);
};

export const canLogReadings = (req: AuthenticatedRequest): boolean => {
  return hasAnyRole(req, ['admin', 'reliability_engineer', 'technician']);
};

export const requirePermission = (permissionCheck: (req: AuthenticatedRequest) => boolean) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!permissionCheck(req)) {
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
