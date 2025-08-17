import prisma from '@/config/database';
import { DashboardStats } from '@/types';

export class DashboardService {
  static async getStats(): Promise<DashboardStats> {
    const [
      totalAssets,
      totalComponents,
      activeFmecaStudies,
      openActions,
      overdueCmTasks,
      actionsByPriority,
      actionsByStatus,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.component.count(),
      prisma.fmecaStudy.count({
        where: { status: { in: ['draft', 'in_review'] } },
      }),
      prisma.action.count({
        where: { status: { not: 'done' } },
      }),
      prisma.cmTask.count({
        where: {
          nextDueAt: {
            lt: new Date(),
          },
        },
      }),
      prisma.action.groupBy({
        by: ['priority'],
        _count: { id: true },
        where: { status: { not: 'done' } },
      }),
      prisma.action.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    const priorityStats = actionsByPriority.reduce((acc, item) => {
      acc[item.priority] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const statusStats = actionsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAssets,
      totalComponents,
      activeFmecaStudies,
      openActions,
      overdueCmTasks,
      actionsByPriority: priorityStats,
      actionsByStatus: statusStats,
    };
  }
}
