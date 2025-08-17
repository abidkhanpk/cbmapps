import express from 'express';
import { body, validationResult } from 'express-validator';
import { requirePermission, canManageFmeca } from '@/middlewares/rbac';
import { AuditService } from '@/services/audit';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List failure modes
router.get('/failure-modes', async (req: AuthenticatedRequest, res) => {
  try {
    const failureModes = await prisma.failureMode.findMany({
      include: {
        category: true,
      },
      orderBy: { title: 'asc' },
    });

    const categories = await prisma.fmecaCategory.findMany({
      orderBy: { name: 'asc' },
    });

    res.render('library/failure-modes', {
      title: 'Failure Modes Library',
      failureModes,
      categories,
    });
  } catch (error) {
    console.error('Failure modes error:', error);
    res.status(500).render('error', {
      message: 'Error loading failure modes',
      error: { status: 500, stack: '' },
    });
  }
});

// List rating scales
router.get('/rating-scales', async (req: AuthenticatedRequest, res) => {
  try {
    const ratingScales = await prisma.ratingScale.findMany({
      include: {
        values: {
          orderBy: { value: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.render('library/rating-scales', {
      title: 'Rating Scales',
      ratingScales,
    });
  } catch (error) {
    console.error('Rating scales error:', error);
    res.status(500).render('error', {
      message: 'Error loading rating scales',
      error: { status: 500, stack: '' },
    });
  }
});

export default router;
