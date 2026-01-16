# User Management Guide

## Overview

This guide explains how to set up users with their own email addresses and assign appropriate roles and permissions in the Dental Clinic Management App.

## User Roles and Permissions

The application has four user roles, each with different permissions:

### 1. ADMIN
**Full System Access**
- ✅ Create, edit, and delete all users
- ✅ Manage all patients, appointments, treatments
- ✅ Access all reports and analytics
- ✅ Manage clinic settings and configuration
- ✅ Access backup and restore functions
- ✅ View system logs
- ✅ Manage procedure types
- ✅ Full billing and invoice management

**Use Case**: Clinic owner, practice manager, or IT administrator

### 2. DENTIST
**Clinical Operations**
- ✅ View and manage own appointments
- ✅ Create and manage treatments
- ✅ Access patient records and dental charts
- ✅ Create diagnoses and update dental charts
- ✅ View and manage invoices for own patients
- ✅ Access reports (limited to own data)
- ❌ Cannot manage other users
- ❌ Cannot access system settings
- ❌ Cannot view logs

**Use Case**: Dentists, orthodontists, oral surgeons

### 3. RECEPTIONIST
**Administrative Operations**
- ✅ Create and manage appointments
- ✅ Register and update patient information
- ✅ Create invoices and record payments
- ✅ View appointment calendar
- ✅ Access patient list and basic information
- ❌ Cannot create treatments
- ❌ Cannot modify dental charts
- ❌ Cannot access reports
- ❌ Cannot manage users

**Use Case**: Front desk staff, appointment schedulers

### 4. ASSISTANT
**Limited Access**
- ✅ View appointments (read-only)
- ✅ View patient information (read-only)
- ✅ Assist with basic operations
- ❌ Cannot create or modify records
- ❌ Cannot access billing
- ❌ Cannot manage appointments

**Use Case**: Dental assistants, support staff

## Setting Up Users

### Method 1: Using the Application (Admin Only)

**Note**: Currently, user management must be done via API. A UI will be added in future updates.

### Method 2: Using API (Recommended for Now)

#### Step 1: Login as Admin

First, login with admin credentials:
- Email: `admin@dentalclinic.com`
- Password: `admin123`

#### Step 2: Create New User via API

You can use any HTTP client (Postman, curl, or browser console) to create users.

**API Endpoint**: `POST /api/users`

**Headers**:
```
Authorization: Bearer <your-admin-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "dentist@clinic.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "role": "DENTIST"
}
```

**Example using curl**:
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dentist@clinic.com",
    "password": "securepassword123",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+1234567890",
    "role": "DENTIST"
  }'
```

**Example using JavaScript (Browser Console)**:
```javascript
// First, get your token from localStorage
const token = localStorage.getItem('token');

// Create user
fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'dentist@clinic.com',
    password: 'securepassword123',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+1234567890',
    role: 'DENTIST'
  })
})
.then(res => res.json())
.then(data => console.log('User created:', data));
```

### Method 3: Using Prisma Studio (Database Direct)

1. **Open Prisma Studio**:
   ```bash
   cd backend
   npm run prisma:studio
   ```

2. **Navigate to Users table**

3. **Click "Add record"**

4. **Fill in the fields**:
   - `email`: User's email address (unique)
   - `password`: Must be hashed with bcrypt (see below)
   - `firstName`: First name
   - `lastName`: Last name
   - `phone`: Phone number (optional)
   - `role`: ADMIN, DENTIST, RECEPTIONIST, or ASSISTANT
   - `isActive`: true

5. **Hash Password**:
   You need to hash the password before saving. Use this Node.js script:
   ```javascript
   const bcrypt = require('bcryptjs');
   const password = 'yourpassword';
   bcrypt.hash(password, 10).then(hash => console.log(hash));
   ```

### Method 4: Using Database Seed Script

Modify `backend/prisma/seed.ts` to add your users, then run:
```bash
cd backend
npm run seed
```

## User Management Operations

### View All Users

**API Endpoint**: `GET /api/users`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `role`: Filter by role (ADMIN, DENTIST, RECEPTIONIST, ASSISTANT)
- `isActive`: Filter by active status (true/false)
- `search`: Search by name or email

**Example**:
```bash
GET /api/users?role=DENTIST&isActive=true
```

### Get User by ID

**API Endpoint**: `GET /api/users/:id`

**Example**:
```bash
GET /api/users/123e4567-e89b-12d3-a456-426614174000
```

### Update User

**API Endpoint**: `PUT /api/users/:id`

**Request Body** (all fields optional):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "DENTIST",
  "isActive": true
}
```

