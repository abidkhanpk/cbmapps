"use client";
import Plot from 'react-plotly.js';

import { Layout, Data } from 'plotly.js';

interface SignalPlotProps {
  title: string;
  data?: {
    data: Data[];
    layout: Partial<Layout>;
  };
}

export default function SignalPlot({ title, data }: SignalPlotProps) {
  if (!data) return <div className="bg-gray-100 rounded p-8 text-center">No data to display</div>;
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-2 text-center">{title}</h3>
      <Plot
        data={data.data}
        layout={{ ...data.layout, autosize: true }}
        config={{ responsive: true }}
        style={{ width: '100%', height: '300px' }}
      />
    </div>
  );
}
