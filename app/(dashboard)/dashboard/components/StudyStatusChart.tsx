'use client';

import { useEffect, useRef } from 'react';

interface StudyStatusData {
  status: string;
  _count: number;
}

interface StudyStatusChartProps {
  data: StudyStatusData[];
}

export default function StudyStatusChart({ data }: StudyStatusChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  useEffect(() => {
    if (!chartRef.current || typeof window === 'undefined') return;

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare data
    const labels = data.map(item => item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' '));
    const counts = data.map(item => item._count);
    const colors = data.map(item => {
      switch (item.status) {
        case 'draft': return '#6c757d';
        case 'in_review': return '#ffc107';
        case 'approved': return '#198754';
        case 'archived': return '#dc3545';
        default: return '#0dcaf0';
      }
    });

    // Create chart
    const Chart = (window as any).Chart;
    if (Chart) {
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: counts,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        <i className="bi bi-pie-chart fs-1 mb-3 d-block"></i>
        <p>No FMECA studies found</p>
      </div>
    );
  }

  return (
    <div style={{ height: '300px' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}