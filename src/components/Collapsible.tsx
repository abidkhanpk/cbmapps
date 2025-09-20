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
    // use last:mb-0 so the final collapsible doesn't introduce extra bottom space
    <div className="border-b pb-3 mb-3 last:mb-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-2 focus:outline-none"
      >
        <span className="font-medium">{title}</span>
        <span className={`transform transition-transform duration-200 text-gray-500 ${open ? 'rotate-180' : 'rotate-0'}`} aria-hidden>
          {/* simple chevron */}
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 8L10 13L15 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[1000px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
        <div className="pt-1">
          <div className="rounded-md border border-gray-100 bg-white shadow-sm p-3">
            <div className="-mt-1">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
