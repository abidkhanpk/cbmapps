import { User, Role, UserRole } from '@prisma/client';

export interface UserWithRoles extends User {
  userRoles: (UserRole & {
    role: Role;
  })[];
}

export interface AuthenticatedRequest extends Express.Request {
  user?: UserWithRoles;
  csrfToken?: () => string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FmecaCalculation {
  severity: number;
  occurrence: number;
  detectability: number;
  rpn: number;
  criticality: 'low' | 'medium' | 'high';
}

export interface DashboardStats {
  totalAssets: number;
  totalComponents: number;
  activeFmecaStudies: number;
  openActions: number;
  overdueCmTasks: number;
  actionsByPriority: Record<string, number>;
  actionsByStatus: Record<string, number>;
}
