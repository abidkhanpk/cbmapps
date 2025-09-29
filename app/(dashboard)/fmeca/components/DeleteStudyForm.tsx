'use client'

import React from 'react'

export default function DeleteStudyForm({
  deleteStudy,
  studyId,
}: {
  deleteStudy: (formData: FormData) => void
  studyId: string
}) {
  return (
    <form
      action={deleteStudy}
      onSubmit={(e) => {
        if (!confirm('Delete this study and all its items?')) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="study_id" value={studyId} />
      <button className="btn btn-sm btn-outline-danger" type="submit" title="Delete">
        <i className="bi bi-trash" />
      </button>
    </form>
  )
}
