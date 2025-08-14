import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || 'supersecret',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'FMECA App <noreply@example.com>',
  fileStorageDir: process.env.FILE_STORAGE_DIR || './storage',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export const prisma = new PrismaClient();
