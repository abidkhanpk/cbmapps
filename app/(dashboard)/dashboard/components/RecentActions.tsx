import { format } from 'date-fns';

interface Action {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: Date;
  assignee: {
    full_name: string;
    email: string;
  };
  created_by: {
    full_name: string;
    email: string;
  };
}

interface RecentActionsProps {
  actions: Action[];
}

export default function RecentActions({ actions }: RecentActionsProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open': return 'badge-status-open';
      case 'in_progress': return 'badge-status-in-progress';
      case 'blocked': return 'badge-status-blocked';
      case 'done': return 'badge-status-done';
      case 'cancelled': return 'badge-status-cancelled';
      default: return 'bg-secondary';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'low': return 'badge-priority-low';
      case 'medium': return 'badge-priority-medium';
      case 'high': return 'badge-priority-high';
      case 'urgent': return 'badge-priority-urgent';
      default: return 'bg-secondary';
    }
  };

  if (actions.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        <i className="bi bi-inbox fs-1 mb-3 d-block"></i>
        <p>No recent actions found</p>
      </div>
    );
  }

  return (
    <div className="list-group list-group-flush">
      {actions.map((action) => (
        <div key={action.id} className="list-group-item border-0 px-0">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <h6 className="mb-1">
                <a href={`/actions/${action.id}`} className="text-decoration-none">
                  {action.title}
                </a>
              </h6>
              <p className="mb-1 text-muted small">
                Assigned to: {action.assignee.full_name}
              </p>
              <small className="text-muted">
                Created {format(new Date(action.created_at), 'MMM d, yyyy')} by {action.created_by.full_name}
              </small>
            </div>
            <div className="text-end">
              <span className={`badge ${getStatusBadgeClass(action.status)} mb-1`}>
                {action.status.replace('_', ' ')}
              </span>
              <br />
              <span className={`badge ${getPriorityBadgeClass(action.priority)}`}>
                {action.priority}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}