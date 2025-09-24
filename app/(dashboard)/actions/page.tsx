import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions'
import { AuditService } from '@/lib/services/audit'
import { actionSchema as baseActionSchema, updateActionStatusSchema, actionCommentSchema, paginationSchema } from '@/lib/validation/schemas'

// Extend action schema to allow optional due_date string and map to Date
const createActionSchema = baseActionSchema.extend({
  due_date: z.string().datetime().optional(),
})

function ensurePermission(userRoles: string[], permission: keyof typeof PERMISSIONS) {
  if (!hasPermission(userRoles, PERMISSIONS[permission])) {
    throw new Error('Forbidden')
  }
}

function parseSearchParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(['open', 'in_progress', 'blocked', 'done', 'cancelled']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignee: z.string().optional(),
    q: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
    sort: z.enum(['created_at', 'updated_at', 'due_date', 'priority', 'status']).default('updated_at'),
  })
  return schema.parse({
    page: searchParams.page,
    limit: searchParams.limit,
    status: searchParams.status,
    priority: searchParams.priority,
    assignee: searchParams.assignee,
    q: searchParams.q,
    order: searchParams.order,
    sort: searchParams.sort,
  })
}

async function getActions(searchParams: { [key: string]: string | string[] | undefined }) {
  const { page, limit, status, priority, assignee, q, sort, order } = parseSearchParams(searchParams)

  const where: any = {}
  if (status) where.status = status
  if (priority) where.priority = priority
  if (assignee) where.assignee_user_id = assignee
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.action.findMany({
      where,
      include: {
        assignee: { select: { id: true, full_name: true, email: true } },
        created_by: { select: { id: true, full_name: true, email: true } },
        comments: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
      orderBy: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.action.count({ where }),
  ])

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      sort,
      order,
    },
  }
}

async function getAssignableUsers() {
  return prisma.user.findMany({
    where: { is_active: true },
    select: { id: true, full_name: true, email: true },
    orderBy: { full_name: 'asc' },
  })
}

