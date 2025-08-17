import express from 'express';
import { body, validationResult } from 'express-validator';
import { requirePermission, canManageFmeca } from '@/middlewares/rbac';
import { AuditService } from '@/services/audit';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List companies
router.get('/companies', async (req: AuthenticatedRequest, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        sites: {
          include: {
            areas: {
              include: {
                systems: {
                  include: {
                    assets: {
                      include: {
                        components: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.render('org/companies', {
      title: 'Companies',
      companies,
    });
  } catch (error) {
    console.error('Companies list error:', error);
    res.status(500).render('error', {
      message: 'Error loading companies',
      error: { status: 500, stack: '' },
    });
  }
});

// Create company
router.post('/companies', requirePermission(canManageFmeca), [
  body('name').isLength({ min: 2 }),
  body('code').isLength({ min: 2 }),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code } = req.body;
    const company = await prisma.company.create({
      data: { name, code },
    });

    await AuditService.log(req.user!.id, 'create', 'company', company.id, { name, code });
    res.json(company);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Error creating company' });
  }
});

export default router;
