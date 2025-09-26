import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
            <div className="card-header"><strong>Create Study</strong></div>
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
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header"><strong>Existing Studies</strong></div>
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
                        <a className="btn btn-sm btn-outline-primary" href={`/fmeca?study=${s.id}`}>
                          <i className="bi bi-pencil-square me-1" />Manage
                        </a>
                        <form action={deleteStudy}>
                          <input type="hidden" name="study_id" value={s.id} />
                          <button className="btn btn-sm btn-outline-danger" type="submit">
                            <i className="bi bi-trash me-1" />Delete
                          </button>
                        </form>
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
        <div className="row g-4 mt-1">
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header"><strong>Add FMECA Item</strong></div>
              <div className="card-body">
                <form action={addItem} className="row g-2">
                  <input type="hidden" name="study_id" value={selectedStudy.id} />
                  <div className="col-12">
                    <label className="form-label">Component</label>
                    <select name="component_id" className="form-select form-select-sm" required>
                      <option value="">Select component...</option>
                      {components.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {(c.asset?.tag_code || c.asset?.name) + ' - ' + c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Failure Mode</label>
                    <select name="failure_mode_id" className="form-select form-select-sm" required>
                      <option value="">Select failure mode...</option>
                      {failureModes.map((fm: any) => (
                        <option key={fm.id} value={fm.id}>{fm.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Function</label>
                    <input name="function" className="form-control form-control-sm" placeholder="Component function" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Effect</label>
                    <input name="effect" className="form-control form-control-sm" placeholder="Effect of failure" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Cause</label>
                    <input name="cause" className="form-control form-control-sm" placeholder="Cause of failure" />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Detection</label>
                    <input name="detection" className="form-control form-control-sm" placeholder="Detection method" />
                  </div>
                  <div className="col-4">
                    <label className="form-label">Severity</label>
                    <input type="number" name="severity" className="form-control form-control-sm" min={1} max={10} defaultValue={5} required />
                  </div>
                  <div className="col-4">
                    <label className="form-label">Occurrence</label>
                    <input type="number" name="occurrence" className="form-control form-control-sm" min={1} max={10} defaultValue={5} required />
                  </div>
                  <div className="col-4">
                    <label className="form-label">Detectability</label>
                    <input type="number" name="detectability" className="form-control form-control-sm" min={1} max={10} defaultValue={5} required />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-sm btn-primary" type="submit">
                      <i className="bi bi-plus-circle me-2" />Add Item
                    </button>
                  </div>
                </form>
                <hr />
                <details>
                  <summary className="text-secondary small">Quick add component to Asset Register</summary>
                  <div className="mt-2">
                    <form action={createComponent} className="row g-2">
                      <input type="hidden" name="study_id" value={selectedStudy.id} />
                      <div className="col-12">
                        <label className="form-label">Asset (Equipment)</label>
                        <select name="asset_id" className="form-select form-select-sm" required>
                          <option value="">Select asset...</option>
                          {assets.map((a: any) => (
                            <option key={a.id} value={a.id}>{(a.tag_code || a.name) + ' - ' + a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-7">
                        <label className="form-label">Component Name</label>
                        <input name="name" className="form-control form-control-sm" required />
                      </div>
                      <div className="col-5">
                        <label className="form-label">Code</label>
                        <input name="component_code" className="form-control form-control-sm" required />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Type</label>
                        <select name="type" className="form-select form-select-sm" defaultValue="other">
                          <option value="mechanical">Mechanical</option>
                          <option value="electrical">Electrical</option>
                          <option value="instrumentation">Instrumentation</option>
                          <option value="rotating">Rotating</option>
                          <option value="static">Static</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <button className="btn btn-sm btn-outline-primary" type="submit">Add Component</button>
                      </div>
                    </form>
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Items</strong>
                <span className="small text-muted">Compact rows. Expand a row to edit and manage corrective actions.</span>
              </div>
              <div className="card-body table-responsive">
                <table className="table table-striped table-sm align-middle">
                  <thead>
                    <tr>
                      <th style={{minWidth: 220}}>Component</th>
                      <th>Failure Mode</th>
                      <th>Function</th>
                      <th className="text-center">S/O/D</th>
                      <th>RPN</th>
                      <th>Criticality</th>
                      <th className="text-end">Ops</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedStudy?.items ?? []).map((it: any) => {
                      const isExpanded = expandedItemId === it.id
                      return (
                        <>
                          <tr key={it.id}>
                            <td>{(it.component.asset?.tag_code || it.component.asset?.name) + ' - ' + it.component.name}</td>
                            <td>{it.failure_mode.title}</td>
                            <td className="text-truncate" style={{maxWidth: 220}} title={it.function}>{it.function}</td>
                            <td className="text-center">{it.severity}/{it.occurrence}/{it.detectability}</td>
                            <td>{it.rpn}</td>
                            <td className={'text-capitalize'}>{it.criticality}</td>
                            <td className="text-end">
                              {!isExpanded ? (
                                <a className="btn btn-sm btn-outline-secondary" href={`/fmeca?study=${selectedStudy.id}&expand=${it.id}`}>
                                  <i className="bi bi-arrows-expand me-1" />Expand
                                </a>
                              ) : (
                                <a className="btn btn-sm btn-secondary" href={`/fmeca?study=${selectedStudy.id}`}>
                                  <i className="bi bi-arrows-collapse me-1" />Collapse
                                </a>
                              )}
                              <form action={deleteItem} className="d-inline ms-2">
                                <input type="hidden" name="item_id" value={it.id} />
                                <button className="btn btn-sm btn-outline-danger" type="submit">
                                  <i className="bi bi-trash me-1" />Delete
                                </button>
                              </form>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7}>
                                <div className="row g-3">
                                  <div className="col-lg-6">
                                    <div className="border rounded p-3">
                                      <div className="fw-semibold mb-2">Edit FMECA Item</div>
                                      <form action={updateItem} className="row g-2">
                                        <input type="hidden" name="item_id" value={it.id} />
                                        <input type="hidden" name="study_id" value={selectedStudy.id} />
                                        <div className="col-12">
                                          <label className="form-label">Function</label>
                                          <input name="function" defaultValue={it.function} className="form-control form-control-sm" placeholder="Function" />
                                        </div>
                                        <div className="col-12">
                                          <label className="form-label">Effect</label>
                                          <input name="effect" defaultValue={it.effect} className="form-control form-control-sm" placeholder="Effect" />
                                        </div>
                                        <div className="col-12">
                                          <label className="form-label">Cause</label>
                                          <input name="cause" defaultValue={it.cause} className="form-control form-control-sm" placeholder="Cause" />
                                        </div>
                                        <div className="col-12">
                                          <label className="form-label">Detection</label>
                                          <input name="detection" defaultValue={it.detection} className="form-control form-control-sm" placeholder="Detection" />
                                        </div>
                                        <div className="col-4">
                                          <label className="form-label">Severity</label>
                                          <input type="number" name="severity" min={1} max={10} defaultValue={it.severity} className="form-control form-control-sm" />
                                        </div>
                                        <div className="col-4">
                                          <label className="form-label">Occurrence</label>
                                          <input type="number" name="occurrence" min={1} max={10} defaultValue={it.occurrence} className="form-control form-control-sm" />
                                        </div>
                                        <div className="col-4">
                                          <label className="form-label">Detectability</label>
                                          <input type="number" name="detectability" min={1} max={10} defaultValue={it.detectability} className="form-control form-control-sm" />
                                        </div>
                                        <div className="col-12">
                                          <button className="btn btn-sm btn-secondary" type="submit">Save</button>
                                        </div>
                                      </form>
                                    </div>
                                  </div>
                                  <div className="col-lg-6">
                                    <div className="border rounded p-3">
                                      <div className="fw-semibold mb-2">Corrective Actions</div>
                                      {/* Add Action */}
                                      <form action={addAction} className="row g-2 mb-3">
                                        <input type="hidden" name="item_id" value={it.id} />
                                        <input type="hidden" name="study_id" value={selectedStudy.id} />
                                        <div className="col-8">
                                          <input className="form-control form-control-sm" name="title" placeholder="Title" required />
                                        </div>
                                        <div className="col-4">
                                          <select name="priority" className="form-select form-select-sm" defaultValue="medium">
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                          </select>
                                        </div>
                                        <div className="col-12">
                                          <textarea className="form-control form-control-sm" name="description" placeholder="Description (optional)" />
                                        </div>
                                        <div className="col-7">
                                          <select name="assignee_user_id" className="form-select form-select-sm" defaultValue={userId}>
                                            {users.map((u: any) => (
                                              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="col-5">
                                          <input type="date" name="due_date" className="form-control form-control-sm" />
                                        </div>
                                        <div className="col-12">
                                          <button className="btn btn-sm btn-primary" type="submit">Create Action</button>
                                        </div>
                                      </form>

                                      {/* Actions List */}
                                      <div className="d-flex flex-column gap-2">
                                        {(actionsByItem[it.id] || []).map((a: any) => (
                                          <div key={a.id} className="border rounded p-2">
                                            <div className="d-flex justify-content-between align-items-start">
                                              <div>
                                                <div className="fw-semibold">
                                                  {a.title}
                                                  <span className={`badge ms-2 bg-${a.status === 'done' ? 'success' : a.status === 'in_progress' ? 'primary' : a.status === 'blocked' ? 'danger' : 'secondary'}`}>{a.status.replace('_', ' ')}</span>
                                                  <span className={`badge ms-1 bg-${a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : a.priority === 'medium' ? 'info' : 'secondary'}`}>{a.priority}</span>
                                                </div>
                                                <div className="small text-muted">Assignee: {a.assignee?.full_name || a.assignee?.email || 'Unassigned'}{a.due_date ? ` • Due: ${new Date(a.due_date).toLocaleDateString()}` : ''}</div>
                                                {a.description && (
                                                  <div className="small mt-1">{a.description}</div>
                                                )}
                                              </div>
                                              <details>
                                                <summary className="btn btn-sm btn-outline-secondary">Edit</summary>
                                                <div className="mt-2">
                                                  <form action={updateAction} className="row g-2">
                                                    <input type="hidden" name="action_id" value={a.id} />
                                                    <input type="hidden" name="study_id" value={selectedStudy.id} />
                                                    <input type="hidden" name="item_id" value={it.id} />
                                                    <div className="col-12">
                                                      <input className="form-control form-control-sm" name="title" defaultValue={a.title} placeholder="Title" />
                                                    </div>
                                                    <div className="col-12">
                                                      <textarea className="form-control form-control-sm" name="description" defaultValue={a.description || ''} placeholder="Description" />
                                                    </div>
                                                    <div className="col-6">
                                                      <select name="status" defaultValue={a.status} className="form-select form-select-sm">
                                                        <option value="open">Open</option>
                                                        <option value="in_progress">In Progress</option>
                                                        <option value="blocked">Blocked</option>
                                                        <option value="done">Done</option>
                                                        <option value="cancelled">Cancelled</option>
                                                      </select>
                                                    </div>
                                                    <div className="col-6">
                                                      <select name="priority" defaultValue={a.priority} className="form-select form-select-sm">
                                                        <option value="low">Low</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="high">High</option>
                                                        <option value="urgent">Urgent</option>
                                                      </select>
                                                    </div>
                                                    <div className="col-7">
                                                      <select name="assignee_user_id" defaultValue={a.assignee_user_id} className="form-select form-select-sm">
                                                        <option value="">Unassigned</option>
                                                        {users.map((u: any) => (
                                                          <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                                        ))}
                                                      </select>
                                                    </div>
                                                    <div className="col-5">
                                                      <input type="date" name="due_date" defaultValue={a.due_date ? new Date(a.due_date).toISOString().split('T')[0] : ''} className="form-control form-control-sm" />
                                                    </div>
                                                    <div className="col-12 d-flex gap-2">
                                                      <button className="btn btn-sm btn-secondary" type="submit">Save</button>
                                                      <form action={deleteAction}>
                                                        <input type="hidden" name="action_id" value={a.id} />
                                                        <input type="hidden" name="study_id" value={selectedStudy.id} />
                                                        <input type="hidden" name="item_id" value={it.id} />
                                                        <button className="btn btn-sm btn-outline-danger" type="submit">
                                                          <i className="bi bi-trash me-1" />Delete
                                                        </button>
                                                      </form>
                                                    </div>
                                                  </form>
                                                </div>
                                              </details>
                                            </div>
                                          </div>
                                        ))}
                                        {(actionsByItem[it.id] || []).length === 0 && (
                                          <div className="text-muted small">No actions yet</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                    {(selectedStudy?.items?.length ?? 0) === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted">No items yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