export default async function ActionsPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const session = await getServerSession(getAuthOptions())
  if (!session?.user?.id) redirect('/login')
  const roles = (session.user as any).roles || []
  if (!hasPermission(roles, PERMISSIONS.VIEW_ACTION)) redirect('/dashboard')

  const [{ items, pagination }, users] = await Promise.all([
    getActions(searchParams || {}),
    getAssignableUsers(),
  ])

  // Server Actions
  async function createAction(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')
    const roles = (session.user as any).roles || []
    ensurePermission(roles, 'CREATE_ACTION')

    const raw = {
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      entity_type: String(formData.get('entity_type') || ''),
      entity_id: String(formData.get('entity_id') || ''),
      assignee_user_id: String(formData.get('assignee_user_id') || ''),
      due_date: formData.get('due_date') ? String(formData.get('due_date')) : undefined,
      priority: String(formData.get('priority') || 'medium'),
    }

    const parsed = createActionSchema.safeParse(raw)
    if (!parsed.success) {
      return
    }

    const data = parsed.data

    const created = await prisma.action.create({
      data: {
        title: data.title,
        description: data.description,
        entity_type: data.entity_type as any,
        entity_id: data.entity_id,
        assignee_user_id: data.assignee_user_id,
        due_date: data.due_date ? new Date(data.due_date) : null,
        priority: data.priority as any,
        created_by_user_id: session.user.id,
      },
    })

    await AuditService.logCreate(session.user.id, 'action', created.id, {
      title: created.title,
      priority: created.priority,
      assignee: created.assignee_user_id,
    })

    revalidatePath('/actions')
  }

  async function changeStatus(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')
    const roles = (session.user as any).roles || []
    ensurePermission(roles, 'UPDATE_ACTION_STATUS')

    const raw = {
      action_id: String(formData.get('action_id') || ''),
      status: String(formData.get('status') || ''),
    }

    const parsed = updateActionStatusSchema.safeParse({ status: raw.status })
    if (!parsed.success || !raw.action_id) {
      return
    }

    const existing = await prisma.action.findUnique({ where: { id: raw.action_id } })
    if (!existing) return

    await prisma.action.update({
      where: { id: raw.action_id },
      data: { status: parsed.data.status },
    })

    await AuditService.logStatusChange(
      session.user.id,
      'action',
      raw.action_id,
      existing.status,
      parsed.data.status,
    )

    revalidatePath('/actions')
  }

  async function reassign(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')
    const roles = (session.user as any).roles || []
    ensurePermission(roles, 'ASSIGN_ACTION')

    const action_id = String(formData.get('action_id') || '')
    const assignee_user_id = String(formData.get('assignee_user_id') || '')
    if (!action_id || !assignee_user_id) return

    await prisma.action.update({
      where: { id: action_id },
      data: { assignee_user_id },
    })

    await AuditService.logUpdate(session.user.id, 'action', action_id, {
      assignee_user_id,
    })

    revalidatePath('/actions')
  }

  async function addComment(formData: FormData) {
    'use server'
    const session = await getServerSession(getAuthOptions())
    if (!session?.user?.id) redirect('/login')
    // Allow anyone with VIEW_ACTION to comment
    const roles = (session.user as any).roles || []
    if (!hasPermission(roles, PERMISSIONS.VIEW_ACTION)) {
      throw new Error('Forbidden')
    }

    const raw = {
      action_id: String(formData.get('action_id') || ''),
      note: String(formData.get('note') || ''),
    }

    const parsed = actionCommentSchema.safeParse(raw)
    if (!parsed.success) return

    const comment = await prisma.actionComment.create({
      data: {
        action_id: parsed.data.action_id,
        author_user_id: session.user.id,
        note: parsed.data.note,
      },
    })

    await AuditService.logUpdate(session.user.id, 'action', parsed.data.action_id, {
      comment_id: comment.id,
    })

    revalidatePath('/actions')
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col">
          <h1 className="h3 mb-0">Actions</h1>
          <p className="text-muted">Track and assign corrective and preventive actions.</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header"><strong>Create Action</strong></div>
            <div className="card-body">
              <form action={createAction}>
                <div className="mb-2">
                  <label className="form-label">Title</label>
                  <input name="title" className="form-control" required />
                </div>
                <div className="mb-2">
                  <label className="form-label">Description</label>
                  <textarea name="description" className="form-control" rows={3} required />
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <label className="form-label">Entity Type</label>
                    <select name="entity_type" className="form-select" required>
                      <option value="">Select...</option>
                      <option value="fmeca_item">FMECA Item</option>
                      <option value="cm_reading">CM Reading</option>
                      <option value="component">Component</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Entity ID</label>
                    <input name="entity_id" className="form-control" placeholder="Target entity id" required />
                  </div>
                </div>
                <div className="row g-2 mb-2">
                  <div className="col-8">
                    <label className="form-label">Assignee</label>
                    <select name="assignee_user_id" className="form-select" required>
                      <option value="">Select user...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-4">
                    <label className="form-label">Priority</label>
                    <select name="priority" className="form-select" defaultValue="medium">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Due Date</label>
                  <input type="date" name="due_date" className="form-control" />
                </div>
                <button className="btn btn-primary" type="submit">
                  <i className="bi bi-plus-circle me-2" />Create
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <strong>Actions</strong>
              <form className="d-flex gap-2" method="get">
                <input type="text" name="q" className="form-control form-control-sm" placeholder="Search" defaultValue={String((searchParams?.q || '') as any)} />
                <select name="status" className="form-select form-select-sm" defaultValue={String((searchParams?.status || '') as any)}>
                  <option value="">Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select name="priority" className="form-select form-select-sm" defaultValue={String((searchParams?.priority || '') as any)}>
                  <option value="">Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select name="assignee" className="form-select form-select-sm" defaultValue={String((searchParams?.assignee || '') as any)}>
                  <option value="">Assignee</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
                <select name="sort" className="form-select form-select-sm" defaultValue={String((searchParams?.sort || 'updated_at') as any)}>
                  <option value="updated_at">Updated</option>
                  <option value="created_at">Created</option>
                  <option value="due_date">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="status">Status</option>
                </select>
                <select name="order" className="form-select form-select-sm" defaultValue={String((searchParams?.order || 'desc') as any)}>
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
                <button className="btn btn-sm btn-outline-secondary" type="submit">Filter</button>
              </form>
            </div>
            <div className="card-body table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Entity</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <div className="fw-semibold">{a.title}</div>
                        <div className="small text-muted text-truncate" style={{maxWidth: 280}}>{a.description}</div>
                      </td>
                      <td className="text-capitalize">{a.entity_type}</td>
                      <td>{a.assignee?.full_name || a.assignee?.email}</td>
                      <td className="text-capitalize">{a.priority}</td>
                      <td>
                        <form action={changeStatus} className="d-flex align-items-center gap-2">
                          <input type="hidden" name="action_id" value={a.id} />
                          <select name="status" className="form-select form-select-sm" defaultValue={a.status}>
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button className="btn btn-sm btn-secondary" type="submit">Save</button>
                        </form>
                      </td>
                      <td>{a.due_date ? new Date(a.due_date).toLocaleDateString() : '-'}</td>
                      <td>{new Date(a.updated_at).toLocaleString()}</td>
                      <td>
                        <details>
                          <summary className="btn btn-sm btn-outline-secondary">Details</summary>
                          <div className="p-2">
                            <div className="mb-2">
                              <strong>Created by:</strong> {a.created_by?.full_name || a.created_by?.email}
                            </div>
                            <div className="mb-2">
                              <form action={reassign} className="d-flex align-items-center gap-2">
                                <input type="hidden" name="action_id" value={a.id} />
                                <select name="assignee_user_id" className="form-select form-select-sm" defaultValue={a.assignee_user_id}>
                                  {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                  ))}
                                </select>
                                <button className="btn btn-sm btn-secondary" type="submit">Reassign</button>
                              </form>
                            </div>
                            <div className="mb-2">
                              <form action={addComment}>
                                <input type="hidden" name="action_id" value={a.id} />
                                <div className="input-group input-group-sm">
                                  <input name="note" className="form-control" placeholder="Add comment" />
                                  <button className="btn btn-outline-secondary" type="submit">Add</button>
                                </div>
                              </form>
                            </div>
                            <div className="small text-muted">Last comment: {a.comments?.[0]?.note || '—'}</div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted">No actions found</td></tr>
                  )}
                </tbody>
              </table>

              <div className="d-flex justify-content-between align-items-center">
                <div className="text-muted small">
                  Page {pagination.page} of {pagination.pages} • {pagination.total} total
                </div>
                <div className="btn-group">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).slice(0, 10).map((p) => (
                    <a
                      key={p}
                      className={`btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-outline-primary'}`}
                      href={`?page=${p}&limit=${pagination.limit}&status=${String((searchParams?.status || '') as any)}&priority=${String((searchParams?.priority || '') as any)}&assignee=${String((searchParams?.assignee || '') as any)}&q=${String((searchParams?.q || '') as any)}&sort=${pagination.sort}&order=${pagination.order}`}
                    >
                      {p}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
