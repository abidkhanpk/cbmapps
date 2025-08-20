import { format } from 'date-fns';

interface CmTask {
  id: string;
  technique: string;
  next_due_at: Date | null;
  component: {
    name: string;
    component_code: string;
    asset: {
      name: string;
      tag_code: string;
    };
  };
}

interface UpcomingTasksProps {
  tasks: CmTask[];
}

export default function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  const getTechniqueIcon = (technique: string) => {
    switch (technique) {
      case 'vibration': return 'bi-activity';
      case 'thermography': return 'bi-thermometer';
      case 'ultrasound': return 'bi-soundwave';
      case 'oil': return 'bi-droplet';
      case 'visual': return 'bi-eye';
      case 'motor_current': return 'bi-lightning';
      case 'acoustic': return 'bi-volume-up';
      default: return 'bi-gear';
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateClass = (daysUntil: number) => {
    if (daysUntil <= 1) return 'text-danger';
    if (daysUntil <= 3) return 'text-warning';
    return 'text-muted';
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        <i className="bi bi-calendar-check fs-1 mb-3 d-block"></i>
        <p>No upcoming CM tasks</p>
      </div>
    );
  }

  return (
    <div className="list-group list-group-flush">
      {tasks.map((task) => {
        const daysUntil = task.next_due_at ? getDaysUntilDue(task.next_due_at) : null;
        return (
          <div key={task.id} className="list-group-item border-0 px-0">
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-1">
                  <i className={`${getTechniqueIcon(task.technique)} me-2`}></i>
                  <h6 className="mb-0">
                    {task.technique.charAt(0).toUpperCase() + task.technique.slice(1)}
                  </h6>
                </div>
                <p className="mb-1 text-muted small">
                  {task.component.asset.name} - {task.component.name}
                </p>
                <small className="text-muted">
                  {task.component.asset.tag_code} / {task.component.component_code}
                </small>
              </div>
              <div className="text-end">
                {task.next_due_at && (
                  <>
                    <div className={`small ${getDueDateClass(daysUntil!)}`}>
                      {daysUntil === 0 ? 'Due today' : 
                       daysUntil === 1 ? 'Due tomorrow' :
                       daysUntil! > 0 ? `Due in ${daysUntil} days` : 
                       `Overdue by ${Math.abs(daysUntil!)} days`}
                    </div>
                    <div className="text-muted small">
                      {format(new Date(task.next_due_at), 'MMM d')}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}