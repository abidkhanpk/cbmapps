
// This catch-all page handles routes linked from the Sidebar:
// /assets, /fmeca, /cm/tasks, /cm/readings, /actions, /users, /audit
// It lives under the (dashboard) routing group so /dashboard stays handled
// by its dedicated static route which has higher priority than dynamic.

function SectionContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h4 mb-0">{title}</h1>
        </div>
      </div>
      {children}
    </div>
  );
}

async function AssetsView() {
  const { prisma } = await import('@/lib/db');
  const assets = await prisma.asset.findMany({
    take: 50,
    orderBy: { created_at: 'desc' },
    include: {
      system: {
        select: { name: true, code: true },
      },
    },
  });

  async function createAsset(formData: FormData) {
    'use server'
    const { prisma } = await import('@/lib/db');
    const name = String(formData.get('name') || '')
    const tag = String(formData.get('tag_code') || '')
    const systemName = String(formData.get('system') || '')
    const criticality = String(formData.get('criticality') || 'low') as any
    if (!name || !tag || !systemName) return
    const area = await prisma.area.findFirst({})
    let system = await prisma.system.findFirst({ where: { name: systemName } })
    if (!system && area) {
      system = await prisma.system.create({ data: { name: systemName, code: systemName.slice(0, 4).toUpperCase(), area_id: area.id } })
    }
    if (!system) return
    await prisma.asset.create({ data: { name, tag_code: tag, system_id: system.id, criticality } })
  }

  return (
    <SectionContainer title="Assets">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><strong>Create Asset</strong></div>
            <div className="card-body">
              <form action={createAsset}>
                <div className="mb-2">
                  <label className="form-label">Name</label>
                  <input name="name" className="form-control" required />
                </div>
                <div className="mb-2">
                  <label className="form-label">Tag Code</label>
                  <input name="tag_code" className="form-control" required />
                </div>
                <div className="mb-2">
                  <label className="form-label">System</label>
                  <input name="system" className="form-control" placeholder="e.g. Conveyor System" required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Criticality</label>
                  <select name="criticality" className="form-select" defaultValue="low">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <button className="btn btn-primary" type="submit">Create</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Name</th>
                    <th>System</th>
                    <th>Criticality</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a: any) => (
                    <tr key={a.id}>
                      <td>{a.tag_code}</td>
                      <td>{a.name}</td>
                      <td>{a.system?.name || '-'}</td>
                      <td className={`text-capitalize`}>{a.criticality}</td>
                      <td>{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">No assets found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}

async function FmecaView() {
  const { prisma } = await import('@/lib/db');
  const studies = await prisma.fmecaStudy.findMany({
    take: 50,
    orderBy: { created_at: 'desc' },
    include: {
      owner: { select: { full_name: true, email: true } },
      _count: { select: { items: true, approvals: true } },
    },
  });

  return (
    <SectionContainer title="FMECA Studies">
      <div className="card">
        <div className="card-body table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Items</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {studies.map((s: any) => (
                <tr key={s.id}>
                  <td>{s.title}</td>
                  <td className="text-capitalize">{s.status}</td>
                  <td>{s.owner?.full_name || s.owner?.email}</td>
                  <td>{(s as any)._count?.items ?? '-'}</td>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {studies.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No studies found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionContainer>
  );
}

async function CmTasksView() {
  const { prisma } = await import('@/lib/db');
  const [tasks, components] = await Promise.all([
    prisma.cmTask.findMany({
      take: 50,
      orderBy: { next_due_at: 'asc' },
      include: {
        component: {
          include: {
            asset: { select: { name: true, tag_code: true } },
          },
        },
      },
    }),
    prisma.component.findMany({ include: { asset: true }, take: 200 }),
  ])

  async function createTask(formData: FormData) {
    'use server'
    const { prisma } = await import('@/lib/db');
    const component_id = String(formData.get('component_id') || '')
    const technique = String(formData.get('technique') || 'vibration') as any
    const interval_days = parseInt(String(formData.get('interval_days') || '30'), 10)
    const procedure = String(formData.get('procedure') || '')
    const acceptance_criteria = String(formData.get('acceptance_criteria') || '')
    if (!component_id) return
    await prisma.cmTask.create({ data: { component_id, technique, interval_days, procedure, acceptance_criteria } })
  }

  return (
    <SectionContainer title="CM Tasks">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><strong>Create CM Task</strong></div>
            <div className="card-body">
              <form action={createTask}>
                <div className="mb-2">
                  <label className="form-label">Component</label>
                  <select name="component_id" className="form-select" required>
                    <option value="">Select component...</option>
                    {components.map((c: any) => (
                      <option key={c.id} value={c.id}>{(c.asset?.tag_code || c.asset?.name) + ' - ' + c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Technique</label>
                  <select name="technique" className="form-select" defaultValue="vibration">
                    <option value="vibration">Vibration</option>
                    <option value="thermography">Thermography</option>
                    <option value="ultrasound">Ultrasound</option>
                    <option value="oil">Oil</option>
                    <option value="visual">Visual</option>
                    <option value="motor_current">Motor current</option>
                    <option value="acoustic">Acoustic</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mb-2"><label className="form-label">Interval (days)</label><input type="number" name="interval_days" className="form-control" defaultValue={30} min={1} /></div>
                <div className="mb-2"><label className="form-label">Procedure</label><textarea name="procedure" className="form-control" rows={3} /></div>
                <div className="mb-3"><label className="form-label">Acceptance Criteria</label><textarea name="acceptance_criteria" className="form-control" rows={3} /></div>
                <button className="btn btn-primary" type="submit">Create</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Asset</th>
                    <th>Technique</th>
                    <th>Interval (days)</th>
                    <th>Next Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t: any) => (
                    <tr key={t.id}>
                      <td>{t.component?.name}</td>
                      <td>{t.component?.asset?.tag_code || t.component?.asset?.name}</td>
                      <td className="text-capitalize">{t.technique}</td>
                      <td>{t.interval_days}</td>
                      <td>{t.next_due_at ? new Date(t.next_due_at).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">No CM tasks found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}

async function CmReadingsView() {
  const { prisma } = await import('@/lib/db');
  const readings = await prisma.cmReading.findMany({
    take: 50,
    orderBy: { performed_at: 'desc' },
    include: {
      task: {
        include: {
          component: {
            include: { asset: { select: { name: true, tag_code: true } } },
          },
        },
      },
      performed_by: { select: { full_name: true, email: true } },
    },
  });

  return (
    <SectionContainer title="CM Readings">
      <div className="card">
        <div className="card-body table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Date</th>
                <th>Task</th>
                <th>Asset</th>
                <th>Status</th>
                <th>Performed By</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r: any) => (
                <tr key={r.id}>
                  <td>{new Date(r.performed_at).toLocaleString()}</td>
                  <td>{r.task?.technique}</td>
                  <td>{r.task?.component?.asset?.tag_code || r.task?.component?.asset?.name}</td>
                  <td className="text-capitalize">{r.status}</td>
                  <td>{r.performed_by?.full_name || r.performed_by?.email}</td>
                </tr>
              ))}
              {readings.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No readings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionContainer>
  );
}

async function ActionsView() {
  const { prisma } = await import('@/lib/db');
  const [actions, users] = await Promise.all([
    prisma.action.findMany({
      take: 50,
      orderBy: { created_at: 'desc' },
      include: {
        assignee: { select: { full_name: true, email: true, id: true } },
        created_by: { select: { full_name: true, email: true, id: true } },
      },
    }),
    prisma.user.findMany({ select: { id: true, full_name: true, email: true } }),
  ])

  async function createAction(formData: FormData) {
    'use server'
    const { prisma } = await import('@/lib/db');
    const title = String(formData.get('title') || '')
    const description = String(formData.get('description') || '')
    const assignee_user_id = String(formData.get('assignee_user_id') || '')
    const priority = String(formData.get('priority') || 'medium') as any
    if (!title || !assignee_user_id) return
    await prisma.action.create({ data: { title, description, entity_type: 'component', entity_id: 'misc', assignee_user_id, priority, created_by_user_id: assignee_user_id } })
  }

  return (
    <SectionContainer title="Actions">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><strong>Create Action</strong></div>
            <div className="card-body">
              <form action={createAction}>
                <div className="mb-2"><label className="form-label">Title</label><input name="title" className="form-control" required /></div>
                <div className="mb-2"><label className="form-label">Description</label><textarea name="description" className="form-control" rows={3} /></div>
                <div className="mb-2">
                  <label className="form-label">Assignee</label>
                  <select name="assignee_user_id" className="form-select" required>
                    <option value="">Select user...</option>
                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Priority</label>
                  <select name="priority" className="form-select" defaultValue="medium">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <button className="btn btn-primary" type="submit">Create</button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a: any) => (
                    <tr key={a.id}>
                      <td>{a.title}</td>
                      <td className="text-capitalize">{a.status}</td>
                      <td className="text-capitalize">{a.priority}</td>
                      <td>{a.assignee?.full_name || a.assignee?.email}</td>
                      <td>{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {actions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">No actions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}

async function UsersView() {
  const { prisma } = await import('@/lib/db');
  const users = await prisma.user.findMany({
    take: 50,
    orderBy: { created_at: 'desc' },
    include: {
      user_roles: { include: { role: true } },
    },
  });

  return (
    <SectionContainer title="Users">
      <div className="card">
        <div className="card-body table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Active</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.user_roles.map((ur: any) => ur.role.name).join(', ') || '-'}</td>
                  <td>{u.is_active ? 'Yes' : 'No'}</td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionContainer>
  );
}

async function AuditView() {
  const { prisma } = await import('@/lib/db');
  const logs = await prisma.auditLog.findMany({
    take: 50,
    orderBy: { created_at: 'desc' },
    include: {
      user: { select: { full_name: true, email: true } },
    },
  });

  return (
    <SectionContainer title="Audit Log">
      <div className="card">
        <div className="card-body table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.user?.full_name || l.user?.email || 'System'}</td>
                  <td>{l.action}</td>
                  <td>{l.entity_type}</td>
                  <td>{l.entity_id}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No audit entries found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionContainer>
  );
}

function NotFoundView({ path }: { path: string[] }) {
  return (
    <SectionContainer title="Page not found">
      <div className="alert alert-warning">
        The page <code>/{path.join('/')}</code> does not exist.
      </div>
      <a className="btn btn-primary" href="/dashboard">
        <i className="bi bi-arrow-left me-2"></i>
        Back to Dashboard
      </a>
    </SectionContainer>
  );
}

export default async function Page({ params }: { params: { path: string[] } }) {
  const segments = params.path || [];
  const [section, subsection] = segments;

  if (section === 'assets') return AssetsView();
  if (section === 'fmeca') return FmecaView();
  if (section === 'actions') return ActionsView();
  if (section === 'users') return UsersView();
  if (section === 'audit') return AuditView();
  if (section === 'cm' && subsection === 'tasks') return CmTasksView();
  if (section === 'cm' && subsection === 'readings') return CmReadingsView();

  // If route is unknown (or nothing provided), show informatively
  return NotFoundView({ path: segments });
}
