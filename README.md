# FMECA - Failure Mode, Effects, and Criticality Analysis System

A comprehensive web application for managing FMECA studies and Condition Monitoring (CM) programs built with Next.js 14, TypeScript, and PostgreSQL.

## 🚀 Features

### Core Functionality
- **Asset Register Management**: Complete hierarchical asset management (Company → Site → Area → System → Asset → Component)
- **FMECA Studies**: Create, manage, and execute FMECA studies with automated RPN calculation
- **Condition Monitoring**: Schedule and track CM tasks with multiple techniques (vibration, thermography, oil analysis, etc.)
- **Action Management**: Create, assign, and track corrective actions with due dates and priorities
- **User Management**: Role-based access control with 6 predefined roles
- **Audit Trail**: Comprehensive logging of all system activities
- **File Attachments**: Upload and manage files for various entities
- **Dashboard & Reporting**: Real-time KPIs and visual analytics

### Technical Features
- **Responsive Design**: Mobile-first Bootstrap 5 interface
- **Real-time Updates**: Progressive enhancement with jQuery
- **Security**: CSRF protection, secure sessions, input validation
- **Performance**: Prisma with Accelerate for optimized database queries
- **Scalability**: Modular architecture ready for additional reliability modules

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM + Accelerate
- **Authentication**: NextAuth.js with database sessions
- **Frontend**: Bootstrap 5.3, jQuery 3.7, Chart.js
- **Validation**: Zod schemas
- **Styling**: CSS custom properties with Bootstrap customization
- **Security**: bcrypt password hashing, CSRF protection

## 📋 Prerequisites

- Node.js 20+ LTS
- PostgreSQL database (Neon recommended)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd fmeca-app
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
# Database (Required - Do not change the key name)
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"

# Prisma Accelerate (Optional but recommended)
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=your_api_key"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
SESSION_MAX_AGE_DAYS="7"

# Application
APP_BASE_URL="http://localhost:3000"
NODE_ENV="development"

# Email Configuration (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="FMECA App <noreply@yourcompany.com>"

# File Storage
FILE_STORAGE_DIR="./storage"
```

### 3. Database Setup

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed the database with sample data:

```bash
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and login with:

- **Admin**: admin@example.com / Admin@12345
- **Engineer**: engineer@example.com / Engineer@123  
- **Technician**: technician@example.com / Tech@123

## 🏗 Project Structure

```
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   ├── (dashboard)/              # Main application pages
│   ├── api/                      # API route handlers
│   ├── components/               # Shared React components
│   ├── globals.css               # Global styles
│   └── layout.tsx                # Root layout
├── lib/                          # Shared utilities
│   ├── auth/                     # NextAuth configuration
│   ├── db/                       # Prisma client (with Accelerate)
│   ├── rbac/                     # Role-based access control
│   ├── services/                 # Business logic services
│   └── validation/               # Zod schemas
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Database seeding script
├── public/                       # Static assets
│   └── js/                       # Client-side JavaScript
└── storage/                      # File uploads (gitignored)
```

## 🔐 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management |
| **Reliability Engineer** | Create/edit FMECA studies, manage CM tasks, approve studies |
| **Maintenance Planner** | Plan actions, view FMECA studies, manage due dates |
| **Technician** | Log CM readings, update assigned actions, upload attachments |
| **Manager** | Approve studies, view dashboards, assign actions |
| **Viewer** | Read-only access to all modules |

## 📊 FMECA Workflow

1. **Create Study**: Define scope and assign owner
2. **Add Components**: Select assets and components for analysis
3. **Define Failure Modes**: Use library or create custom failure modes
4. **Rate Items**: Assign severity, occurrence, and detectability ratings (1-10)
5. **Calculate RPN**: Automatic calculation (Severity × Occurrence × Detectability)
6. **Determine Criticality**: Auto-assigned based on configurable thresholds
7. **Recommend Actions**: Suggest CM techniques and corrective actions
8. **Submit for Approval**: Multi-user approval workflow
9. **Generate CM Tasks**: Create scheduled monitoring tasks

## 🔧 Condition Monitoring

### Supported Techniques
- **Vibration Analysis**: Accelerometer-based monitoring
- **Thermography**: Infrared temperature monitoring  
- **Ultrasound**: High-frequency acoustic monitoring
- **Oil Analysis**: Lubricant condition monitoring
- **Visual Inspection**: Manual visual checks
- **Motor Current Analysis**: Electrical signature analysis
- **Acoustic Monitoring**: Sound-based fault detection

### CM Workflow
1. **Create Tasks**: Define monitoring procedures and intervals
2. **Schedule Execution**: Automatic due date calculation
3. **Log Readings**: Record measurement results and status
4. **Trend Analysis**: Track performance over time
5. **Generate Actions**: Create corrective actions for anomalies

## 🚀 Production Deployment

### Database Setup (Neon)
1. Create a Neon PostgreSQL database
2. Copy the connection string to `DATABASE_URL` in your environment
3. Ensure `sslmode=require` is included in the connection string

### Prisma Accelerate (Recommended)
1. Set up Prisma Accelerate in your Prisma Cloud account
2. Add the `PRISMA_ACCELERATE_URL` to your environment variables
3. The application will automatically use the accelerated client

### Environment Variables
Set all required environment variables in your hosting platform:

```bash
DATABASE_URL="postgresql://..."
PRISMA_ACCELERATE_URL="prisma://..."
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="production-secret-key"
# ... other variables
```

### Build and Deploy

```bash
npm run build
npm run migrate
npm run seed
npm start
```

### Health Check
The application includes a health check endpoint at `/api/healthz` that returns `{"status":"ok"}`.

## 🧪 Testing

Run unit tests:
```bash
npm test
```

Run end-to-end tests:
```bash
npm run test:e2e
```

## 📝 API Documentation

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout

### Companies & Assets
- `GET/POST /api/companies` - Manage companies
- `GET/POST /api/sites` - Manage sites
- `GET/POST /api/assets` - Manage assets
- `GET/POST /api/components` - Manage components

### FMECA
- `GET/POST /api/fmeca/studies` - Manage studies
- `GET/POST /api/fmeca/studies/:id/items` - Manage study items
- `POST /api/fmeca/studies/:id/submit` - Submit for approval
- `POST /api/fmeca/studies/:id/approve` - Approve study

### Condition Monitoring
- `GET/POST /api/cm/tasks` - Manage CM tasks
- `GET/POST /api/cm/readings` - Manage readings

### Actions
- `GET/POST /api/actions` - Manage actions
- `POST /api/actions/:id/status` - Update action status
- `POST /api/actions/:id/comment` - Add comment

### File Management
- `POST /api/upload` - Upload files
- `GET /api/file/:id` - Download files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API endpoints and examples

## 🔮 Roadmap

Future enhancements planned:
- **RCM (Reliability Centered Maintenance)** module
- **RBI (Risk Based Inspection)** integration  
- **Predictive Maintenance Analytics** with ML
- **Vibration Diagnostics** advanced analysis
- **Mobile Application** for field technicians
- **Advanced Reporting** with custom dashboards
- **Integration APIs** for CMMS/EAM systems

---

**Built with ❤️ for reliability engineers and maintenance professionals**