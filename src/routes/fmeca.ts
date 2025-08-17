import express from 'express';
import { body, validationResult } from 'express-validator';
import { requirePermission, canManageFmeca, canApproveFmeca } from '@/middlewares/rbac';
import { FmecaService } from '@/services/fmeca';
import { AuditService } from '@/services/audit';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List studies
router.get('/studies', async (req: AuthenticatedRequest, res) => {
  try {
    const studies = await prisma.fmecaStudy.findMany({
      include: {
        company: true,
        owner: true,
        items: true,
        approvals: {
          include: {
            approver: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.render('fmeca/studies', {
      title: 'FMECA Studies',
      studies,
    });
  } catch (error) {
    console.error('FMECA studies error:', error);
    res.status(500).render('error', {
      message: 'Error loading FMECA studies',
      error: { status: 500, stack: '' },
    });
  }
});

// Study detail
router.get('/studies/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const study = await prisma.fmecaStudy.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        owner: true,
        items: {
          include: {
            component: {
              include: {
                asset: {
                  include: {
                    system: {
                      include: {
                        area: {
                          include: {
                            site: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            failureMode: true,
          },
        },
        approvals: {
          include: {
            approver: true,
          },
        },
      },
    });

    if (!study) {
      return res.status(404).render('error', {
        message: 'FMECA study not found',
        error: { status: 404, stack: '' },
      });
    }

    res.render('fmeca/study-detail', {
      title: `FMECA Study: ${study.title}`,
      study,
    });
  } catch (error) {
    console.error('FMECA study detail error:', error);
    res.status(500).render('error', {
      message: 'Error loading FMECA study',
      error: { status: 500, stack: '' },
    });
  }
});

// Create study
router.post('/studies', requirePermission(canManageFmeca), [
  body('title').isLength({ min: 3 }),
  body('scope').isLength({ min: 10 }),
  body('companyId').isUUID(),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, scope, companyId } = req.body;
    const study = await prisma.fmecaStudy.create({
      data: {
        title,
        scope,
        companyId,
        ownerUserId: req.user!.id,
      },
    });

    await AuditService.log(req.user!.id, 'create', 'fmeca_study', study.id, { title, scope });
    res.json(study);
  } catch (error) {
    console.error('Create FMECA study error:', error);
    res.status(500).json({ error: 'Error creating FMECA study' });
  }
});

// Update FMECA item
router.put('/items/:id', requirePermission(canManageFmeca), [
  body('severity').isInt({ min: 1, max: 10 }),
  body('occurrence').isInt({ min: 1, max: 10 }),
  body('detectability').isInt({ min: 1, max: 10 }),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { severity, occurrence, detectability, effect, cause, detection, recommendedActions, monitoringTechniques } = req.body;
    
    const calculation = await FmecaService.calculateFmecaItem(severity, occurrence, detectability);
    
    const item = await prisma.fmecaItem.update({
      where: { id: req.params.id },
      data: {
        severity,
        occurrence,
        detectability,
        rpn: calculation.rpn,
        criticality: calculation.criticality,
        effect,
        cause,
        detection,
        recommendedActions,
        monitoringTechniques,
      },
    });

    await AuditService.log(req.user!.id, 'update', 'fmeca_item', item.id, calculation);
    res.json(item);
  } catch (error) {
    console.error('Update FMECA item error:', error);
    res.status(500).json({ error: 'Error updating FMECA item' });
  }
});

export default router;
