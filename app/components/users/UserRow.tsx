"use client"

import { useId, useState } from "react"

export type RoleOption = { id: string; name: string }

export type UserRowProps = {
  user: {
    id: string
    full_name: string
    email: string
    is_active: boolean
    created_at: string | Date
    user_roles?: { role: { name: string } }[]
  }
  roles: RoleOption[]
  updateUser: (formData: FormData) => void
}

export default function UserRow({ user, roles, updateUser }: UserRowProps) {
  const [editing, setEditing] = useState(false)
  const formId = useId()
  const onSubmit = () => setTimeout(() => setEditing(false), 0)

  const currentRoleName = (user.user_roles || [])[0]?.role?.name || ''

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
      {/* Role + Password */}
      <td>
        {!editing ? (
          currentRoleName || "-"
        ) : (
          <div className="d-flex flex-column gap-2">
            <div>
              <label className="form-label small mb-1">Role</label>
              <select name="role_id" form={formId} className="form-select form-select-sm" defaultValue={roles.find(r => r.name === currentRoleName)?.id || ''}>
                <option value="">Select role...</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id} className="text-capitalize">{r.name.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label small mb-1">New password</label>
              <input
                type="password"
                name="new_password"
                form={formId}
                className="form-control form-control-sm"
                placeholder="Leave blank to keep existing"
              />
            </div>
          </div>
        )}
      </td>
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
