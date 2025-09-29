'use client'

import { useState } from 'react'

export default function InlineEdit({
  action,
  children,
  summaryAriaLabel = 'Edit',
}: {
  action: (formData: FormData) => void
  children: React.ReactNode
  summaryAriaLabel?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        className="btn btn-sm btn-outline-secondary"
        type="button"
        aria-label={summaryAriaLabel}
        title="Edit"
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-pencil-square" />
      </button>
      {open && (
        <div className="mt-2">
          <form
            action={action}
            onSubmit={() => {
              // Close the editor immediately after submit, similar to toggling the edit button
              setTimeout(() => setOpen(false), 0)
            }}
            className="row g-2"
          >
            {children}
          </form>
        </div>
      )}
    </div>
  )
}
