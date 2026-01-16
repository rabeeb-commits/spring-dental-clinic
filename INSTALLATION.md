# Dental Clinic Management App - Installation Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Prerequisites](#prerequisites)
4. [Installation Methods](#installation-methods)
5. [Configuration](#configuration)
6. [First Run](#first-run)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

## Introduction

The Dental Clinic Management App is a comprehensive web application for managing dental clinic operations including patient management, appointments, treatments, billing, and reporting.

### Features
- Patient Management with medical history tracking
- Interactive Dental Charting (FDI notation)
- Appointment Scheduling with calendar views
- Treatment Plans and Procedure Management
- Billing & Invoice Management
- Reports & Analytics
- Role-based Access Control (Admin, Dentist, Receptionist, Assistant)

## System Requirements

### Minimum Hardware Requirements
- **CPU**: 2 GHz dual-core processor or better
- **RAM**: 4 GB minimum (8 GB recommended)
- **Storage**: 2 GB free disk space
- **Network**: Internet connection for initial setup

### Software Requirements
- **Operating System**: Windows 10/11, Linux (Ubuntu 20.04+), or macOS 10.15+
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **PostgreSQL**: Version 12 or higher
- **Web Browser**: Chrome, Firefox, Edge, or Safari (latest versions)

See [REQUIREMENTS.md](REQUIREMENTS.md) for detailed specifications.

## Prerequisites

### Step 1: Install Node.js

1. **Download Node.js**
   - Visit: https://nodejs.org/
   - Download the LTS (Long Term Support) version
   - Choose the installer for your operating system

2. **Install Node.js**
   - **Windows**: Run the downloaded `.msi` installer and follow the wizard
   - **Linux**: 
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```
   - **macOS**: Run the downloaded `.pkg` installer or use Homebrew:
     ```bash
     brew install node@18
     ```

3. **Verify Installation**
   ```bash
   node --version  # Should show v18.x.x or higher
   npm --version   # Should show 9.x.x or higher
   ```

### Step 2: Install PostgreSQL

#### Windows
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user
4. Ensure PostgreSQL service is set to start automatically

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Verify PostgreSQL Installation
```bash
# Windows (PowerShell)
Get-Service -Name postgresql*

# Linux/macOS
sudo systemctl status postgresql
# or
psql --version
```

## Installation Methods

### Method A: Automated Installation (Recommended)

The easiest way to install the application is using our automated installation scripts.

#### Windows
1. Open PowerShell (Run as Administrator recommended)
2. Navigate to the application directory
3. Run the installation script:
   ```powershell
   .\install.ps1
   ```
4. Follow the on-screen prompts
5. The script will:
   - Check prerequisites
   - Install dependencies
   - Set up the database
   - Configure environment variables
   - Run migrations and seed data

#### Linux/macOS
1. Open Terminal
2. Navigate to the application directory
3. Make the script executable:
   ```bash
   chmod +x install.sh
   ```
4. Run the installation script:
   ```bash
   ./install.sh
   ```
5. Follow the on-screen prompts

### Method B: Manual Installation

If you prefer to install manually or the automated script doesn't work:

#### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

#### Step 2: Set Up Database

1. **Create PostgreSQL Database**
   ```bash
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE dental_clinic;
   
   # Exit psql
   \q
   ```

2. **Configure Environment Variables**
   - Copy `backend/.env.example` to `backend/.env`
   - Edit `backend/.env` with your database credentials:
     ```env
     DATABASE_URL="postgresql://postgres:your_password@localhost:5432/dental_clinic?schema=public"
     JWT_SECRET="your-super-secret-jwt-key-change-this"
     JWT_EXPIRES_IN="7d"
     PORT=5000
     NODE_ENV=development
     FRONTEND_URL="http://localhost:5173"
     ```

3. **Run Database Migrations**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   npm run seed
   cd ..
   ```

## Configuration

### Environment Variables

Edit `backend/.env` file with your configuration:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dental_clinic` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key-here` |
| `JWT_EXPIRES_IN` | Token expiration time | `7d` |
| `PORT` | Backend server port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `FRONTEND_URL` | Frontend URL (for CORS) | `http://localhost:5173` |

### Database Configuration

The application uses PostgreSQL. Ensure:
- PostgreSQL service is running
- Database `dental_clinic` exists
- User has proper permissions
- Port 5432 is accessible

### Port Configuration

Default ports:
- **Backend API**: 5000
- **Frontend**: 5173 (development) or served by backend (production)
- **PostgreSQL**: 5432

If ports are in use, change them in:
- Backend: `backend/.env` (PORT)
- Frontend: `frontend/vite.config.ts` (server.port)

## First Run

### Development Mode

1. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on: http://localhost:5000

2. **Start Frontend Server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on: http://localhost:5173

3. **Access Application**
   - Open browser: http://localhost:5173
   - Login with default credentials (see below)

### Production Mode

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Start Server**
   ```bash
   npm start
   ```
   Application will be available at: http://localhost:5000

### Default Login Credentials

After installation, default credentials are created. These are for initial setup only.

**⚠️ IMPORTANT**: 
- Change these passwords immediately after first login
- Create your own users with unique email addresses
- See [User Management Guide](USER_MANAGEMENT.md) for details

**Default Credentials** (for reference - not shown in UI):
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dentalclinic.com | admin123 |
| Dentist | dr.smith@dentalclinic.com | admin123 |
| Receptionist | reception@dentalclinic.com | admin123 |

**Note**: These credentials are not displayed in the application UI for security reasons. Refer to this documentation or your installation notes.

## Production Deployment

### Building for Production

1. **Set Environment to Production**
   ```env
   NODE_ENV=production
   ```

2. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

3. **Build Backend**
   ```bash
   cd backend
   npm run build
   cd ..
   ```

### Running as a Service

#### Windows (Using NSSM)

1. Download NSSM: https://nssm.cc/download
2. Install service:
   ```powershell
   nssm install DentalClinicApp "C:\Program Files\nodejs\node.exe" "C:\path\to\app\backend\dist\server.js"
   nssm set DentalClinicApp AppDirectory "C:\path\to\app\backend"
   nssm start DentalClinicApp
   ```

#### Linux (Using systemd)

Create `/etc/systemd/system/dental-clinic.service`:
```ini
[Unit]
Description=Dental Clinic Management App
After=network.target postgresql.service

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/app/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl enable dental-clinic
sudo systemctl start dental-clinic
```

### Backup Recommendations

1. **Database Backups**
   - Set up automated PostgreSQL backups
   - Store backups securely off-site
   - Test restore procedures regularly

2. **Application Backups**
   - Backup `backend/.env` file
   - Backup uploaded files in `backend/uploads/`
   - Backup log files

3. **Backup Script Example**
   ```bash
   pg_dump -U postgres dental_clinic > backup_$(date +%Y%m%d).sql
   ```

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

**Solutions**:
1. Verify PostgreSQL service is running:
   ```bash
   # Windows
   Get-Service -Name postgresql*
   
   # Linux/macOS
   sudo systemctl status postgresql
   ```

2. Check database credentials in `backend/.env`

3. Verify database exists:
   ```bash
   psql -U postgres -l
   ```

4. Test connection:
   ```bash
   psql -U postgres -d dental_clinic
   ```

### Port Already in Use

**Problem**: Port 5000 or 5173 is already in use

**Solutions**:
1. Find process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Linux/macOS
   lsof -i :5000
   ```

2. Change port in configuration:
   - Backend: Update `PORT` in `backend/.env`
   - Frontend: Update `server.port` in `frontend/vite.config.ts`

### Prisma Issues

**Problem**: Prisma client errors

**Solutions**:
1. Regenerate Prisma client:
   ```bash
   cd backend
   npx prisma generate
   ```

2. Reset database (⚠️ WARNING: Deletes all data):
   ```bash
   npx prisma migrate reset
   ```

3. Check Prisma schema:
   ```bash
   npx prisma validate
   ```

### Permission Issues

**Problem**: Permission denied errors

**Solutions**:
1. **Windows**: Run PowerShell as Administrator
2. **Linux/macOS**: Use `sudo` for system-level operations
3. Check file permissions:
   ```bash
   chmod -R 755 backend/uploads
   ```

### Module Not Found Errors

**Problem**: Cannot find module errors

**Solutions**:
1. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

### Application Won't Start

**Problem**: Application fails to start

**Solutions**:
1. Check logs:
   - Backend: `backend/logs/app-*.log`
   - Frontend: Browser console

2. Verify environment variables:
   ```bash
   # Check if .env file exists
   ls backend/.env
   ```

3. Verify database connection:
   ```bash
   cd backend
   npx prisma studio
   ```

### Log Files

Log files are located in:
- **Backend**: `backend/logs/`
  - `app-YYYY-MM-DD.log` - Application logs
  - `error-YYYY-MM-DD.log` - Error logs

### Getting Help

If you encounter issues not covered here:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review log files for error messages
3. Verify all prerequisites are installed correctly
4. Ensure all environment variables are set correctly

## Next Steps

After successful installation:

1. ✅ Login with default credentials
2. ✅ Change default passwords immediately
3. ✅ Configure clinic settings (Settings → Clinic Information)
4. ✅ Add your staff members (Settings → Users)
5. ✅ Customize procedure types (Procedures)
6. ✅ Set up your first patient
7. ✅ Schedule your first appointment

## Support

For additional help:
- Review this installation guide
- Check [QUICK_START.md](QUICK_START.md) for quick reference
- See [REQUIREMENTS.md](REQUIREMENTS.md) for system requirements

---

**Congratulations!** Your Dental Clinic Management App is now installed and ready to use.
