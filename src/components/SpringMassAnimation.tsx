"use client";
import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

export default function SpringMassAnimation({ data }: { data?: { x: number } }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let sketch: any = null;
    let isMounted = true;
    const loadP5 = async () => {
      const p5 = (await import('p5')).default;
      if (ref.current && isMounted) {
        sketch = new p5((p: any) => {
          p.setup = () => {
            p.createCanvas(300, 150);
          };
          p.draw = () => {
            p.background(240);
            // Draw spring
            p.stroke(100);
            p.strokeWeight(4);
            p.line(30, 75, 120, 75);
            // Draw mass
            const x = 120 + (data?.x ?? 0) * 50;
            p.fill(80, 180, 255);
            p.rect(x, 55, 40, 40, 8);
          };
        }, ref.current);
      }
    };
    loadP5();
    return () => {
      isMounted = false;
      if (sketch) sketch.remove();
    };
  }, [data]);

  return <div ref={ref} className="bg-white rounded-lg shadow p-4" />;
}
