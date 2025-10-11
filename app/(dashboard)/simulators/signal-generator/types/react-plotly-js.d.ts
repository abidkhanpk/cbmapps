declare module 'react-plotly.js' {
  import * as React from 'react';
  import type { Data, Layout, Config } from 'plotly.js';

  export interface PlotParams {
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    onInitialized?: (figure: unknown, graphDiv: HTMLDivElement) => void;
    onUpdate?: (figure: unknown, graphDiv: HTMLDivElement) => void;
    onPurge?: (graphDiv: HTMLDivElement) => void;
    onRelayout?: (event: unknown) => void;
  }

  const Plot: React.FC<PlotParams>;
  export default Plot;
}
