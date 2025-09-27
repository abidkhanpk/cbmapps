'use client'

import { useState } from 'react'

interface ItemsCardProps {
  study: any
  components: any[]
  failureModes: any[]
  assets: any[]
  users: any[]
  actionsByItem: Record<string, any[]>
  userId: string
  initialExpandedId?: string
  addItem: (formData: FormData) => void
  updateItem: (formData: FormData) => void
  deleteItem: (formData: FormData) => void
  createComponent: (formData: FormData) => void
  addAction: (formData: FormData) => void
  updateAction: (formData: FormData) => void
  deleteAction: (formData: FormData) => void
}

export default function ItemsCard({
  study,
  components,
  failureModes,
  assets,
  users,
  actionsByItem,
  userId,
  initialExpandedId,
  addItem,
  updateItem,
  deleteItem,
  createComponent,
  addAction,
  updateAction,
  deleteAction,
}: ItemsCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId || null)

  return (
    <div className="row g-4 mt-1">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Items</strong>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted d-none d-md-inline">Compact rows. Expand a row to edit and manage corrective actions.</span>
              <button
                className="btn btn-sm btn-primary"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#add-fmeca-item"
                aria-expanded="false"
                aria-controls="add-fmeca-item"
                title="Add FMECA Item"
              >
                <i className="bi bi-plus-circle" />
                <span className="d-none d-md-inline ms-1">Add FMECA Item</span>
              </button>
            </div>
          </div>
          <div className="card-body table-responsive">
            {/* Collapsible Add Item Form */}
            <div id="add-fmeca-item" className="collapse">
              <div className="border rounded p-3 mb-3">
                <div className="fw-semibold mb-2">Add FMECA Item</div>
                <form action={addItem} className="row g-2">
                  <input type="hidden" name="study_id" value={study.id} />
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
                      <input type="hidden" name="study_id" value={study.id} />
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
                {(study?.items ?? []).map((it: any) => {
                  const isExpanded = expandedId === it.id
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
                          <div className="d-inline-flex gap-1">
                            {!isExpanded ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setExpandedId(it.id)}
                                title="Expand"
                                aria-label="Expand"
                              >
                                <i className="bi bi-arrows-expand" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={() => setExpandedId(null)}
                                title="Collapse"
                                aria-label="Collapse"
                              >
                                <i className="bi bi-arrows-collapse" />
                              </button>
                            )}
                            <form
                              action={deleteItem}
                              className="m-0 p-0"
                              onSubmit={(e) => {
                                if (!confirm('Are you sure you want to delete this FMECA item? This action cannot be undone.')) {
                                  e.preventDefault()
                                }
                              }}
                            >
                              <input type="hidden" name="item_id" value={it.id} />
                              <button className="btn btn-sm btn-outline-danger btn-delete" type="submit" title="Delete" aria-label="Delete">
                                <i className="bi bi-trash" />
                              </button>
                            </form>
                          </div>
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
                                    <input type="hidden" name="study_id" value={study.id} />
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
                                    <input type="hidden" name="study_id" value={study.id} />
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
                                                <input type="hidden" name="study_id" value={study.id} />
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
                                                  <form
                                                    action={deleteAction}
                                                    onSubmit={(e) => {
                                                      if (!confirm('Delete this action?')) {
                                                        e.preventDefault()
                                                      }
                                                    }}
                                                  >
                                                    <input type="hidden" name="action_id" value={a.id} />
                                                    <input type="hidden" name="study_id" value={study.id} />
                                                    <input type="hidden" name="item_id" value={it.id} />
                                                    <button className="btn btn-sm btn-outline-danger btn-delete" type="submit">
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
                {(study?.items?.length ?? 0) === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted">No items yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
