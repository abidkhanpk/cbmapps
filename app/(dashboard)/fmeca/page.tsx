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

// Server Actions
async function ensureDefaultCompany() {
  const company = await prisma.company.findFirst({})
  if (company) return company
  return prisma.company.create({
    data: { name: 'Default Company', code: 'DEF' },
  })
}

export default async function FmecaPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const selectedStudyId = typeof searchParams?.study === 'string' ? searchParams!.study : undefined

  // Data for list and selects
  const [studies, components, failureModes] = await Promise.all([
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

  async function createStudy(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
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
        owner_user_id: session.user.id,
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

  async function addItem(formData: FormData) {
    'use server'
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

    const severity = parseInt(String(formData.get('severity') || '1'), 10)
    const occurrence = parseInt(String(formData.get('occurrence') || '1'), 10)
    const detectability = parseInt(String(formData.get('detectability') || '1'), 10)

    const rpn = computeRpn(severity, occurrence, detectability)
    const criticality = computeCriticality(rpn)

    await prisma.fmecaItem.update({
      where: { id },
      data: {
        function: String(formData.get('function') || ''),
        effect: String(formData.get('effect') || ''),
        cause: String(formData.get('cause') || ''),
        detection: String(formData.get('detection') || ''),
        severity,
        occurrence,
        detectability,
        rpn,
        criticality,
      },
    })
    const study_id = String(formData.get('study_id') || '')
    revalidatePath(`/fmeca?study=${study_id || ''}`)
  }

  async function deleteItem(formData: FormData) {
    'use server'
    const id = String(formData.get('item_id') || '')
    if (!id) return
    const item = await prisma.fmecaItem.delete({ where: { id } })
    revalidatePath(`/fmeca?study=${item.study_id}`)
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">FMECA Studies</h1>
          <p className="text-muted">Create new FMECA studies and manage analysis items.</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header"><strong>Create Study</strong></div>
            <div className="card-body">
              <form action={createStudy}>
                <div className="mb-3">
                  <label className="form-label">Title</label>
                  <input name="title" className="form-control" placeholder="e.g. Conveyor System FMECA" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Scope</label>
                  <textarea name="scope" className="form-control" rows={3} placeholder="Optional study scope" />
                </div>
                <button className="btn btn-primary" type="submit">
                  <i className="bi bi-plus-circle me-2" />Create Study
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header"><strong>Existing Studies</strong></div>
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle">
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
                  {studies.map((s) => (
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
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                  <strong>Manage Study:</strong> {selectedStudy.title}
                  <div className="small text-muted">Owner: {selectedStudy.owner?.full_name || selectedStudy.owner?.email}</div>
                </div>
                <div>
                  <form action={updateStudyStatus} className="d-flex align-items-center gap-2">
                    <input type="hidden" name="study_id" value={selectedStudy.id} />
                    <select className="form-select form-select-sm" name="status" defaultValue={selectedStudy.status}>
                      <option value="draft">Draft</option>
                      <option value="in_review">In Review</option>
                      <option value="approved">Approved</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button className="btn btn-sm btn-secondary" type="submit">Update Status</button>
                    <a className="btn btn-sm btn-outline-secondary" href="/fmeca">Close</a>
                  </form>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-4">
                  <div className="col-lg-4">
                    <div className="card">
                      <div className="card-header"><strong>Add FMECA Item</strong></div>
                      <div className="card-body">
                        <form action={addItem}>
                          <input type="hidden" name="study_id" value={selectedStudy.id} />
                          <div className="mb-2">
                            <label className="form-label">Component</label>
                            <select name="component_id" className="form-select" required>
                              <option value="">Select component...</option>
                              {components.map(c => (
                                <option key={c.id} value={c.id}>
                                  {(c.asset?.tag_code || c.asset?.name) + ' - ' + c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Failure Mode</label>
                            <select name="failure_mode_id" className="form-select" required>
                              <option value="">Select failure mode...</option>
                              {failureModes.map(fm => (
                                <option key={fm.id} value={fm.id}>{fm.title}</option>
                              ))}
                            </select>
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Function</label>
                            <input name="function" className="form-control" placeholder="Component function" required />
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Effect</label>
                            <input name="effect" className="form-control" placeholder="Effect of failure" />
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Cause</label>
                            <input name="cause" className="form-control" placeholder="Cause of failure" />
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Detection</label>
                            <input name="detection" className="form-control" placeholder="Detection method" />
                          </div>
                          <div className="row g-2 mb-3">
                            <div className="col">
                              <label className="form-label">Severity</label>
                              <input type="number" name="severity" className="form-control" min={1} max={10} defaultValue={5} required />
                            </div>
                            <div className="col">
                              <label className="form-label">Occurrence</label>
                              <input type="number" name="occurrence" className="form-control" min={1} max={10} defaultValue={5} required />
                            </div>
                            <div className="col">
                              <label className="form-label">Detectability</label>
                              <input type="number" name="detectability" className="form-control" min={1} max={10} defaultValue={5} required />
                            </div>
                          </div>
                          <button className="btn btn-primary" type="submit">
                            <i className="bi bi-plus-circle me-2" />Add Item
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-8">
                    <div className="card">
                      <div className="card-header"><strong>Items</strong></div>
                      <div className="card-body table-responsive">
                        <table className="table table-striped align-middle">
                          <thead>
                            <tr>
                              <th>Component</th>
                              <th>Failure Mode</th>
                              <th>Ratings (S/O/D)</th>
                              <th>RPN</th>
                              <th>Criticality</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedStudy.items.map((it) => (
                              <tr key={it.id}>
                                <td>{(it.component.asset?.tag_code || it.component.asset?.name) + ' - ' + it.component.name}</td>
                                <td>{it.failure_mode.title}</td>
                                <td>
                                  <form action={updateItem} className="d-flex gap-2 align-items-center">
                                    <input type="hidden" name="item_id" value={it.id} />
                                    <input type="hidden" name="study_id" value={selectedStudy.id} />
                                    <input type="number" name="severity" min={1} max={10} defaultValue={it.severity} className="form-control form-control-sm" style={{width: 70}} />
                                    <input type="number" name="occurrence" min={1} max={10} defaultValue={it.occurrence} className="form-control form-control-sm" style={{width: 70}} />
                                    <input type="number" name="detectability" min={1} max={10} defaultValue={it.detectability} className="form-control form-control-sm" style={{width: 70}} />
                                    <button className="btn btn-sm btn-secondary" type="submit">Save</button>
                                  </form>
                                </td>
                                <td>{it.rpn}</td>
                                <td className={'text-capitalize'}>{it.criticality}</td>
                                <td className="d-flex gap-2">
                                  <details>
                                    <summary className="btn btn-sm btn-outline-secondary">Details</summary>
                                    <div className="p-2">
                                      <form action={updateItem}>
                                        <input type="hidden" name="item_id" value={it.id} />
                                        <input type="hidden" name="study_id" value={selectedStudy.id} />
                                        <div className="mb-2">
                                          <label className="form-label">Function</label>
                                          <input name="function" defaultValue={it.function} className="form-control form-control-sm" />
                                        </div>
                                        <div className="mb-2">
                                          <label className="form-label">Effect</label>
                                          <input name="effect" defaultValue={it.effect} className="form-control form-control-sm" />
                                        </div>
                                        <div className="mb-2">
                                          <label className="form-label">Cause</label>
                                          <input name="cause" defaultValue={it.cause} className="form-control form-control-sm" />
                                        </div>
                                        <div className="mb-2">
                                          <label className="form-label">Detection</label>
                                          <input name="detection" defaultValue={it.detection} className="form-control form-control-sm" />
                                        </div>
                                        <button className="btn btn-sm btn-secondary" type="submit">Save Details</button>
                                      </form>
                                    </div>
                                  </details>
                                  <form action={deleteItem}>
                                    <input type="hidden" name="item_id" value={it.id} />
                                    <button className="btn btn-sm btn-outline-danger" type="submit">
                                      <i className="bi bi-trash me-1" />Delete
                                    </button>
                                  </form>
                                </td>
                              </tr>
                            ))}
                            {selectedStudy.items.length === 0 && (
                              <tr><td colSpan={6} className="text-center text-muted">No items yet</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
