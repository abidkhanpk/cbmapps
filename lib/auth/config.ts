import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Lazy Prisma client (avoid instantiating at build time)
let prismaAuth: PrismaClient | null = null;
function getPrismaAuth() {
  if (!prismaAuth) {
    prismaAuth = new PrismaClient();
  }
  return prismaAuth;
}

export function getAuthOptions(): NextAuthOptions {
  const prisma = getPrismaAuth();

  return {
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              user_roles: { include: { role: true } },
            },
          });

          if (!user || !user.password_hash || !user.is_active) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            return null;
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.full_name,
            roles: user.user_roles.map((ur) => ur.role.name),
          } as any;
        },
      }),
    ],
    session: {
      strategy: 'jwt',
      maxAge: parseInt(process.env.SESSION_MAX_AGE_DAYS || '7') * 24 * 60 * 60,
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = (user as any).id;
          token.roles = (user as any).roles || [];
        }
        if (!token.roles && token.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { user_roles: { include: { role: true } } },
          });
          token.roles = dbUser?.user_roles.map((ur) => ur.role.name) || [];
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.id as string;
          (session.user as any).roles = (token.roles as string[]) || [];
        }
        return session;
      },
    },
    pages: {
      signIn: '/login',
    },
  };
}

export default getAuthOptions;