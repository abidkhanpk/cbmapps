import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import getAuthOptions from '@/lib/auth/config';
import { SessionProvider } from '@/app/components/SessionProvider';
import Frame from '@/app/components/layout/Frame';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(getAuthOptions());

  if (!session) {
    redirect('/login');
  }

  return (
    <SessionProvider session={session}>
      <Frame>
        {children}
      </Frame>
    </SessionProvider>
  );
}