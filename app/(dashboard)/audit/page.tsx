import { getServerSession } from 'next-auth'
import getAuthOptions from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { AuditService } from '@/lib/services/audit'

export const metadata = { title: 'Audit Log | CBMAPPS' }

export default async function AuditPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const session = await getServerSession(getAuthOptions())
  if (!session?.user?.id) redirect('/login')

  const page = Number(searchParams?.page || '1')
  const limit = 50
  const { logs, pagination } = await AuditService.getAuditLogs({
    userId: typeof searchParams?.user === 'string' ? searchParams!.user : undefined,
    entityType: typeof searchParams?.entity_type === 'string' ? searchParams!.entity_type : undefined,
    entityId: typeof searchParams?.entity_id === 'string' ? searchParams!.entity_id : undefined,
    action: typeof searchParams?.action === 'string' ? searchParams!.action : undefined,
    page,
    limit,
  } as any)

  return (
    <div className="container-fluid">
      <div className="row mb-3">
        <div className="col">
          <h1 className="h3 mb-0">Audit Log</h1>
          <div className="text-muted">Recent system and user actions.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <strong>Logs</strong>
          <form className="d-flex gap-2" method="get">
            <input name="user" placeholder="User ID" className="form-control form-control-sm" defaultValue={typeof searchParams?.user === 'string' ? searchParams!.user : ''} />
            <input name="entity_type" placeholder="Entity Type" className="form-control form-control-sm" defaultValue={typeof searchParams?.entity_type === 'string' ? searchParams!.entity_type : ''} />
            <input name="entity_id" placeholder="Entity ID" className="form-control form-control-sm" defaultValue={typeof searchParams?.entity_id === 'string' ? searchParams!.entity_id : ''} />
            <select name="action" className="form-select form-select-sm" defaultValue={typeof searchParams?.action === 'string' ? searchParams!.action : ''}>
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="APPROVAL">APPROVAL</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="FILE_UPLOAD">FILE_UPLOAD</option>
            </select>
            <button className="btn btn-sm btn-outline-secondary" type="submit">Filter</button>
          </form>
        </div>
        <div className="card-body table-responsive">
          <table className="table table-striped table-sm align-middle">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id}>
                  <td><small className="text-muted">{new Date(log.created_at).toLocaleString()}</small></td>
                  <td>{log.user?.full_name || log.user?.email || 'System'}</td>
                  <td><span className="badge bg-light text-dark">{log.action}</span></td>
                  <td><code>{log.entity_type}</code> <small className="text-muted">#{log.entity_id}</small></td>
                  <td>
                    <pre className="mb-0 small text-muted" style={{whiteSpace: 'pre-wrap'}}>{JSON.stringify(log.details, null, 2)}</pre>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted">No logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between">
          <div>Page {pagination.page} of {pagination.pages}</div>
          <div className="btn-group">
            <a className={`btn btn-sm btn-outline-secondary ${pagination.page <= 1 ? 'disabled' : ''}`} href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams || {}).map(([k,v]) => [k, String(v)])), page: String(Math.max(1, pagination.page - 1)) }).toString()}`}>Prev</a>
            <a className={`btn btn-sm btn-outline-secondary ${pagination.page >= pagination.pages ? 'disabled' : ''}`} href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams || {}).map(([k,v]) => [k, String(v)])), page: String(Math.min(pagination.pages, pagination.page + 1)) }).toString()}`}>Next</a>
          </div>
        </div>
      </div>
    </div>
  )
}
