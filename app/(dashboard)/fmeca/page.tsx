import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import ItemsCard from './components/ItemsCard'
import DeleteStudyForm from './components/DeleteStudyForm'
import Link from 'next/link'

// Utility
function computeRpn(sev: number, occ: number, det: number) {
  return sev * occ * det
}
function computeCriticality(rpn: number): 'low' | 'medium' | 'high' {
  if (rpn >= 200) return 'high'
  if (rpn >= 100) return 'medium'
  return 'low'
}

// Server Actions - FMECA
async function ensureDefaultCompany() {
  const company = await prisma.company.findFirst({})
  if (company) return company
  return prisma.company.create({
    data: { name: 'Default Company', code: 'DEF' },
  })
}

export default async function FmecaPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const session = await getServerSession(getAuthOptions())
  if (!session?.user?.id) redirect('/login')
  const userId = (session.user as any).id as string

  const selectedStudyId = typeof searchParams?.study === 'string' ? searchParams!.study : undefined
  const expandedItemId = typeof searchParams?.expand === 'string' ? searchParams!.expand : undefined

  // Data for list and selects
  const [studies, components, failureModes, assets] = await Promise.all([
    prisma.fmecaStudy.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { items: true } },
        owner: { select: { full_name: true, email: true } },
      },
    }),
    prisma.component.findMany({
      orderBy: { name: 'asc' },
      include: {
        asset: { select: { name: true, tag_code: true } },
      },
      take: 200,
    }),
    prisma.failureMode.findMany({ orderBy: { title: 'asc' }, take: 200 }),
    prisma.asset.findMany({
      select: { id: true, name: true, tag_code: true },
      orderBy: [{ tag_code: 'asc' }, { name: 'asc' }],
      take: 500,
    }),
  ])

  const selectedStudy = selectedStudyId
    ? await prisma.fmecaStudy.findUnique({
        where: { id: selectedStudyId },
        include: {
          items: {
            orderBy: { id: 'asc' },
            include: {
              component: { include: { asset: true } },
              failure_mode: true,
            },
          },
          owner: { select: { full_name: true, email: true } },
        },
      })
    : null

  // Users for assignee dropdowns (minimal fields)
  const users = selectedStudy
    ? await prisma.user.findMany({
        select: { id: true, full_name: true, email: true },
        orderBy: { full_name: 'asc' },
        take: 200,
      })
    : []

  // Fetch Actions linked to FMECA items
  const itemIds = (selectedStudy?.items ?? []).map((i: { id: string }) => i.id)
  const actions = itemIds.length
    ? await prisma.action.findMany({
        where: { entity_type: 'fmeca_item', entity_id: { in: itemIds } },
        include: {
          assignee: { select: { full_name: true, email: true } },
          comments: true,
        },
        orderBy: { created_at: 'desc' },
      })
    : []
  const actionsByItem = actions.reduce((acc: Record<string, any[]>, a: any) => {
    acc[a.entity_id] = acc[a.entity_id] || []
    acc[a.entity_id].push(a)
    return acc
  }, {} as Record<string, any[]>)

  // Server Actions in-scope of the page
  async function createStudy(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')

    const title = String(formData.get('title') || '').trim()
    const scope = String(formData.get('scope') || '').trim()
    if (!title) return

    const company = await ensureDefaultCompany()

    await prisma.fmecaStudy.create({
      data: {
        title,
        scope: scope || null,
        company_id: company.id,
        owner_user_id: (session.user as any).id,
        status: 'draft',
      },
    })
    revalidatePath('/fmeca')
  }

  async function updateStudyStatus(formData: FormData) {
    'use server'
    const id = String(formData.get('study_id') || '')
    const status = String(formData.get('status') || 'draft') as any
    if (!id) return
    await prisma.fmecaStudy.update({ where: { id }, data: { status } })
    revalidatePath(`/fmeca?study=${id}`)
  }

  async function deleteStudy(formData: FormData) {
    'use server'
    const id = String(formData.get('study_id') || '')
    if (!id) return
    await prisma.fmecaItem.deleteMany({ where: { study_id: id } })
    await prisma.fmecaStudy.delete({ where: { id } })
    revalidatePath('/fmeca')
  }

  async function createComponent(formData: FormData) {
    'use server'
    const study_id = String(formData.get('study_id') || '')
    const asset_id = String(formData.get('asset_id') || '')
    const name = String(formData.get('name') || '').trim()
    const component_code = String(formData.get('component_code') || '').trim()
    const type = String(formData.get('type') || 'other') as any
    if (!asset_id || !name || !component_code) return
    await prisma.component.create({
      data: {
        asset_id,
        name,
        component_code,
        type,
      },
    })
    revalidatePath(`/fmeca?study=${study_id}`)
  }

  async function addItem(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')

    const study_id = String(formData.get('study_id') || '')
    const component_id = String(formData.get('component_id') || '')
    const failure_mode_id = String(formData.get('failure_mode_id') || '')
    const func = String(formData.get('function') || '')
    const effect = String(formData.get('effect') || '')
    const cause = String(formData.get('cause') || '')
    const detection = String(formData.get('detection') || '')
    const severity = parseInt(String(formData.get('severity') || '1'), 10)
    const occurrence = parseInt(String(formData.get('occurrence') || '1'), 10)
    const detectability = parseInt(String(formData.get('detectability') || '1'), 10)

    if (!study_id || !component_id || !failure_mode_id || !func) return

    const rpn = computeRpn(severity, occurrence, detectability)
    const criticality = computeCriticality(rpn)

    await prisma.fmecaItem.create({
      data: {
        study_id,
        component_id,
        failure_mode_id,
        function: func,
        effect,
        cause,
        detection,
        severity,
        occurrence,
        detectability,
        rpn,
        criticality,
      },
    })
    revalidatePath(`/fmeca?study=${study_id}`)
  }

  async function updateItem(formData: FormData) {
    'use server'
    const id = String(formData.get('item_id') || '')
    if (!id) return

    const func = String(formData.get('function') || '')
    const effect = String(formData.get('effect') || '')
    const cause = String(formData.get('cause') || '')
    const detection = String(formData.get('detection') || '')
    const severity = parseInt(String(formData.get('severity') || '1'), 10)
    const occurrence = parseInt(String(formData.get('occurrence') || '1'), 10)
    const detectability = parseInt(String(formData.get('detectability') || '1'), 10)

    const rpn = computeRpn(severity, occurrence, detectability)
    const criticality = computeCriticality(rpn)

    await prisma.fmecaItem.update({
      where: { id },
      data: {
        function: func,
        effect,
        cause,
        detection,
        severity,
        occurrence,
        detectability,
        rpn,
        criticality,
      },
    })
    const study_id = String(formData.get('study_id') || '')
    revalidatePath(`/fmeca?study=${study_id || ''}&expand=${id}`)
  }

  async function deleteItem(formData: FormData) {
    'use server'
    const id = String(formData.get('item_id') || '')
    if (!id) return
    const item = await prisma.fmecaItem.delete({ where: { id } })
    revalidatePath(`/fmeca?study=${item.study_id}`)
  }

  // Server Actions - Corrective Actions
  async function addAction(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')

    const item_id = String(formData.get('item_id') || '')
    const study_id = String(formData.get('study_id') || '')
    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const assignee_user_id = String(formData.get('assignee_user_id') || (session.user as any).id)
    const priority = String(formData.get('priority') || 'medium') as any
    const due_date_raw = String(formData.get('due_date') || '')

    if (!item_id || !title) return

    await prisma.action.create({
      data: {
        title,
        description,
        entity_type: 'fmeca_item',
        entity_id: item_id,
        assignee_user_id,
        due_date: due_date_raw ? new Date(due_date_raw) : null,
        priority,
        status: 'open',
        created_by_user_id: (session.user as any).id,
      },
    })

    revalidatePath(`/fmeca?study=${study_id}&expand=${item_id}`)
  }

  async function updateAction(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')

    const action_id = String(formData.get('action_id') || '')
    const study_id = String(formData.get('study_id') || '')
    const item_id = String(formData.get('item_id') || '')

    if (!action_id) return

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const assignee_user_id = String(formData.get('assignee_user_id') || '') || undefined
    const priority = String(formData.get('priority') || '') as any
    const status = String(formData.get('status') || '') as any
    const due_date_raw = String(formData.get('due_date') || '')

    await prisma.action.update({
      where: { id: action_id },
      data: {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(assignee_user_id ? { assignee_user_id } : {}),
        ...(priority ? { priority } : {}),
        ...(status ? { status } : {}),
        ...(due_date_raw ? { due_date: new Date(due_date_raw) } : { due_date: null }),
      },
    })

    revalidatePath(`/fmeca?study=${study_id}&expand=${item_id}`)
  }

  async function deleteAction(formData: FormData) {
    'use server'
    const action_id = String(formData.get('action_id') || '')
    const study_id = String(formData.get('study_id') || '')
    const item_id = String(formData.get('item_id') || '')
    if (!action_id) return
    await prisma.action.delete({ where: { id: action_id } })
    revalidatePath(`/fmeca?study=${study_id}&expand=${item_id}`)
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">FMECA Studies</h1>
          <p className="text-muted">Create new FMECA studies and manage analysis items. Link corrective actions to each item using the expandable row.</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>Existing Studies</strong>
              <button
                className="btn btn-sm btn-primary"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#create-study"
                aria-expanded="false"
                aria-controls="create-study"
                title="Create FMECA Study"
              >
                <i className="bi bi-plus-circle" />
                <span className="d-none d-md-inline ms-1">Create Study</span>
              </button>
            </div>
            <div id="create-study" className="collapse">
              <div className="card-body">
                <form action={createStudy} className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Title</label>
                    <input name="title" className="form-control" placeholder="e.g. Conveyor System FMECA" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Scope</label>
                    <textarea name="scope" className="form-control" rows={3} placeholder="Optional study scope" />
                  </div>
                  <div className="col-12 d-flex gap-2">
                    <button className="btn btn-primary" type="submit">
                      <i className="bi bi-plus-circle me-2" />Create Study
                    </button>
                  </div>
                </form>
              </div>
            </div>
            <div className="card-body table-responsive">
              <table className="table table-striped table-sm align-middle">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Items</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map((s: any) => (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      <td className="text-capitalize">{s.status}</td>
                      <td>{s.owner?.full_name || s.owner?.email}</td>
                      <td>{(s as any)._count?.items ?? 0}</td>
                      <td className="d-flex gap-2">
                        <Link className="btn btn-sm btn-outline-primary" href={{ pathname: '/fmeca', query: { study: s.id } }} prefetch>
                          <i className="bi bi-pencil-square me-1" />Manage
                        </Link>
                        <DeleteStudyForm deleteStudy={deleteStudy} studyId={s.id} />
                      </td>
                    </tr>
                  ))}
                  {studies.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted">No studies created yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

              </div>

      {selectedStudy && (
        // Client component for interactive items table
                <ItemsCard
          study={selectedStudy}
          components={components}
          failureModes={failureModes}
          assets={assets}
          users={users}
          actionsByItem={actionsByItem}
          userId={userId}
          initialExpandedId={expandedItemId}
          addItem={addItem}
          updateItem={updateItem}
          deleteItem={deleteItem}
          createComponent={createComponent}
          addAction={addAction}
          updateAction={updateAction}
          deleteAction={deleteAction}
        />
      )}
    </div>
  )
}
