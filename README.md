# FMECA Web Application

A complete, production-ready web application for performing Failure Mode, Effects, and Criticality Analysis (FMECA) to implement and manage Condition Monitoring (CM) programs.

## 🚀 Features

### Core Functionality
- **Asset Register Management**: Complete hierarchy from company → site → area → system → asset → component
- **FMECA Authoring & Execution**: Comprehensive failure mode analysis with RPN calculations
- **User Management & Authentication**: Role-based access control with secure session management
- **Action Management**: Assignment workflow with owners, due dates, and status tracking
- **Condition Monitoring**: Task scheduling and readings management
- **Audit Trail**: Complete activity logging with attachments support
- **Reporting & Dashboards**: KPIs, charts, and comprehensive reporting

### Technical Features
- **Server-Side Rendering**: EJS templates with Bootstrap 5 UI
- **Responsive Design**: Mobile-friendly interface
- **Security**: CSRF protection, secure sessions, input validation
- **File Uploads**: Attachment management with security checks
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest unit tests with >80% coverage
- **Docker Support**: Complete containerization setup

## 🛠 Tech Stack

- **Backend**: Node.js 20+ with Express 5
- **Database**: PostgreSQL (Neon compatible)
- **ORM**: Prisma with migrations
- **Frontend**: EJS templates, Bootstrap 5.3, jQuery 3.7
- **Authentication**: express-session with PostgreSQL store
- **Security**: Helmet, CSRF protection, bcrypt
- **Validation**: Zod schemas
- **Testing**: Jest + Supertest
- **Deployment**: Docker, Heroku/Railway ready

## 📋 Prerequisites

- Node.js 20.0.0 or higher
- PostgreSQL 13+ (or Neon database)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install


git clone <repository-url>
cd fmeca-app
npm install


### 2. Environment Setup

Copy the example environment file and configure:


cp .env.example .env


Edit `.env` with your database connection and other settings:


DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"
SESSION_SECRET="your-super-secret-session-key-change-this-in-production"
APP_BASE_URL="http://localhost:3000"


### 3. Database Setup


# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npm run seed


### 4. Start Development Server


npm run dev


Visit `http://localhost:3000` and login with:
- **Admin**: admin@example.com / Admin@12345
- **Engineer**: engineer@example.com / Engineer@123
- **Technician**: technician@example.com / Tech@123

## 🏗 Project Structure


├── src/
│   ├── config/          # Database and environment configuration
│   ├── controllers/     # Route controllers (future expansion)
│   ├── middlewares/     # Authentication, RBAC, security
│   ├── routes/          # Express route definitions
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   └── server.ts        # Main application entry point
├── views/               # EJS templates
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard views
│   ├── users/          # User management
│   ├── assets/         # Asset management
│   ├── fmeca/          # FMECA studies
│   ├── actions/        # Action management
│   └── layout.ejs      # Main layout template
├── public/             # Static assets
│   ├── css/           # Custom stylesheets
│   └── js/            # Client-side JavaScript
├── prisma/            # Database schema and migrations
├── tests/             # Test files
├── storage/           # File uploads (gitignored)
└── docker-compose.yml # Docker configuration


## 🔐 User Roles & Permissions

### Role Hierarchy
- **Admin**: Full system access, user management
- **Reliability Engineer**: FMECA management, CM tasks, approvals
- **Maintenance Planner**: Action planning, scheduling
- **Manager**: Study approvals, dashboard access
- **Technician**: CM readings, action updates
- **Viewer**: Read-only access

### Permission Matrix
| Feature | Admin | Engineer | Planner | Manager | Technician | Viewer |
|---------|-------|----------|---------|---------|------------|--------|
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| FMECA Studies | ✅ | ✅ | 👁 | 👁 | 👁 | 👁 |
| Study Approval | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| CM Tasks | ✅ | ✅ | 👁 | 👁 | 👁 | 👁 |
| CM Readings | ✅ | ✅ | 👁 | 👁 | ✅ | 👁 |
| Actions | ✅ | ✅ | ✅ | ✅ | ✅* | 👁 |
| Audit Logs | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

*Technicians can only update assigned actions

## 📊 FMECA Methodology

### RPN Calculation
Risk Priority Number (RPN) = Severity × Occurrence × Detectability

### Criticality Classification
- **Low**: RPN 1-99 (Green)
- **Medium**: RPN 100-199 (Amber)  
- **High**: RPN 200-1000 (Red)

### Rating Scales
All dimensions use 1-10 scales:
- **Severity**: Impact of failure (1=Negligible, 10=Catastrophic)
- **Occurrence**: Likelihood of failure (1=Remote, 10=Very High)
- **Detectability**: Ability to detect before failure (1=Very High, 10=Absolute Uncertainty)

## 🧪 Testing

Run the test suite:


# Unit tests
npm test

# Test with coverage
npm run test:coverage

# Watch mode
npm run test:watch


## 🚀 Deployment

### Using Docker


# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t fmeca-app .
docker run -p 3000:3000 fmeca-app


### Neon PostgreSQL Setup

1. Create a Neon database at [neon.tech](https://neon.tech)
2. Copy the connection string (ensure `sslmode=require`)
3. Set `DATABASE_URL` in your environment
4. Run migrations: `npm run migrate`
5. Seed data: `npm run seed`

### Production Deployment

#### Heroku/Railway
1. Set environment variables
2. Enable automatic deployments
3. The `Procfile` handles migrations and seeding

#### Manual Deployment

# Build application
npm run build

# Run migrations
npm run migrate

# Seed database (optional)
npm run seed

# Start production server
npm start


## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SESSION_SECRET` | Session encryption key | Required |
| `APP_BASE_URL` | Application base URL | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `SMTP_*` | Email configuration | Optional |
| `FILE_STORAGE_DIR` | Upload directory | `./storage` |

### Security Features

- **CSRF Protection**: All forms protected with CSRF tokens
- **Session Security**: HTTP-only, secure cookies with PostgreSQL storage
- **Password Hashing**: bcrypt with configurable rounds
- **Input Validation**: Zod schemas for all inputs
- **File Upload Security**: Type validation and size limits
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: Helmet security headers

## 📈 Monitoring & Maintenance

### Health Check
- Endpoint: `GET /healthz`
- Returns: `{"status": "ok", "timestamp": "..."}`

### Audit Logging
All user actions are automatically logged:
- User authentication events
- Data modifications
- File uploads
- Administrative actions

### Database Maintenance

# View migration status
npx prisma migrate status

# Reset database (development only)
npx prisma migrate reset

# Generate new migration
npx prisma migrate dev --name description


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Maintain >80% test coverage
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Update documentation for new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Issues**
- Ensure PostgreSQL is running
- Check connection string format
- Verify SSL requirements for Neon

**Session Issues**
- Check `SESSION_SECRET` is set
- Verify PostgreSQL session table exists
- Clear browser cookies

**File Upload Issues**
- Check `FILE_STORAGE_DIR` permissions
- Verify disk space availability
- Review file type restrictions

### Getting Help
- Check the [Issues](../../issues) page
- Review the [Wiki](../../wiki) for detailed guides
- Contact the development team

## 🎯 Roadmap

- [ ] Advanced reporting and analytics
- [ ] Mobile app companion
- [ ] API documentation with Swagger
- [ ] Advanced workflow automation
- [ ] Integration with CMMS systems
- [ ] Multi-language support
- [ ] Advanced file storage (S3 integration)
- [ ] Real-time notifications
- [ ] Advanced user preferences
- [ ] Bulk data import/export

---

**Built with ❤️ for reliability engineers and maintenance professionals**

