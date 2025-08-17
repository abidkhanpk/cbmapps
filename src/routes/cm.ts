import express from 'express';
import { body, validationResult } from 'express-validator';
import { requirePermission, canManageFmeca, canLogReadings } from '@/middlewares/rbac';
import { AuditService } from '@/services/audit';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List CM tasks
router.get('/tasks', async (req: AuthenticatedRequest, res) => {
  try {
    const tasks = await prisma.cmTask.findMany({
      include: {
        component: {
          include: {
            asset: {
              include: {
                system: {
                  include: {
                    area: {
                      include: {
                        site: {
                          include: {
                            company: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        readings: {
          orderBy: { performedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { nextDueAt: 'asc' },
    });

    res.render('cm/tasks', {
      title: 'CM Tasks',
      tasks,
    });
  } catch (error) {
    console.error('CM tasks error:', error);
    res.status(500).render('error', {
      message: 'Error loading CM tasks',
      error: { status: 500, stack: '' },
    });
  }
});

// List readings
router.get('/readings', async (req: AuthenticatedRequest, res) => {
  try {
    const readings = await prisma.cmReading.findMany({
      include: {
        task: {
          include: {
            component: {
              include: {
                asset: true,
              },
            },
          },
        },
        performedBy: true,
      },
      orderBy: { performedAt: 'desc' },
      take: 100,
    });

    res.render('cm/readings', {
      title: 'CM Readings',
      readings,
    });
  } catch (error) {
    console.error('CM readings error:', error);
    res.status(500).render('error', {
      message: 'Error loading CM readings',
      error: { status: 500, stack: '' },
    });
  }
});

// Create reading
router.post('/readings', requirePermission(canLogReadings), [
  body('taskId').isUUID(),
  body('result').isObject(),
  body('status').isIn(['ok', 'warning', 'alarm']),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, result, status, notes } = req.body;
    
    const reading = await prisma.cmReading.create({
      data: {
        taskId,
        result,
        status,
        notes,
        performedAt: new Date(),
        performedByUserId: req.user!.id,
      },
    });

    // Update task last performed date
    await prisma.cmTask.update({
      where: { id: taskId },
      data: { lastPerformedAt: new Date() },
    });

    await AuditService.log(req.user!.id, 'create', 'cm_reading', reading.id, { taskId, status });
    res.json(reading);
  } catch (error) {
    console.error('Create CM reading error:', error);
    res.status(500).json({ error: 'Error creating CM reading' });
  }
});

export default router;
