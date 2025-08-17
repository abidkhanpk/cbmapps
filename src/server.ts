import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcrypt';
import csrf from 'csurf';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';

import { env } from '@/config/env';
import prisma from '@/config/database';
import { requireAuth, optionalAuth } from '@/middlewares/auth';

// Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import orgRoutes from '@/routes/org';
import assetRoutes from '@/routes/assets';
import fmecaRoutes from '@/routes/fmeca';
import libraryRoutes from '@/routes/library';
import cmRoutes from '@/routes/cm';
import actionRoutes from '@/routes/actions';
import uploadRoutes from '@/routes/uploads';
import auditRoutes from '@/routes/audit';
import dashboardRoutes from '@/routes/dashboard';

const app = express();

// Trust proxy for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use(limiter);
app.use('/auth/login', loginLimiter);

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Ensure storage directory exists
const storageDir = path.resolve(env.FILE_STORAGE_DIR);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Session configuration
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    conString: env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
  },
  name: 'fmeca.sid',
}));

// CSRF protection
const csrfProtection = csrf({
  cookie: false, // Use session instead of cookies
});

app.use(csrfProtection);

// Make CSRF token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Make user available to all views
app.use(optionalAuth);
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.hasRole = (roleName: string) => {
    if (!req.user) return false;
    return req.user.userRoles.some(ur => ur.role.name === roleName);
  };
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/users', requireAuth, userRoutes);
app.use('/org', requireAuth, orgRoutes);
app.use('/assets', requireAuth, assetRoutes);
app.use('/fmeca', requireAuth, fmecaRoutes);
app.use('/library', requireAuth, libraryRoutes);
app.use('/cm', requireAuth, cmRoutes);
app.use('/actions', requireAuth, actionRoutes);
app.use('/uploads', requireAuth, uploadRoutes);
app.use('/audit', requireAuth, auditRoutes);
app.use('/dashboard', requireAuth, dashboardRoutes);

// Root route
app.get('/', (req, res) => {
  if (req.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// Health check
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page Not Found',
    error: { status: 404, stack: '' }
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  // CSRF error handling
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', {
      message: 'Invalid CSRF token',
      error: { status: 403, stack: '' }
    });
  }

  const status = err.status || 500;
  const message = env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message;
  
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    res.status(status).json({ error: message });
  } else {
    res.status(status).render('error', {
      message,
      error: env.NODE_ENV === 'production' ? { status, stack: '' } : err
    });
  }
});

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 FMECA Application running on port ${PORT}`);
  console.log(`📊 Environment: ${env.NODE_ENV}`);
  console.log(`🔗 URL: ${env.APP_BASE_URL}`);
});

export default app;
