import express from 'express';
import { body, validationResult } from 'express-validator';
import { requirePermission, canManageActions } from '@/middlewares/rbac';
import { AuditService } from '@/services/audit';
import prisma from '@/config/database';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

// List actions
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { status, priority, assignee } = req.query;
    
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignee) where.assigneeUserId = assignee;

    const actions = await prisma.action.findMany({
      where,
      include: {
        assignee: true,
        createdBy: true,
        comments: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: 'asc' },
    });

    res.render('actions/index', {
      title: 'Actions',
      actions,
      users,
      filters: { status, priority, assignee },
    });
  } catch (error) {
    console.error('Actions list error:', error);
    res.status(500).render('error', {
      message: 'Error loading actions',
      error: { status: 500, stack: '' },
    });
  }
});

// Create action
router.post('/', requirePermission(canManageActions), [
  body('title').isLength({ min: 3 }),
  body('description').isLength({ min: 10 }),
  body('entityType').isIn(['fmeca_item', 'cm_reading', 'component']),
  body('entityId').isUUID(),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, entityType, entityId, assigneeUserId, dueDate, priority } = req.body;
    
    const action = await prisma.action.create({
      data: {
        title,
        description,
        entityType,
        entityId,
        assigneeUserId: assigneeUserId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        createdByUserId: req.user!.id,
      },
    });

    await AuditService.log(req.user!.id, 'create', 'action', action.id, { title, priority });
    res.json(action);
  } catch (error) {
    console.error('Create action error:', error);
    res.status(500).json({ error: 'Error creating action' });
  }
});

// Update action status
router.patch('/:id/status', [
  body('status').isIn(['open', 'in_progress', 'blocked', 'done', 'cancelled']),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;
    
    const action = await prisma.action.update({
      where: { id: req.params.id },
      data: { status },
    });

    await AuditService.log(req.user!.id, 'update_status', 'action', action.id, { status });
    res.json(action);
  } catch (error) {
    console.error('Update action status error:', error);
    res.status(500).json({ error: 'Error updating action status' });
  }
});

// Add comment
router.post('/:id/comments', [
  body('note').isLength({ min: 1 }),
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { note } = req.body;
    
    const comment = await prisma.actionComment.create({
      data: {
        actionId: req.params.id,
        authorUserId: req.user!.id,
        note,
      },
      include: {
        author: true,
      },
    });

    await AuditService.log(req.user!.id, 'comment', 'action', req.params.id, { note });
    res.json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

export default router;
