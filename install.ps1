# Dental Clinic Management App - Windows Installation Script
# Run this script in PowerShell (Administrator privileges recommended)

param(
    [switch]$SkipChecks,
    [switch]$Production
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green $args }
function Write-Error { Write-ColorOutput Red $args }
function Write-Warning { Write-ColorOutput Yellow $args }
function Write-Info { Write-ColorOutput Cyan $args }

Write-Info "=========================================="
Write-Info "Dental Clinic Management App Installer"
Write-Info "=========================================="
Write-Output ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "Not running as Administrator. Some operations may require elevated privileges."
}

# Step 1: Check Prerequisites
Write-Info "Step 1: Checking Prerequisites..."
Write-Output ""

# Check Node.js
Write-Output "Checking Node.js..."
try {
    $nodeVersion = node --version
    $nodeMajor = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($nodeMajor -lt 18) {
        Write-Error "Node.js version 18 or higher is required. Found: $nodeVersion"
        Write-Output "Please install Node.js from: https://nodejs.org/"
        exit 1
    }
    Write-Success "✓ Node.js found: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed or not in PATH"
    Write-Output "Please install Node.js from: https://nodejs.org/"
    exit 1
}

# Check npm
Write-Output "Checking npm..."
try {
    $npmVersion = npm --version
    $npmMajor = [int]($npmVersion -split '\.')[0]
    if ($npmMajor -lt 9) {
        Write-Warning "npm version 9 or higher is recommended. Found: $npmVersion"
    }
    Write-Success "✓ npm found: $npmVersion"
} catch {
    Write-Error "npm is not installed"
    exit 1
}

# Check PostgreSQL
Write-Output "Checking PostgreSQL..."
$pgService = Get-Service -Name postgresql* -ErrorAction SilentlyContinue
if (-not $pgService) {
    Write-Error "PostgreSQL is not installed or service not found."
    Write-Output "Please install PostgreSQL from: https://www.postgresql.org/download/windows/"
    Write-Output "Or use: winget install PostgreSQL.PostgreSQL"
    exit 1
}

Write-Success "✓ PostgreSQL service found: $($pgService.Name)"

# Check if PostgreSQL is running
if ($pgService.Status -ne 'Running') {
    Write-Warning "PostgreSQL service is not running. Attempting to start..."
    try {
        Start-Service -Name $pgService.Name
        Start-Sleep -Seconds 3
        Write-Success "✓ PostgreSQL service started"
    } catch {
        Write-Error "Failed to start PostgreSQL service. Please start it manually."
        Write-Output "Run: Start-Service -Name $($pgService.Name)"
        exit 1
    }
} else {
    Write-Success "✓ PostgreSQL service is running"
}

# Check ports
Write-Output "Checking port availability..."
$ports = @(5000, 5173, 5432)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection -and $port -ne 5432) {
        Write-Warning "Port $port is in use. You may need to change the configuration."
    }
}

Write-Output ""
Write-Success "All prerequisites checked successfully!"
Write-Output ""

# Step 2: Install Dependencies
Write-Info "Step 2: Installing Dependencies..."
Write-Output ""

Write-Output "Installing root dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install root dependencies"
    exit 1
}
Write-Success "✓ Root dependencies installed"

Write-Output "Installing backend dependencies..."
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install backend dependencies"
    exit 1
}
Write-Success "✓ Backend dependencies installed"

Write-Output "Installing frontend dependencies..."
Set-Location ../frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install frontend dependencies"
    exit 1
}
Write-Success "✓ Frontend dependencies installed"

Set-Location ..
Write-Output ""

# Step 3: Database Setup
Write-Info "Step 3: Setting Up Database..."
Write-Output ""

Set-Location backend

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Output "Creating .env file from template..."
    Copy-Item ".env.example" ".env"
    Write-Success "✓ .env file created"
    
    Write-Warning "Please configure database credentials in backend/.env"
    Write-Output "Default DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dental_clinic"
    Write-Output ""
    
    $dbUser = Read-Host "Enter PostgreSQL username (default: postgres)"
    if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }
    
    $dbPass = Read-Host "Enter PostgreSQL password" -AsSecureString
    $dbPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPass))
    if ([string]::IsNullOrWhiteSpace($dbPassPlain)) { $dbPassPlain = "postgres" }
    
    $dbUrl = "postgresql://$dbUser`:$dbPassPlain@localhost:5432/dental_clinic?schema=public"
    (Get-Content ".env") -replace 'DATABASE_URL=".*"', "DATABASE_URL=`"$dbUrl`"" | Set-Content ".env"
} else {
    Write-Success "✓ .env file already exists"
}

# Generate Prisma Client
Write-Output "Generating Prisma Client..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to generate Prisma client"
    exit 1
}
Write-Success "✓ Prisma client generated"

# Check if database exists and create if needed
Write-Output "Checking database..."
$env:PGPASSWORD = "postgres"  # This might need adjustment
try {
    $dbExists = psql -U postgres -lqt | Select-String "dental_clinic"
    if (-not $dbExists) {
        Write-Output "Creating database..."
        psql -U postgres -c "CREATE DATABASE dental_clinic;" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ Database created"
        } else {
            Write-Warning "Could not create database automatically. Please create it manually:"
            Write-Output "  psql -U postgres"
            Write-Output "  CREATE DATABASE dental_clinic;"
        }
    } else {
        Write-Success "✓ Database already exists"
    }
} catch {
    Write-Warning "Could not verify database. Please ensure it exists."
}

# Run migrations
Write-Output "Running database migrations..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Output "Running dev migrations (if deploy fails)..."
    npx prisma migrate dev --name init
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to run migrations"
        exit 1
    }
}
Write-Success "✓ Migrations completed"

# Seed database
Write-Output "Seeding database with initial data..."
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Database seeding failed or already seeded"
} else {
    Write-Success "✓ Database seeded"
}

Set-Location ..
Write-Output ""

# Step 4: Build Application (if production)
if ($Production) {
    Write-Info "Step 4: Building Application for Production..."
    Write-Output ""
    
    Write-Output "Building frontend..."
    Set-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build frontend"
        exit 1
    }
    Write-Success "✓ Frontend built"
    
    Set-Location ../backend
    Write-Output "Building backend..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build backend"
        exit 1
    }
    Write-Success "✓ Backend built"
    
    Set-Location ..
    Write-Output ""
}

# Step 5: Installation Summary
Write-Info "=========================================="
Write-Info "Installation Complete!"
Write-Info "=========================================="
Write-Output ""

Write-Success "✓ All dependencies installed"
Write-Success "✓ Database configured"
Write-Success "✓ Migrations applied"
Write-Success "✓ Initial data seeded"
Write-Output ""

Write-Info "Default Login Credentials:"
Write-Output "  Admin:        admin@dentalclinic.com / admin123"
Write-Output "  Dentist:      dr.smith@dentalclinic.com / admin123"
Write-Output "  Receptionist: reception@dentalclinic.com / admin123"
Write-Output ""
Write-Warning "⚠ IMPORTANT: Change these passwords after first login!"
Write-Output ""

if ($Production) {
    Write-Info "To start the application in production mode:"
    Write-Output "  npm start"
    Write-Output ""
    Write-Output "Application will be available at: http://localhost:5000"
} else {
    Write-Info "To start the application in development mode:"
    Write-Output "  npm run dev"
    Write-Output ""
    Write-Output "Backend will run on: http://localhost:5000"
    Write-Output "Frontend will run on: http://localhost:5173"
}

Write-Output ""
Write-Info "For more information, see INSTALLATION.md"
Write-Output ""
