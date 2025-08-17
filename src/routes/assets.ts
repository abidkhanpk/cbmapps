import express from 'express';
import { body, validationResult } from 'express-validator';
import { requirePermission, canManageFmeca } from '@/middlewares/rbac';
import { AuditService } from '@/services/audit';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List assets
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const assets = await prisma.asset.findMany({
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
        components: true,
      },
      orderBy: { name: 'asc' },
    });

    res.render('assets/index', {
      title: 'Assets',
      assets,
    });
  } catch (error) {
    console.error('Assets list error:', error);
    res.status(500).render('error', {
      message: 'Error loading assets',
      error: { status: 500, stack: '' },
    });
  }
});

// Asset detail
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
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
        components: {
          include: {
            fmecaItems: {
              include: {
                study: true,
              },
            },
            cmTasks: {
              include: {
                readings: {
                  orderBy: { performedAt: 'desc' },
                  take: 5,
                },
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return res.status(404).render('error', {
        message: 'Asset not found',
        error: { status: 404, stack: '' },
      });
    }

    res.render('assets/detail', {
      title: `Asset: ${asset.name}`,
      asset,
    });
  } catch (error) {
    console.error('Asset detail error:', error);
    res.status(500).render('error', {
      message: 'Error loading asset',
      error: { status: 500, stack: '' },
    });
  }
});

export default router;
