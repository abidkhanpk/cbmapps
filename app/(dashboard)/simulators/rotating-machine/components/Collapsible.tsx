'use client';
import React, { useState, createContext, useContext } from 'react';

export interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  id?: string;
}

// Accordion context: when used, only one id is open at a time
type AccordionContextType = { openId?: string | null; setOpenId?: (id?: string | null) => void };
const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

export const Accordion: React.FC<{ children?: React.ReactNode; defaultOpenId?: string | null }> = ({ children, defaultOpenId = null }) => {
  const [openId, setOpenId] = useState<string | null | undefined>(defaultOpenId);
  return <AccordionContext.Provider value={{ openId, setOpenId }}>{children}</AccordionContext.Provider>;
};

export const Collapsible: React.FC<CollapsibleProps> = ({ title, defaultOpen = false, children, id }) => {
  const ctx = useContext(AccordionContext);
  const isAccordion = !!ctx && typeof ctx.setOpenId === 'function';
  const [openLocal, setOpenLocal] = useState<boolean>(defaultOpen);
  const open = isAccordion ? ctx!.openId === id : openLocal;
  const toggle = () => {
    if (isAccordion) {
      const cur = ctx!.openId;
      if (cur === id) ctx!.setOpenId && ctx!.setOpenId(null);
      else ctx!.setOpenId && ctx!.setOpenId(id ?? null);
    } else {
      setOpenLocal(v => !v);
    }
  };
  return (
  // use last:mb-0 so the final collapsible doesn't introduce extra bottom space
  // render a full rounded border box so collapsed sections look like a card
  <div className="mb-2 last:mb-0 w-full">
    <div className="rounded-lg border border-gray-200 bg-white w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="w-full flex justify-between items-center gap-3 py-2 px-3 rounded-t-lg hover:shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <span className="font-medium text-gray-800 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
          {title}
        </span>
        <span className={`transform transition-transform duration-250 text-gray-500 ${open ? 'rotate-180' : 'rotate-0'}`} aria-hidden>
          {/* chevron with smoother stroke */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-3 pb-3 pt-0">
          {/* content area: no additional outer border to avoid double lines; keep inner padding */}
          <div className="pt-1">
            <div className="rounded-b-lg bg-white p-3">
              <div className="-mt-1">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
