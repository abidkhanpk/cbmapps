"use client"

import { useId, useState } from "react"

export type UserRowProps = {
  user: {
    id: string
    full_name: string
    email: string
    is_active: boolean
    created_at: string | Date
    user_roles?: { role: { name: string } }[]
  }
  updateUser: (formData: FormData) => void
}

export default function UserRow({ user, updateUser }: UserRowProps) {
  const [editing, setEditing] = useState(false)
  const formId = useId()
  const onSubmit = () => setTimeout(() => setEditing(false), 0)

  return (
    <tr>
      <td style={{ display: "none" }}>
        <form id={formId} action={updateUser} onSubmit={onSubmit} />
        <input form={formId} type="hidden" name="user_id" value={user.id} />
      </td>
      {/* Name */}
      <td>
        {!editing ? (
          user.full_name
        ) : (
          <input name="full_name" form={formId} className="form-control form-control-sm" defaultValue={user.full_name} />
        )}
      </td>
      {/* Email */}
      <td>
        {!editing ? (
          user.email
        ) : (
          <input name="email" form={formId} className="form-control form-control-sm" defaultValue={user.email} />
        )}
      </td>
      {/* Roles */}
      <td>{(user.user_roles || []).map((ur) => ur.role.name).join(", ") || "-"}</td>
      {/* Active */}
      <td>
        {!editing ? (
          user.is_active ? "Yes" : "No"
        ) : (
          <div className="form-check">
            <input className="form-check-input" type="checkbox" name="is_active" form={formId} defaultChecked={user.is_active} />
            <label className="form-check-label">Active</label>
          </div>
        )}
      </td>
      {/* Created */}
      <td>{new Date(user.created_at).toLocaleString()}</td>
      {/* Ops */}
      <td className="text-end">
        {!editing ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : (
          <div className="d-inline-flex gap-2">
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
