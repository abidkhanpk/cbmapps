import { prisma } from '@/lib/db';

export interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, any>;
}

export class AuditService {
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          user_id: data.userId,
          action: data.action,
          entity_type: data.entityType,
          entity_id: data.entityId,
          details: data.details,
        },
      });
    } catch (error) {
      // Log audit failures but don't throw to avoid breaking main operations
      console.error('Failed to create audit log:', error);
    }
  }

  static async logUserAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      userId,
      action,
      entityType,
      entityId,
      details,
    });
  }

  static async logSystemAction(
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      action,
      entityType,
      entityId,
      details,
    });
  }

  // Predefined audit actions
  static async logLogin(userId: string, details: Record<string, any> = {}): Promise<void> {
    await this.logUserAction(userId, 'LOGIN', 'user', userId, details);
  }

  static async logLogout(userId: string, details: Record<string, any> = {}): Promise<void> {
    await this.logUserAction(userId, 'LOGOUT', 'user', userId, details);
  }

  static async logCreate(
    userId: string,
    entityType: string,
    entityId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logUserAction(userId, 'CREATE', entityType, entityId, details);
  }

  static async logUpdate(
    userId: string,
    entityType: string,
    entityId: string,
    changes: Record<string, any> = {}
  ): Promise<void> {
    await this.logUserAction(userId, 'UPDATE', entityType, entityId, { changes });
  }

  static async logDelete(
    userId: string,
    entityType: string,
    entityId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logUserAction(userId, 'DELETE', entityType, entityId, details);
  }

  static async logApproval(
    userId: string,
    entityType: string,
    entityId: string,
    status: 'approved' | 'rejected',
    comment?: string
  ): Promise<void> {
    await this.logUserAction(userId, 'APPROVAL', entityType, entityId, {
      status,
      comment,
    });
  }

  static async logStatusChange(
    userId: string,
    entityType: string,
    entityId: string,
    fromStatus: string,
    toStatus: string
  ): Promise<void> {
    await this.logUserAction(userId, 'STATUS_CHANGE', entityType, entityId, {
      from: fromStatus,
      to: toStatus,
    });
  }

  static async logFileUpload(
    userId: string,
    entityType: string,
    entityId: string,
    fileName: string,
    fileSize: number
  ): Promise<void> {
    await this.logUserAction(userId, 'FILE_UPLOAD', entityType, entityId, {
      fileName,
      fileSize,
    });
  }

  static async getAuditLogs(filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      entityType,
      entityId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (userId) where.user_id = userId;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = startDate;
      if (endDate) where.created_at.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}