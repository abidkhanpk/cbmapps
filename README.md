# FMECA and Condition Monitoring Application

This is a comprehensive web application for managing FMECA (Failure Mode, Effects, and Criticality Analysis) studies and a Condition Monitoring (CM) program.

## Features

- **Asset Register:** Hierarchical structure from company down to component.
- **FMECA Authoring & Execution:** Define failure modes, effects, causes, and calculate RPN (Risk Priority Number).
- **User Management & Authentication:** Role-based access control (RBAC).
- **Action Management:** Assign, track, and manage corrective actions.
- **Audit Trail & Attachments:** Comprehensive logging and file upload capabilities.
- **Reporting & Dashboards:** Visual insights into FMECA and CM data.

## Tech Stack

- **Language:** Node.js (LTS)
- **Framework:** Express 5
- **Views:** EJS (server-rendered)
- **Frontend:** Bootstrap 5.3.x and jQuery 3.7.x (via CDN)
- **ORM:** Prisma (for PostgreSQL)
- **Auth:** `express-session`, `connect-pg-simple`, `bcrypt`, `csurf`, `helmet`
- **Validation:** `zod`
- **Logging:** `morgan`, `pino`
- **File Uploads:** `multer`
- **Email:** `nodemailer`
- **Testing:** Jest, Supertest

## Getting Started

Follow these steps to set up and run the application locally.

### Prerequisites

- Node.js (LTS version, >= 20)
- PostgreSQL database (e.g., using Docker or a cloud service like Neon)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fmeca-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory of the project by copying `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file and update the following variables:

- `DATABASE_URL`: Your PostgreSQL connection string. For local development, it might look like `postgresql://user:password@localhost:5432/fmeca_db?sslmode=disable`. For Neon, ensure `sslmode=require`.
- `SESSION_SECRET`: A long, random string for session encryption.
- `APP_BASE_URL`: The base URL of your application (e.g., `http://localhost:3000`).
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: Your SMTP server details for sending emails (e.g., for user invitations, password resets).
- `FILE_STORAGE_DIR`: Directory for file uploads (default is `./storage`).

### 4. Database Setup

#### Run Prisma Migrations

This will create the necessary tables in your PostgreSQL database.

```bash
npx prisma migrate dev --name initial_setup
```

#### Seed the Database

This will populate your database with initial data, including roles, an admin user, sample assets, and FMECA library data.

```bash
npm run seed
```

**Admin User Credentials:**
- **Email:** `admin@example.com`
- **Password:** `Admin@12345`

### 5. Run the Application

#### Development Mode

```bash
npm run dev
```

This will start the server with `ts-node-dev`, enabling live reloading on code changes.

#### Production Mode

First, build the TypeScript code:

```bash
npm run build
```

Then, start the application:

```bash
npm start
```

### 6. Access the Application

Open your web browser and navigate to `http://localhost:3000` (or the `APP_BASE_URL` you configured).

## Testing

To run unit and integration tests:

```bash
npm test
```

## Linting and Formatting

To lint your code:

```bash
npm run lint
```

To format your code using Prettier:

```bash
npm run format
```

## Deployment (Example for Neon + Render/Fly.io/Railway)

1.  **Create Neon DB:** Sign up for Neon and create a new PostgreSQL database. Copy the connection string, ensuring `sslmode=require` is part of it.
2.  **Set Environment Variables:** Configure the environment variables (`DATABASE_URL`, `SESSION_SECRET`, `APP_BASE_URL`, `SMTP_*`, `NODE_ENV=production`) on your chosen hosting platform (e.g., Render, Fly.io, Railway).
3.  **Run Migrations:** On your hosting platform, configure a build step or a release command to run `npm run migrate` (which executes `prisma migrate deploy`).
4.  **Ensure HTTPS and Secure Cookies:** Most platforms provide HTTPS automatically. Ensure your session cookies are set to `secure` in production (handled by `express-session` when `NODE_ENV` is `production`).
5.  **Health Check:** The application exposes a health check endpoint at `GET /healthz`.

## Project Structure

```
/
├── src/
│   ├── config/             # Environment variables, database configuration
│   ├── middlewares/        # Auth, CSRF, RBAC, error handling
│   ├── routes/             # Express routes definitions
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic, FMECA calculations, actions, uploads, email
│   ├── views/              # EJS templates, partials, layouts
│   ├── public/             # Static assets (CSS, JS)
│   ├── prisma/             # Prisma schema, migrations, seed script
│   ├── types/              # TypeScript custom types/interfaces
│   └── server.ts           # Main application entry point
├── tests/                  # Unit and e2e tests
├── storage/                # Uploaded files (ignored by Git)
├── .env.example            # Example environment variables
├── .env                    # Local environment variables
├── Dockerfile              # Docker build instructions
├── docker-compose.yml      # Docker Compose configuration (optional)
├── Procfile                # Process file for Heroku/similar platforms
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc.js          # Prettier configuration
└── README.md               # Project README
```
