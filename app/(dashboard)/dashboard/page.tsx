import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import DashboardStats from './components/DashboardStats';
import RecentActions from './components/RecentActions';
import UpcomingTasks from './components/UpcomingTasks';
import StudyStatusChart from './components/StudyStatusChart';

async function getDashboardData() {
  const [
    totalAssets,
    totalComponents,
    totalStudies,
    openActions,
    overdueTasks,
    recentActions,
    upcomingTasks,
    studyStats
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.component.count(),
    prisma.fmecaStudy.count(),
    prisma.action.count({
      where: {
        status: {
          in: ['open', 'in_progress']
        }
      }
    }),
    prisma.cmTask.count({
      where: {
        next_due_at: {
          lt: new Date()
        }
      }
    }),
    prisma.action.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        assignee: {
          select: { full_name: true, email: true }
        },
        created_by: {
          select: { full_name: true, email: true }
        }
      }
    }),
    prisma.cmTask.findMany({
      take: 5,
      where: {
        next_due_at: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      },
      include: {
        component: {
          include: {
            asset: {
              select: { name: true, tag_code: true }
            }
          }
        }
      },
      orderBy: { next_due_at: 'asc' }
    }),
    prisma.fmecaStudy.groupBy({
      by: ['status'],
      _count: true
    })
  ]);

  return {
    stats: {
      totalAssets,
      totalComponents,
      totalStudies,
      openActions,
      overdueTasks
    },
    recentActions,
    upcomingTasks,
    studyStats
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const data = await getDashboardData();

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">Dashboard</h1>
          <p className="text-muted">Welcome back, {session?.user?.name}</p>
        </div>
      </div>

      <DashboardStats stats={data.stats} />

      <div className="row mt-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Recent Actions</h5>
            </div>
            <div className="card-body">
              <RecentActions actions={data.recentActions} />
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Upcoming CM Tasks</h5>
            </div>
            <div className="card-body">
              <UpcomingTasks tasks={data.upcomingTasks} />
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">FMECA Study Status</h5>
            </div>
            <div className="card-body">
              <StudyStatusChart data={data.studyStats} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}