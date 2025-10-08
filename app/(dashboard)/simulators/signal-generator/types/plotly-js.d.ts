declare module 'plotly.js' {
  export type Data = Partial<{
    x: unknown[];
    y: unknown[];
    type: string;
    mode?: string;
    line?: Partial<{ color?: string; width?: number; dash?: string }>;
    marker?: Partial<{ color?: string; size?: number; symbol?: string }>;
    name?: string;
    hovertemplate?: string;
  }>;

  export type Layout = Partial<{
    title?: string | Partial<{ text?: string }>;
    margin?: Partial<{ l?: number; r?: number; t?: number; b?: number }>;
    autosize?: boolean;
    height?: number;
    xaxis?: unknown;
    yaxis?: unknown;
    shapes?: unknown[];
    annotations?: unknown[];
    legend?: unknown;
    uirevision?: string | number;
    paper_bgcolor?: string;
    plot_bgcolor?: string;
  }>;

  export type Config = Partial<{
    responsive?: boolean;
    displaylogo?: boolean;
    displayModeBar?: boolean;
  }>;
}
