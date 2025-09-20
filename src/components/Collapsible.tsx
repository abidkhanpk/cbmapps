'use client';
import React, { useState } from 'react';

export interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export const Collapsible: React.FC<CollapsibleProps> = ({ title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  return (
    <div className="border-b pb-3 mb-3">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex justify-between items-center py-1">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-gray-500">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
};
