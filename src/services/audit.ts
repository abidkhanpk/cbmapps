import prisma from '@/config/database';

export class AuditService {
  static async log(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    details: any = {}
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details,
        },
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }
}
