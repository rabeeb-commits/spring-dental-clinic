# Quick Start Guide

This guide is for users who are familiar with Node.js and PostgreSQL and want to get started quickly.

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 12+ (running and accessible)
- Database `dental_clinic` created

## Quick Installation

### 1. Install Dependencies

```bash
npm run install-all
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma migrate dev
npm run seed
```

### 4. Start Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

## Access Application

- **Development**: http://localhost:5173
- **Production**: http://localhost:5000

## Default Credentials

**Note**: Default credentials are not shown in the application UI. Refer to [INSTALLATION.md](INSTALLATION.md) for default login credentials.

⚠️ **Change password immediately after first login!**

## Common Commands

```bash
# Install all dependencies
npm run install-all

# Development (both frontend and backend)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database operations
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate      # Run migrations
npm run prisma:studio       # Open Prisma Studio
npm run seed                # Seed database
```

## Troubleshooting

**Database connection error:**
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `backend/.env`
- Ensure database `dental_clinic` exists

**Port already in use:**
- Change `PORT` in `backend/.env`
- Change port in `frontend/vite.config.ts`

**Module not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

For detailed information, see [INSTALLATION.md](INSTALLATION.md).
