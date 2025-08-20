import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Create a separate Prisma client for NextAuth (without Accelerate)
const prismaForAuth = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaForAuth),
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

        const user = await prismaForAuth.user.findUnique({
          where: { email: credentials.email },
          include: {
            user_roles: {
              include: {
                role: true,
              },
            },
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
        await prismaForAuth.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          roles: user.user_roles.map((ur) => ur.role.name),
        };
      },
    }),
  ],
  session: {
    strategy: 'database',
    maxAge: parseInt(process.env.SESSION_MAX_AGE_DAYS || '7') * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prismaForAuth.user.findUnique({
          where: { id: user.id },
          include: {
            user_roles: {
              include: {
                role: true,
              },
            },
          },
        });

        session.user.id = user.id;
        session.user.roles = dbUser?.user_roles.map((ur) => ur.role.name) || [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
};

export default authOptions;