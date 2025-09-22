import NextAuth from 'next-auth';
import getAuthOptions from '@/lib/auth/config';

// Ensure this route is executed at runtime and is not statically optimized during build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const handler = NextAuth(getAuthOptions());

export { handler as GET, handler as POST };