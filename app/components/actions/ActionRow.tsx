"use client"

import { useId, useState } from "react"

export type ActionRowProps = {
  action: {
    id: string
    title: string
    description?: string | null
    entity_type: string
    entity_id: string
    assignee_user_id?: string | null
    priority: string
    status: string
    due_date?: string | Date | null
    assignee?: { full_name?: string | null; email?: string | null } | null
  }
  users: { id: string; full_name?: string | null; email?: string | null }[]
  updateAction: (formData: FormData) => void
  deleteAction?: (formData: FormData) => void
}

const statusOptions = ["open", "in_progress", "blocked", "done", "cancelled"]
const priorityOptions = ["low", "medium", "high", "urgent"]

export default function ActionRow({ action, users, updateAction, deleteAction }: ActionRowProps) {
  const [editing, setEditing] = useState(false)
  const formId = useId()
  const onSubmit = () => setTimeout(() => setEditing(false), 0)

  return (
    <tr>
      <td style={{ display: "none" }}>
        <form id={formId} action={updateAction} onSubmit={onSubmit} />
        <input form={formId} type="hidden" name="action_id" value={action.id} />
      </td>
      {/* Title */}
      <td>
        {!editing ? (
          action.title
        ) : (
          <input name="title" form={formId} className="form-control form-control-sm" defaultValue={action.title} />
        )}
      </td>
      {/* Entity */}
      <td className="text-nowrap">
        {action.entity_type} • {action.entity_id.slice(0, 6)}...
      </td>
      {/* Assignee */}
      <td>
        {!editing ? (
          action.assignee?.full_name || action.assignee?.email || "Unassigned"
        ) : (
          <select name="assignee_user_id" form={formId} defaultValue={action.assignee_user_id || ""} className="form-select form-select-sm">
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        )}
      </td>
      {/* Priority */}
      <td className="text-capitalize">
        {!editing ? (
          action.priority
        ) : (
          <select name="priority" form={formId} defaultValue={action.priority} className="form-select form-select-sm">
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </td>
      {/* Status */}
      <td className="text-capitalize">
        {!editing ? (
          action.status.replace("_", " ")
        ) : (
          <select name="status" form={formId} defaultValue={action.status} className="form-select form-select-sm">
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </td>
      {/* Due */}
      <td>
        {!editing ? (
          action.due_date ? new Date(action.due_date).toLocaleDateString() : ""
        ) : (
          <input
            type="date"
            name="due_date"
            form={formId}
            className="form-control form-control-sm"
            defaultValue={action.due_date ? new Date(action.due_date).toISOString().split("T")[0] : ""}
          />
        )}
      </td>
      {/* Ops */}
      <td className="text-end">
        {!editing ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : (
          <div className="d-inline-flex gap-2">
            <details>
              <summary className="btn btn-sm btn-outline-secondary">More</summary>
              <div className="mt-2" style={{ minWidth: 280 }}>
                <div className="mb-2">
                  <label className="form-label">Description</label>
                  <textarea name="description" form={formId} className="form-control form-control-sm" rows={2} defaultValue={action.description || ''} />
                </div>
              </div>
            </details>
            <button form={formId} type="submit" className="btn btn-sm btn-secondary">
              Save
            </button>
            {deleteAction && (
              <form action={deleteAction} className="d-inline">
                <input type="hidden" name="action_id" value={action.id} />
                <button type="submit" className="btn btn-sm btn-outline-danger">Delete</button>
              </form>
            )}
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
