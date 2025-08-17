import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(3000),
  DATABASE_URL: z.string(),
  SESSION_SECRET: z.string().min(32),
  APP_BASE_URL: z.string().url(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  FILE_STORAGE_DIR: z.string().default('./storage'),
  BCRYPT_ROUNDS: z.string().transform(Number).default(10),
});

export const env = envSchema.parse(process.env);
