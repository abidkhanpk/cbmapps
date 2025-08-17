import express from 'express';
import { DashboardService } from '@/services/dashboard';
import { AuthenticatedRequest } from '@/types';

const router = express.Router();

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await DashboardService.getStats();
    res.render('dashboard/index', {
      title: 'Dashboard',
      stats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      message: 'Error loading dashboard',
      error: { status: 500, stack: '' },
    });
  }
});

export default router;
