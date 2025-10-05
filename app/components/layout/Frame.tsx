'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import TopNavbar from '@/app/components/TopNavbar'
import Footer from '@/app/components/Footer'

export default function LayoutFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const showFmecaSidebar = pathname.startsWith('/fmeca')

  return (
    <div className="d-flex flex-column min-vh-100">
      <TopNavbar />
      <div className="d-flex flex-grow-1">
        {showFmecaSidebar && <Sidebar />}
        <div className={`main-content flex-grow-1 ${showFmecaSidebar ? '' : 'w-100'}`}>
          <main className="p-4">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  )
}
