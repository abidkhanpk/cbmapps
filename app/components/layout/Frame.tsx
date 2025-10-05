'use client'

import Sidebar from '@/app/components/Sidebar'
import TopNavbar from '@/app/components/TopNavbar'
import Footer from '@/app/components/Footer'

export default function LayoutFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      <TopNavbar />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <div className="main-content flex-grow-1">
          <main className="p-4">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  )
}
