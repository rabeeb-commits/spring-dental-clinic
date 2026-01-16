# 🦷 Dental Clinic Management App

A comprehensive, modern web application for managing dental clinic operations including patient management, appointments, treatments, billing, and reporting.

## 🚀 Quick Start

**New to the application?** Start here:
- 📖 [Installation Guide](INSTALLATION.md) - Complete step-by-step installation instructions
- ⚡ [Quick Start Guide](QUICK_START.md) - For experienced users
- 📋 [System Requirements](REQUIREMENTS.md) - Check if your system is compatible

**Automated Installation:**
- **Windows**: Run `.\install.ps1` in PowerShell
- **Linux/macOS**: Run `./install.sh` in Terminal

## Features

### Core Modules
- **Patient Management**: Register patients, track medical history, manage profiles
- **Dental Charting**: Interactive FDI tooth chart with status tracking
- **Appointments**: Calendar-based scheduling with day/week views
- **Treatments**: Create treatment plans with procedures and cost estimation
- **Billing & Invoices**: Generate invoices, track payments, manage outstanding balances
- **Reports & Analytics**: Revenue, treatment, patient, and appointment statistics

### Technical Features
- Role-based access control (Admin, Dentist, Receptionist, Assistant)
- Responsive design for desktop and mobile
- Real-time data updates
- Secure JWT authentication
- RESTful API architecture

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **File Upload**: Multer

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context
- **Forms**: React Hook Form
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Date Handling**: date-fns

## Getting Started

> **📚 For detailed installation instructions, see [INSTALLATION.md](INSTALLATION.md)**

### Prerequisites
- Node.js 18 or higher ([Download](https://nodejs.org/))
- PostgreSQL 12 or higher ([Download](https://www.postgresql.org/download/))
- npm 9 or higher (comes with Node.js)

### Quick Installation

**Option 1: Automated (Recommended)**
```bash
# Windows
.\install.ps1

# Linux/macOS
chmod +x install.sh
./install.sh
```

**Option 2: Manual Setup**

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/dental_clinic?schema=public"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL="http://localhost:5173"
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Seed the database with initial data:
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@dentalclinic.com | admin123 |
| Dentist | dr.smith@dentalclinic.com | admin123 |
| Receptionist | reception@dentalclinic.com | admin123 |

⚠️ **IMPORTANT**: Change these passwords immediately after first login!

### Setting Up Your Own Users

After installation, create users with their own email addresses and assign roles:

**Quick Setup** (Browser Console):
1. Login as admin
2. Open browser console (F12)
3. Copy code from [USER_SETUP_EXAMPLES.md](USER_SETUP_EXAMPLES.md)
4. Paste and run to create users

**Roles Available**:
- **ADMIN**: Full system access
- **DENTIST**: Clinical operations (appointments, treatments, patient records)
- **RECEPTIONIST**: Administrative tasks (appointments, patients, billing)
- **ASSISTANT**: Read-only access

See [USER_MANAGEMENT.md](USER_MANAGEMENT.md) for complete guide on:
- Creating users with custom emails
- Role permissions and access levels
- User management operations
- Security best practices

## 📚 Documentation

- [Installation Guide](INSTALLATION.md) - Complete installation instructions
- [Quick Start Guide](QUICK_START.md) - Quick reference for experienced users
- [System Requirements](REQUIREMENTS.md) - Detailed system specifications
- [Setup Instructions](SETUP_INSTRUCTIONS.md) - Database setup details
- [User Management Guide](USER_MANAGEMENT.md) - How to set up users with emails and permissions
- [User Setup Examples](USER_SETUP_EXAMPLES.md) - Quick examples for creating users

## Project Structure

```
dental-app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Database seeder
│   ├── src/
│   │   ├── middleware/      # Auth & upload middleware
│   │   ├── routes/          # API routes
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helper functions
│   │   └── server.ts        # Express app entry
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React context providers
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Patients
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Deactivate patient

### Appointments
- `GET /api/appointments` - List appointments
- `GET /api/appointments/calendar` - Get calendar view
- `GET /api/appointments/today` - Get today's appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `PUT /api/appointments/:id/status` - Update status

### Treatments
- `GET /api/treatments` - List treatments
- `POST /api/treatments` - Create treatment plan
- `PUT /api/treatments/:id/status` - Update status

### Billing
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/payments` - Record payment

### Reports
- `GET /api/reports/dashboard` - Dashboard summary
- `GET /api/reports/revenue` - Revenue report
- `GET /api/reports/treatments` - Treatment statistics
- `GET /api/reports/patients` - Patient statistics

## Database Schema

Key entities:
- **User**: Staff members (Admin, Dentist, Receptionist, Assistant)
- **Patient**: Patient demographics and contact info
- **MedicalHistory**: Allergies, chronic diseases, medications
- **DentalChart**: Tooth status mapping (versioned)
- **Disease**: Disease/condition definitions
- **Diagnosis**: Patient diagnoses linked to teeth
- **ProcedureType**: Dental procedure catalog
- **Treatment**: Treatment plans
- **TreatmentProcedure**: Individual procedures in treatments
- **Appointment**: Scheduled appointments
- **Invoice**: Billing records
- **Payment**: Payment transactions
- **Document**: X-rays, scans, prescriptions

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention (via Prisma)
- CORS configuration

## License

MIT License

## Support

For issues or questions, please create an issue in the repository.



