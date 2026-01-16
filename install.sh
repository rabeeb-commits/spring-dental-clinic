#!/bin/bash

# Dental Clinic Management App - Linux/macOS Installation Script
# Run this script: chmod +x install.sh && ./install.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions for colored output
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${CYAN}$1${NC}"; }

# Check if running as root (not required, but warn)
if [ "$EUID" -eq 0 ]; then 
    print_warning "Running as root. Some operations may require sudo."
fi

echo ""
print_info "=========================================="
print_info "Dental Clinic Management App Installer"
print_info "=========================================="
echo ""

# Step 1: Check Prerequisites
print_info "Step 1: Checking Prerequisites..."
echo ""

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Or use: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Found: $NODE_VERSION"
    exit 1
fi
print_success "Node.js found: $NODE_VERSION"

# Check npm
echo "Checking npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
NPM_MAJOR=$(echo $NPM_VERSION | cut -d. -f1)
if [ "$NPM_MAJOR" -lt 9 ]; then
    print_warning "npm version 9 or higher is recommended. Found: $NPM_VERSION"
fi
print_success "npm found: $NPM_VERSION"

# Check PostgreSQL
echo "Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed"
    echo "Please install PostgreSQL:"
    echo "  Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "  macOS: brew install postgresql@14"
    exit 1
fi

# Check if PostgreSQL is running
if systemctl is-active --quiet postgresql 2>/dev/null || pg_isready -q 2>/dev/null; then
    print_success "PostgreSQL is running"
else
    print_warning "PostgreSQL service may not be running"
    echo "Attempting to start PostgreSQL..."
    if command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql 2>/dev/null || print_warning "Could not start PostgreSQL automatically"
    fi
fi

# Check ports
echo "Checking port availability..."
for port in 5000 5173 5432; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 && [ "$port" != "5432" ]; then
        print_warning "Port $port is in use. You may need to change the configuration."
    fi
done

echo ""
print_success "All prerequisites checked successfully!"
echo ""

# Step 2: Install Dependencies
print_info "Step 2: Installing Dependencies..."
echo ""

echo "Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install root dependencies"
    exit 1
fi
print_success "Root dependencies installed"

echo "Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install backend dependencies"
    exit 1
fi
print_success "Backend dependencies installed"

echo "Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install frontend dependencies"
    exit 1
fi
print_success "Frontend dependencies installed"

cd ..
echo ""

# Step 3: Database Setup
print_info "Step 3: Setting Up Database..."
echo ""

cd backend

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp ".env.example" ".env"
    print_success ".env file created"
    
    print_warning "Please configure database credentials in backend/.env"
    echo ""
    
    read -p "Enter PostgreSQL username (default: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -sp "Enter PostgreSQL password: " DB_PASS
    echo ""
    DB_PASS=${DB_PASS:-postgres}
    
    # Update .env file
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|DATABASE_URL=\".*\"|DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/dental_clinic?schema=public\"|" .env
    else
        # Linux
        sed -i "s|DATABASE_URL=\".*\"|DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/dental_clinic?schema=public\"|" .env
    fi
else
    print_success ".env file already exists"
fi

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    print_error "Failed to generate Prisma client"
    exit 1
fi
print_success "Prisma client generated"

# Check if database exists and create if needed
echo "Checking database..."
export PGPASSWORD=${DB_PASS:-postgres}
if psql -U ${DB_USER:-postgres} -lqt | cut -d \| -f 1 | grep -qw dental_clinic; then
    print_success "Database already exists"
else
    echo "Creating database..."
    psql -U ${DB_USER:-postgres} -c "CREATE DATABASE dental_clinic;" 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Database created"
    else
        print_warning "Could not create database automatically. Please create it manually:"
        echo "  psql -U postgres"
        echo "  CREATE DATABASE dental_clinic;"
    fi
fi
unset PGPASSWORD

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    print_error "Failed to run migrations"
    exit 1
fi
print_success "Migrations completed"

# Seed database
echo "Seeding database with initial data..."
npm run seed
if [ $? -ne 0 ]; then
    print_warning "Database seeding failed or already seeded"
else
    print_success "Database seeded"
fi

cd ..
echo ""

# Step 4: Installation Summary
print_info "=========================================="
print_info "Installation Complete!"
print_info "=========================================="
echo ""

print_success "All dependencies installed"
print_success "Database configured"
print_success "Migrations applied"
print_success "Initial data seeded"
echo ""

print_info "Default Login Credentials:"
echo "  Admin:        admin@dentalclinic.com / admin123"
echo "  Dentist:      dr.smith@dentalclinic.com / admin123"
echo "  Receptionist: reception@dentalclinic.com / admin123"
echo ""
print_warning "⚠ IMPORTANT: Change these passwords after first login!"
echo ""

print_info "To start the application in development mode:"
echo "  npm run dev"
echo ""
echo "Backend will run on: http://localhost:5000"
echo "Frontend will run on: http://localhost:5173"
echo ""

print_info "To start the application in production mode:"
echo "  npm run build"
echo "  npm start"
echo ""
echo "Application will be available at: http://localhost:5000"
echo ""

print_info "For more information, see INSTALLATION.md"
echo ""
