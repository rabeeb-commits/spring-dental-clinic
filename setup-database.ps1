# PostgreSQL Database Setup Script for Dental Clinic App
# Run this script in PowerShell (may require admin privileges)

Write-Host "=== Dental Clinic Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
$pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue

if (-not $pgService) {
    Write-Host "PostgreSQL is not installed or service not found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install PostgreSQL first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor White
    Write-Host "2. Or use: winget install PostgreSQL.PostgreSQL" -ForegroundColor White
    Write-Host ""
    Write-Host "After installation, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found PostgreSQL service: $($pgService.Name)" -ForegroundColor Green

# Check if service is running
if ($pgService.Status -ne 'Running') {
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    try {
        Start-Service -Name $pgService.Name
        Write-Host "PostgreSQL service started successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to start PostgreSQL service. You may need to run as Administrator." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "PostgreSQL service is already running." -ForegroundColor Green
}

# Check if database exists
Write-Host ""
Write-Host "Checking database connection..." -ForegroundColor Yellow

# Try to connect and create database
$env:PGPASSWORD = "postgres"  # Default password, update if different
$createDbScript = @"
SELECT 1 FROM pg_database WHERE datname = 'dental_clinic';
"@

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Connect to PostgreSQL using: psql -U postgres" -ForegroundColor White
Write-Host "2. Create database: CREATE DATABASE dental_clinic;" -ForegroundColor White
Write-Host "3. Exit: \q" -ForegroundColor White
Write-Host ""
Write-Host "Or if you know the password, run:" -ForegroundColor Yellow
Write-Host 'psql -U postgres -c "CREATE DATABASE dental_clinic;"' -ForegroundColor White
Write-Host ""
Write-Host "After creating the database, run:" -ForegroundColor Cyan
Write-Host "cd backend" -ForegroundColor White
Write-Host "npx prisma migrate dev" -ForegroundColor White
Write-Host "npm run seed" -ForegroundColor White
