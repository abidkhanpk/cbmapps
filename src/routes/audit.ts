import express from 'express';
import { requireRole } from '@/middlewares/auth';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List audit logs (admin and managers only)
router.get('/', requireRole(['admin', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { entityType, action, userId, startDate, endDate } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: 'asc' },
    });

    res.render('audit/index', {
      title: 'Audit Logs',
      logs,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
      filters: { entityType, action, userId, startDate, endDate },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).render('error', {
      message: 'Error loading audit logs',
      error: { status: 500, stack: '' },
    });
  }
});

export default router;
