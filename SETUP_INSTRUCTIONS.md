# Setup Instructions

## Database Setup Required

The application requires PostgreSQL to be running. Please follow these steps:

### Option 1: Using PostgreSQL (Recommended)

1. **Install PostgreSQL** if not already installed:
   - Download from: https://www.postgresql.org/download/windows/
   - Or use: `winget install PostgreSQL.PostgreSQL`

2. **Start PostgreSQL Service**:
   ```powershell
   # Check if PostgreSQL service is running
   Get-Service -Name postgresql*
   
   # Start PostgreSQL service (if not running)
   Start-Service postgresql-x64-16  # Adjust version number as needed
   ```

3. **Create Database**:
   ```powershell
   # Connect to PostgreSQL
   psql -U postgres
   
   # Create database
   CREATE DATABASE dental_clinic;
   
   # Exit psql
   \q
   ```

4. **Update .env file** in `backend/.env` if your PostgreSQL credentials are different:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/dental_clinic?schema=public"
   ```

5. **Run Migrations**:
   ```powershell
   cd backend
   npx prisma migrate dev --name init
   ```

6. **Seed Database**:
   ```powershell
   npm run seed
   ```

### Option 2: Using Docker (Alternative)

If you have Docker installed:

```powershell
# Run PostgreSQL in Docker
docker run --name dental-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=dental_clinic -p 5432:5432 -d postgres

# Then run migrations
cd backend
npx prisma migrate dev --name init
npm run seed
```

## Starting the Application

### Backend Server:
```powershell
cd backend
npm run dev
```
Backend will run on: http://localhost:5000

### Frontend Server:
```powershell
cd frontend
npm run dev
```
Frontend will run on: http://localhost:5173

## Default Login Credentials

After seeding the database, you can login with:

- **Admin**: admin@dentalclinic.com / admin123
- **Dentist**: dr.smith@dentalclinic.com / admin123
- **Receptionist**: reception@dentalclinic.com / admin123

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL service is running
- Check if port 5432 is available
- Verify database credentials in `backend/.env`

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.ts`

### Prisma Issues
- Run `npx prisma generate` to regenerate Prisma client
- Run `npx prisma migrate reset` to reset database (WARNING: deletes all data)


