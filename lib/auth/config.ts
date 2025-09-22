import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Create a separate Prisma client for NextAuth (without Accelerate)
const prismaForAuth = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prismaForAuth),
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
    strategy: 'jwt',
    maxAge: parseInt(process.env.SESSION_MAX_AGE_DAYS || '7') * 24 * 60 * 60,
  },
    callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, merge user info into the token
      if (user) {
        token.id = (user as any).id;
        token.roles = (user as any).roles || [];
      }
      // Ensure roles exist on subsequent calls by hydrating from DB if missing
      if (!token.roles && token.id) {
        const dbUser = await prismaForAuth.user.findUnique({
          where: { id: token.id as string },
          include: {
            user_roles: { include: { role: true } },
          },
        });
        token.roles = dbUser?.user_roles.map((ur) => ur.role.name) || [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as string[]) || [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export default authOptions;