**Note**: 
- Only admins can change user roles
- Users can update their own profile (except role)
- Password cannot be changed via this endpoint (use change-password endpoint)

### Deactivate User

**API Endpoint**: `DELETE /api/users/:id`

**Note**: This deactivates the user (sets `isActive: false`) rather than deleting them. Only admins can deactivate users.

### Change User Password

**API Endpoint**: `PUT /api/auth/change-password`

**Request Body**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## Setting Up Users: Step-by-Step Guide

### Scenario: Setting Up a New Clinic

#### Step 1: Initial Admin Setup

After installation, you have a default admin:
- Email: `admin@dentalclinic.com`
- Password: `admin123`

**⚠️ IMPORTANT**: Change this password immediately!

1. Login with default credentials
2. Go to Settings → Security
3. Change password to a strong password

#### Step 2: Create Additional Admins (Optional)

Create backup admin accounts:

```bash
POST /api/users
{
  "email": "manager@clinic.com",
  "password": "SecurePass123!",
  "firstName": "Clinic",
  "lastName": "Manager",
  "role": "ADMIN"
}
```

#### Step 3: Create Dentist Accounts

For each dentist in your clinic:

```bash
POST /api/users
{
  "email": "dr.john@clinic.com",
  "password": "TempPassword123",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "role": "DENTIST"
}
```

**Best Practice**: 
- Use professional email addresses
- Set temporary passwords
- Ask users to change password on first login
- Use strong passwords (min 8 characters, mix of letters, numbers, symbols)

#### Step 4: Create Receptionist Accounts

For front desk staff:

```bash
POST /api/users
{
  "email": "reception@clinic.com",
  "password": "TempPassword123",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+1234567891",
  "role": "RECEPTIONIST"
}
```

#### Step 5: Create Assistant Accounts (If Needed)

For dental assistants:

```bash
POST /api/users
{
  "email": "assistant@clinic.com",
  "password": "TempPassword123",
  "firstName": "Bob",
  "lastName": "Johnson",
  "role": "ASSISTANT"
}
```

## User Email Best Practices

### Email Format Recommendations

1. **Professional Format**: Use clinic domain
   - `firstname.lastname@clinicname.com`
   - `firstname@clinicname.com`
   - `role.firstname@clinicname.com`

2. **Examples**:
   - Admin: `admin@smiledental.com` or `manager@smiledental.com`
   - Dentist: `dr.smith@smiledental.com` or `john.smith@smiledental.com`
   - Receptionist: `reception@smiledental.com` or `frontdesk@smiledental.com`

3. **Avoid**:
   - Personal email addresses (gmail, yahoo, etc.) for professional accounts
   - Generic names that could be confused
   - Numbers unless necessary (e.g., `john.smith2@clinic.com`)

## Password Management

### Password Requirements

- Minimum 6 characters (recommended: 8+)
- Mix of uppercase, lowercase, numbers, and symbols
- Not easily guessable
- Unique for each user

### Password Reset Workflow

Currently, password reset must be done by admin:

1. Admin can change user password via API (requires backend modification)
2. Or user can change their own password via Settings → Security

**Future Enhancement**: Email-based password reset

