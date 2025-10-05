import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import DashboardStats from '@/app/(dashboard)/dashboard/components/DashboardStats'
import StudyStatusChart from '@/app/(dashboard)/dashboard/components/StudyStatusChart'
import RecentActions from '@/app/(dashboard)/dashboard/components/RecentActions'
import UpcomingTasks from '@/app/(dashboard)/dashboard/components/UpcomingTasks'
import { redirect } from 'next/navigation'

export const metadata = { title: 'FMECA Overview | CBMAPPS' }

async function getOverviewData() {
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
    prisma.action.count({ where: { status: { in: ['open', 'in_progress'] } } }),
    prisma.cmTask.count({ where: { next_due_at: { lt: new Date() } } }),
    prisma.action.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        assignee: { select: { full_name: true, email: true } },
        created_by: { select: { full_name: true, email: true } },
      },
    }),
    prisma.cmTask.findMany({
      take: 5,
      where: { next_due_at: { gte: new Date(), lte: new Date(Date.now() + 7*24*60*60*1000) } },
      include: {
        component: { include: { asset: { select: { name: true, tag_code: true } } } },
      },
      orderBy: { next_due_at: 'asc' },
    }),
    prisma.fmecaStudy.groupBy({ by: ['status'], _count: true }),
  ])

  return {
    stats: { totalAssets, totalComponents, totalStudies, openActions, overdueTasks },
    recentActions,
    upcomingTasks,
    studyStats,
  }
}

export default async function FmecaOverviewPage() {
  const session = await getServerSession(getAuthOptions())
  if (!session?.user?.id) redirect('/login')

  const data = await getOverviewData()

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">FMECA Overview</h1>
          <p className="text-muted">Summary of FMECA activity across the organization.</p>
        </div>
      </div>

      <DashboardStats stats={data.stats} />

      <div className="row mt-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">FMECA Study Status</h5>
            </div>
            <div className="card-body">
              <StudyStatusChart data={data.studyStats as any} />
            </div>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Recent Actions</h5>
            </div>
            <div className="card-body">
              <RecentActions actions={data.recentActions as any} />
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Upcoming CM Tasks</h5>
            </div>
            <div className="card-body">
              <UpcomingTasks tasks={data.upcomingTasks as any} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
