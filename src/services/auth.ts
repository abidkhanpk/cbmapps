import bcrypt from 'bcrypt';
import { env } from '@/config/env';
import prisma from '@/config/database';
import { UserWithRoles } from '@/types';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async createUser(email: string, password: string, fullName: string, roleNames: string[] = ['viewer']) {
    const passwordHash = await this.hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        userRoles: {
          create: await Promise.all(
            roleNames.map(async (roleName) => {
              const role = await prisma.role.findUnique({ where: { name: roleName } });
              if (!role) throw new Error(`Role ${roleName} not found`);
              return { roleId: role.id };
            })
          ),
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return user as UserWithRoles;
  }

  static async findUserByEmail(email: string): Promise<UserWithRoles | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return user as UserWithRoles | null;
  }

  static async updateLastLogin(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