## User Account Management

### Activating/Deactivating Users

**Deactivate User** (Admin only):
```bash
DELETE /api/users/:id
```

**Reactivate User** (Update via API):
```bash
PUT /api/users/:id
{
  "isActive": true
}
```

### Viewing User Activity

User login activity is logged in the Activity Logs. Admins can view:
- Login times
- User actions
- System changes

Access via: Settings → Logs (Admin only)

## Common User Setup Scenarios

### Scenario 1: New Dentist Joining

1. Create dentist account with their email
2. Assign DENTIST role
3. Set temporary password
4. Provide login credentials
5. Ask them to change password on first login
6. They can now:
   - View their appointments
   - Access patient records
   - Create treatments
   - Manage their schedule

### Scenario 2: Receptionist Setup

1. Create receptionist account
2. Assign RECEPTIONIST role
3. Set temporary password
4. Provide login credentials
5. They can now:
   - Schedule appointments
   - Register patients
   - Create invoices
   - Manage front desk operations

### Scenario 3: Multiple Admins

1. Create additional admin accounts
2. Assign ADMIN role
3. Each admin has full access
4. Useful for:
   - Backup administrators
   - Practice managers
   - IT staff

## Security Best Practices

1. **Strong Passwords**: Enforce strong password policies
2. **Unique Emails**: Each user must have a unique email
3. **Regular Audits**: Review user list regularly
4. **Deactivate Unused Accounts**: Deactivate accounts for staff who left
5. **Role-Based Access**: Assign minimum required permissions
6. **Change Default Passwords**: Always change default admin password
7. **Monitor Activity**: Review activity logs regularly

## Troubleshooting

### User Cannot Login

1. **Check if account is active**:
   ```bash
   GET /api/users/:id
   ```
   Verify `isActive: true`

2. **Verify email and password**: Ensure correct credentials

3. **Check role**: Ensure user has appropriate role

### Email Already Exists

- Each email must be unique
- Check if user already exists: `GET /api/users?search=email@example.com`
- Use different email or update existing user

### Permission Denied

- Verify user has correct role
- Check if route requires specific permissions
- Admin can access all routes
- Other roles have limited access

## API Reference Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users` | GET | Admin | List all users |
| `/api/users/dentists` | GET | Any | Get all dentists |
| `/api/users/:id` | GET | Self/Admin | Get user details |
| `/api/users` | POST | Admin | Create new user |
| `/api/users/:id` | PUT | Self/Admin | Update user |
| `/api/users/:id` | DELETE | Admin | Deactivate user |
| `/api/auth/change-password` | PUT | Any | Change own password |

## Quick Reference: Role Permissions Matrix

| Feature | ADMIN | DENTIST | RECEPTIONIST | ASSISTANT |
|---------|-------|---------|--------------|-----------|
| User Management | ✅ | ❌ | ❌ | ❌ |
| Patient Management | ✅ | ✅ | ✅ | 👁️ |
| Appointments | ✅ | ✅ (own) | ✅ | 👁️ |
| Treatments | ✅ | ✅ (own) | ❌ | ❌ |
| Dental Charts | ✅ | ✅ | ❌ | 👁️ |
| Invoices/Billing | ✅ | ✅ (own) | ✅ | ❌ |
| Reports | ✅ | ✅ (limited) | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| Logs | ✅ | ❌ | ❌ | ❌ |
| Backup/Restore | ✅ | ❌ | ❌ | ❌ |

Legend: ✅ = Full Access | 👁️ = Read Only | ❌ = No Access

## Next Steps

After setting up users:

1. ✅ All users have unique email addresses
2. ✅ Appropriate roles assigned
3. ✅ Strong passwords set
4. ✅ Users can login successfully
5. ✅ Users understand their permissions
6. ✅ Default admin password changed

For questions or issues, refer to the main [INSTALLATION.md](INSTALLATION.md) guide.
