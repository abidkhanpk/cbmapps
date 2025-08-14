import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import csurf from 'csurf';
import { config, prisma } from './config'; // Import config and prisma from config/index.ts

const app = express();
const PrismaSessionStore = connectPgSimple(session);

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://code.jquery.com", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'"],
    },
  },
}));

// Logging Middleware
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(session({
  store: new PrismaSessionStore({
    conString: config.databaseUrl, // Your PostgreSQL connection string
    tableName: 'session', // Name of the session table in your DB
    createTableIfMissing: true,
  }),
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: IS_PRODUCTION, // Use secure cookies in production
    sameSite: 'lax',
  },
}));

// CSRF Protection
app.use(csurf());

// Make CSRF token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'FMECA Application' });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Error Handling Middleware (must be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).render('error', { message: 'Invalid CSRF Token' });
  } else {
    console.error(err.stack);
    res.status(500).render('error', { message: 'Something went wrong!' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} in ${NODE_ENV} mode`);
});

export { app, prisma };