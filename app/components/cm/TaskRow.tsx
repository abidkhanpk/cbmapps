"use client"

import { useId, useState } from "react"

export type CmTaskRowProps = {
  task: {
    id: string
    technique: string
    interval_days: number
    procedure?: string | null
    acceptance_criteria?: string | null
    next_due_at?: string | Date | null
    component?: { name?: string | null; asset?: { name?: string | null; tag_code?: string | null } | null } | null
  }
  updateTask: (formData: FormData) => void
}

const techniqueOptions = [
  { value: "vibration", label: "Vibration" },
  { value: "thermography", label: "Thermography" },
  { value: "ultrasound", label: "Ultrasound" },
  { value: "oil", label: "Oil" },
  { value: "visual", label: "Visual" },
  { value: "motor_current", label: "Motor current" },
  { value: "acoustic", label: "Acoustic" },
  { value: "other", label: "Other" },
]

export default function TaskRow({ task, updateTask }: CmTaskRowProps) {
  const [editing, setEditing] = useState(false)
  const formId = useId()

  const onSubmit = () => {
    // Close edit mode after server action triggers
    setTimeout(() => setEditing(false), 0)
  }

  const assetLabel = task.component?.asset?.tag_code || task.component?.asset?.name || "-"

  return (
    <tr>
      {/* Hidden form element to associate inputs across cells using the `form` attribute */}
      <td style={{ display: "none" }}>
        <form id={formId} action={updateTask} onSubmit={onSubmit} />
        <input form={formId} type="hidden" name="task_id" value={task.id} />
      </td>

      {/* Component */}
      <td>
        {!editing ? (
          task.component?.name || "-"
        ) : (
          <input className="form-control form-control-sm" value={task.component?.name || "-"} disabled />
        )}
      </td>

      {/* Asset */}
      <td>
        {!editing ? (
          assetLabel
        ) : (
          <input className="form-control form-control-sm" value={assetLabel} disabled />
        )}
      </td>

      {/* Technique */}
      <td className="text-capitalize">
        {!editing ? (
          task.technique
        ) : (
          <select name="technique" form={formId} className="form-select form-select-sm" defaultValue={task.technique}>
            {techniqueOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Interval */}
      <td>
        {!editing ? (
          task.interval_days
        ) : (
          <input
            name="interval_days"
            form={formId}
            type="number"
            min={1}
            className="form-control form-control-sm"
            defaultValue={task.interval_days}
          />
        )}
      </td>

      {/* Next Due */}
      <td>
        {!editing ? (
          task.next_due_at ? new Date(task.next_due_at).toLocaleString() : "-"
        ) : (
          <input
            className="form-control form-control-sm"
            value={task.next_due_at ? new Date(task.next_due_at).toLocaleString() : "-"}
            disabled
          />
        )}
      </td>

      {/* Actions */}
      <td className="text-end">
        {!editing ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : (
          <div className="d-inline-flex gap-2">
            {/* Optional advanced fields shown while editing */}
            <details>
              <summary className="btn btn-sm btn-outline-secondary">More</summary>
              <div className="mt-2" style={{ minWidth: 280 }}>
                <div className="mb-2">
                  <label className="form-label">Procedure</label>
                  <textarea
                    name="procedure"
                    form={formId}
                    className="form-control form-control-sm"
                    rows={2}
                    defaultValue={task.procedure || ""}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Acceptance Criteria</label>
                  <textarea
                    name="acceptance_criteria"
                    form={formId}
                    className="form-control form-control-sm"
                    rows={2}
                    defaultValue={task.acceptance_criteria || ""}
                  />
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
