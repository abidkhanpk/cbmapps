import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/config';
import Sidebar from '@/app/components/Sidebar';
import TopNavbar from '@/app/components/TopNavbar';
import { SessionProvider } from '@/app/components/SessionProvider';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider session={session}>
      <div className="d-flex">
        <Sidebar />
        <div className="main-content flex-grow-1">
          <TopNavbar />
          <main className="p-4">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}