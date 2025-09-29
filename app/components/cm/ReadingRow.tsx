"use client"

import { useId, useState } from "react"

export type CmReadingRowProps = {
  reading: {
    id: string
    performed_at: string | Date
    status: string
    notes?: string | null
    result?: any
    task?: { id: string; technique?: string | null; component?: { asset?: { name?: string | null; tag_code?: string | null } | null } | null } | null
    performed_by?: { full_name?: string | null; email?: string | null } | null
    performed_by_user_id?: string | null
  }
  tasks: { id: string; label: string }[]
  users: { id: string; name: string }[]
  updateReading: (formData: FormData) => void
}

const statusOptions = [
  { value: "ok", label: "Ok" },
  { value: "warning", label: "Warning" },
  { value: "alarm", label: "Alarm" },
]

export default function ReadingRow({ reading, updateReading, tasks, users }: CmReadingRowProps) {
  const [editing, setEditing] = useState(false)
  const formId = useId()

  const onSubmit = () => setTimeout(() => setEditing(false), 0)

  const assetLabel = reading.task?.component?.asset?.tag_code || reading.task?.component?.asset?.name || "-"
  const dateValue = new Date(reading.performed_at)

  return (
    <tr>
      <td style={{ display: "none" }}>
        <form id={formId} action={updateReading} onSubmit={onSubmit} />
        <input form={formId} type="hidden" name="reading_id" value={reading.id} />
      </td>
      {/* Date */}
      <td>
        {!editing ? (
          dateValue.toLocaleString()
        ) : (
          <input
            type="datetime-local"
            name="performed_at"
            form={formId}
            className="form-control form-control-sm"
            defaultValue={new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16)}
          />
        )}
      </td>
      {/* Task */}
      <td>
        {!editing ? (
          reading.task?.technique || '-'
        ) : (
          <select name="task_id" form={formId} className="form-select form-select-sm" defaultValue={reading.task?.id || ''}>
            <option value="">Select task...</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        )}
      </td>
      {/* Asset */}
      <td>{assetLabel}</td>
      {/* Status */}
      <td className="text-capitalize">
        {!editing ? (
          reading.status
        ) : (
          <select name="status" form={formId} defaultValue={reading.status} className="form-select form-select-sm">
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </td>
      {/* Performed By */}
      <td>
        {!editing ? (
          reading.performed_by?.full_name || reading.performed_by?.email || '-'
        ) : (
          <select
            name="performed_by_user_id"
            form={formId}
            className="form-select form-select-sm"
            defaultValue={reading.performed_by_user_id || ''}
          >
            <option value="">Select user...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
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
                  <label className="form-label">Notes</label>
                  <textarea name="notes" form={formId} className="form-control form-control-sm" rows={2} defaultValue={reading.notes || ''} />
                </div>
                <div className="mb-2">
                  <label className="form-label">Result (JSON)</label>
                  <input name="result" form={formId} className="form-control form-control-sm" defaultValue={JSON.stringify(reading.result || {})} />
                </div>
              </div>
            </details>
            <button form={formId} type="submit" className="btn btn-sm btn-secondary">
              Save
            </button>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
