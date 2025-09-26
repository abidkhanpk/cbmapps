import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import prisma from '@/lib/db'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function ActionsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await getServerSession(getAuthOptions())
  if (!session?.user?.id) redirect('/login')

  // Filters
  const fStatus = typeof searchParams?.status === 'string' ? searchParams!.status : ''
  const fPriority = typeof searchParams?.priority === 'string' ? searchParams!.priority : ''
  const fAssignee = typeof searchParams?.assignee === 'string' ? searchParams!.assignee : ''
  const fEntity = typeof searchParams?.entity === 'string' ? searchParams!.entity : ''

  // Data
  const [users, actions] = await Promise.all([
    prisma.user.findMany({ select: { id: true, full_name: true, email: true }, orderBy: { full_name: 'asc' }, take: 500 }),
    prisma.action.findMany({
      where: {
        status: fStatus ? (fStatus as any) : undefined,
        priority: fPriority ? (fPriority as any) : undefined,
        assignee_user_id: fAssignee || undefined,
        entity_type: fEntity ? (fEntity as any) : undefined,
      },
      include: { assignee: { select: { full_name: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 500,
    }),
  ])

  // Server actions
  async function createAction(formData: FormData) {
    'use server'
    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const entity_type = String(formData.get('entity_type') || 'fmeca_item') as any
    const entity_id = String(formData.get('entity_id') || '').trim()
    const assignee_user_id = String(formData.get('assignee_user_id') || '') || (session!.user as any).id
    const priority = String(formData.get('priority') || 'medium') as any
    const due_date_raw = String(formData.get('due_date') || '')

    if (!title || !entity_id) return

    await prisma.action.create({
      data: {
        title,
        description,
        entity_type,
        entity_id,
        assignee_user_id,
        priority,
        due_date: due_date_raw ? new Date(due_date_raw) : null,
        status: 'open',
        created_by_user_id: (session!.user as any).id,
      },
    })

    revalidatePath('/actions')
  }

  async function updateAction(formData: FormData) {
    'use server'
    const id = String(formData.get('action_id') || '')
    if (!id) return

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const assignee_user_id = String(formData.get('assignee_user_id') || '')
    const priority = String(formData.get('priority') || '') as any
    const status = String(formData.get('status') || '') as any
    const due_date_raw = String(formData.get('due_date') || '')

    await prisma.action.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(assignee_user_id ? { assignee_user_id } : {}),
        ...(priority ? { priority } : {}),
        ...(status ? { status } : {}),
        ...(due_date_raw ? { due_date: new Date(due_date_raw) } : { due_date: null }),
      },
    })

    revalidatePath('/actions')
  }

  async function deleteAction(formData: FormData) {
    'use server'
    const id = String(formData.get('action_id') || '')
    if (!id) return
    await prisma.action.delete({ where: { id } })
    revalidatePath('/actions')
  }

  return (
    <div className="container-fluid">
      <div className="row mb-3">
        <div className="col">
          <h1 className="h3 mb-0">Actions</h1>
          <div className="text-muted">Global corrective actions with compact view and inline editing.</div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header"><strong>Create Action</strong></div>
        <div className="card-body">
          <form action={createAction} className="row g-2">
            <div className="col-lg-4">
              <input name="title" className="form-control form-control-sm" placeholder="Title" required />
            </div>
            <div className="col-lg-3">
              <select name="entity_type" className="form-select form-select-sm" defaultValue="fmeca_item">
                <option value="fmeca_item">FMECA Item</option>
                <option value="cm_reading">CM Reading</option>
                <option value="component">Component</option>
              </select>
            </div>
            <div className="col-lg-3">
              <input name="entity_id" className="form-control form-control-sm" placeholder="Entity ID" required />
            </div>
            <div className="col-lg-2">
              <select name="priority" className="form-select form-select-sm" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="col-12">
              <textarea name="description" className="form-control form-control-sm" placeholder="Description (optional)" />
            </div>
            <div className="col-lg-6">
              <select name="assignee_user_id" className="form-select form-select-sm" defaultValue={(session.user as any).id}>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div className="col-lg-3">
              <input type="date" name="due_date" className="form-control form-control-sm" />
            </div>
            <div className="col-lg-3">
              <button className="btn btn-sm btn-primary w-100" type="submit">Create</button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <strong>Actions</strong>
            <form className="d-flex gap-2" method="get">
              <select name="status" defaultValue={fStatus} className="form-select form-select-sm">
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select name="priority" defaultValue={fPriority} className="form-select form-select-sm">
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <select name="entity" defaultValue={fEntity} className="form-select form-select-sm">
                <option value="">All Entities</option>
                <option value="fmeca_item">FMECA Item</option>
                <option value="cm_reading">CM Reading</option>
                <option value="component">Component</option>
              </select>
              <select name="assignee" defaultValue={fAssignee} className="form-select form-select-sm">
                <option value="">All Assignees</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
              <button className="btn btn-sm btn-outline-secondary" type="submit">Filter</button>
            </form>
          </div>
        </div>
        <div className="card-body table-responsive">
          <table className="table table-striped table-sm align-middle">
            <thead>
              <tr>
                <th>Title</th>
                <th>Entity</th>
                <th>Assignee</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due</th>
                <th className="text-end">Ops</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a: any) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td className="text-nowrap">{a.entity_type} • {a.entity_id.slice(0,6)}...</td>
                  <td>{a.assignee?.full_name || a.assignee?.email || 'Unassigned'}</td>
                  <td className="text-capitalize">{a.priority}</td>
                  <td className="text-capitalize">{a.status.replace('_',' ')}</td>
                  <td>{a.due_date ? new Date(a.due_date).toLocaleDateString() : ''}</td>
                  <td className="text-end">
                    <details>
                      <summary className="btn btn-sm btn-outline-secondary">Edit</summary>
                      <div className="mt-2">
                        <form action={updateAction} className="row g-2">
                          <input type="hidden" name="action_id" value={a.id} />
                          <div className="col-lg-6">
                            <input className="form-control form-control-sm" name="title" defaultValue={a.title} placeholder="Title" />
                          </div>
                          <div className="col-lg-6">
                            <select name="status" defaultValue={a.status} className="form-select form-select-sm">
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="done">Done</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div className="col-12">
                            <textarea className="form-control form-control-sm" name="description" defaultValue={a.description || ''} placeholder="Description" />
                          </div>
                          <div className="col-lg-6">
                            <select name="assignee_user_id" defaultValue={a.assignee_user_id} className="form-select form-select-sm">
                              <option value="">Unassigned</option>
                              {users.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-lg-3">
                            <select name="priority" defaultValue={a.priority} className="form-select form-select-sm">
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                          <div className="col-lg-3">
                            <input type="date" name="due_date" defaultValue={a.due_date ? new Date(a.due_date).toISOString().split('T')[0] : ''} className="form-control form-control-sm" />
                          </div>
                          <div className="col-12 d-flex gap-2">
                            <button className="btn btn-sm btn-secondary" type="submit">Save</button>
                            <form action={deleteAction}>
                              <input type="hidden" name="action_id" value={a.id} />
                              <button className="btn btn-sm btn-outline-danger" type="submit">Delete</button>
                            </form>
                          </div>
                        </form>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              {actions.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted">No actions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
