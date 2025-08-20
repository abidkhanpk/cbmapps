interface DashboardStatsProps {
  stats: {
    totalAssets: number;
    totalComponents: number;
    totalStudies: number;
    openActions: number;
    overdueTasks: number;
  };
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Total Assets',
      value: stats.totalAssets,
      icon: 'bi-building',
      color: 'primary',
      href: '/assets'
    },
    {
      title: 'Components',
      value: stats.totalComponents,
      icon: 'bi-gear',
      color: 'info',
      href: '/assets'
    },
    {
      title: 'FMECA Studies',
      value: stats.totalStudies,
      icon: 'bi-clipboard-data',
      color: 'success',
      href: '/fmeca'
    },
    {
      title: 'Open Actions',
      value: stats.openActions,
      icon: 'bi-exclamation-triangle',
      color: 'warning',
      href: '/actions'
    },
    {
      title: 'Overdue Tasks',
      value: stats.overdueTasks,
      icon: 'bi-clock',
      color: 'danger',
      href: '/cm/tasks'
    }
  ];

  return (
    <div className="row">
      {statCards.map((card, index) => (
        <div key={index} className="col-lg-2 col-md-4 col-sm-6 mb-3">
          <div className={`card dashboard-card border-${card.color}`}>
            <div className="card-body text-center">
              <div className={`text-${card.color} mb-2`}>
                <i className={`${card.icon} fs-1`}></i>
              </div>
              <div className={`dashboard-stat text-${card.color}`}>
                {card.value}
              </div>
              <div className="text-muted small">
                {card.title}
              </div>
            </div>
            <div className="card-footer bg-transparent border-0 p-0">
              <a 
                href={card.href} 
                className={`btn btn-${card.color} btn-sm w-100 rounded-0 rounded-bottom`}
              >
                View Details
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}