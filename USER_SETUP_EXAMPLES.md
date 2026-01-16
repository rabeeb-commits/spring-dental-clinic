# User Setup Examples

Quick reference examples for setting up users with different roles.

## Using Browser Console (Easiest Method)

1. **Login to the application** as admin
2. **Open Browser Console** (F12 → Console tab)
3. **Get your authentication token**:
   ```javascript
   const token = localStorage.getItem('token');
   console.log('Token:', token);
   ```

4. **Create users** using the examples below:

### Example 1: Create a Dentist

```javascript
const token = localStorage.getItem('token');

fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'dr.john.smith@clinic.com',
    password: 'TempPass123!',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+1-555-0123',
    role: 'DENTIST'
  })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log('✅ Dentist created:', data.data);
    alert('Dentist created successfully!');
  } else {
    console.error('❌ Error:', data.message);
    alert('Error: ' + data.message);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
  alert('Failed to create user');
});
```

### Example 2: Create a Receptionist

```javascript
const token = localStorage.getItem('token');

fetch('/api/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'reception@clinic.com',
    password: 'TempPass123!',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+1-555-0124',
    role: 'RECEPTIONIST'
  })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log('✅ Receptionist created:', data.data);
    alert('Receptionist created successfully!');
  } else {
    console.error('❌ Error:', data.message);
  }
});
```

### Example 3: Create Multiple Users at Once

```javascript
const token = localStorage.getItem('token');

const users = [
  {
    email: 'dr.alice@clinic.com',
    password: 'TempPass123!',
    firstName: 'Alice',
    lastName: 'Johnson',
    phone: '+1-555-0125',
    role: 'DENTIST'
  },
  {
    email: 'dr.bob@clinic.com',
    password: 'TempPass123!',
    firstName: 'Bob',
    lastName: 'Williams',
    phone: '+1-555-0126',
    role: 'DENTIST'
  },
  {
    email: 'frontdesk@clinic.com',
    password: 'TempPass123!',
    firstName: 'Sarah',
    lastName: 'Brown',
    phone: '+1-555-0127',
    role: 'RECEPTIONIST'
  }
];

// Create users one by one
users.forEach((user, index) => {
  setTimeout(() => {
    fetch('/api/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        console.log(`✅ User ${index + 1} created:`, data.data.email);
      } else {
        console.error(`❌ Error creating user ${index + 1}:`, data.message);
      }
    });
  }, index * 500); // Wait 500ms between each request
});
```

## Using cURL (Command Line)

### Windows (PowerShell)

```powershell
# Set your admin token
$token = "YOUR_ADMIN_TOKEN_HERE"

# Create Dentist
$body = @{
    email = "dr.john@clinic.com"
    password = "TempPass123!"
    firstName = "John"
    lastName = "Smith"
    phone = "+1-555-0123"
    role = "DENTIST"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/users" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

### Linux/macOS

```bash
# Set your admin token
TOKEN="YOUR_ADMIN_TOKEN_HERE"

# Create Dentist
curl -X POST http://localhost:5000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.john@clinic.com",
    "password": "TempPass123!",
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+1-555-0123",
    "role": "DENTIST"
  }'
```

## Using Postman

1. **Create a new POST request**
2. **URL**: `http://localhost:5000/api/users`
3. **Headers**:
   - `Authorization`: `Bearer YOUR_TOKEN_HERE`
   - `Content-Type`: `application/json`
4. **Body** (raw JSON):
   ```json
   {
     "email": "dr.john@clinic.com",
     "password": "TempPass123!",
     "firstName": "John",
     "lastName": "Smith",
     "phone": "+1-555-0123",
     "role": "DENTIST"
   }
   ```
5. **Send** the request

## Viewing All Users

### Browser Console

```javascript
const token = localStorage.getItem('token');

fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  console.table(data.data);
  data.data.forEach(user => {
    console.log(`${user.email} - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`);
  });
});
```

## Updating User Role

```javascript
const token = localStorage.getItem('token');
const userId = 'USER_ID_HERE'; // Get from user list

fetch(`/api/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'DENTIST' // Change role
  })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log('✅ User updated:', data.data);
  }
});
```

## Deactivating a User

```javascript
const token = localStorage.getItem('token');
const userId = 'USER_ID_HERE';

fetch(`/api/users/${userId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log('✅ User deactivated');
  }
});
```

## Complete Setup Script

Copy and paste this into browser console to set up a complete clinic:

```javascript
const token = localStorage.getItem('token');

const clinicUsers = [
  // Additional Admin
  {
    email: 'manager@clinic.com',
    password: 'TempPass123!',
    firstName: 'Clinic',
    lastName: 'Manager',
    role: 'ADMIN'
  },
  // Dentists
  {
    email: 'dr.john@clinic.com',
    password: 'TempPass123!',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+1-555-0101',
    role: 'DENTIST'
  },
  {
    email: 'dr.sarah@clinic.com',
    password: 'TempPass123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '+1-555-0102',
    role: 'DENTIST'
  },
  // Receptionists
  {
    email: 'reception@clinic.com',
    password: 'TempPass123!',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+1-555-0103',
    role: 'RECEPTIONIST'
  },
  {
    email: 'frontdesk@clinic.com',
    password: 'TempPass123!',
    firstName: 'Mike',
    lastName: 'Wilson',
    phone: '+1-555-0104',
    role: 'RECEPTIONIST'
  },
  // Assistants
  {
    email: 'assistant1@clinic.com',
    password: 'TempPass123!',
    firstName: 'Emily',
    lastName: 'Brown',
    role: 'ASSISTANT'
  }
];

let created = 0;
let failed = 0;

clinicUsers.forEach((user, index) => {
  setTimeout(() => {
    fetch('/api/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        created++;
        console.log(`✅ [${index + 1}/${clinicUsers.length}] Created: ${user.email} (${user.role})`);
      } else {
        failed++;
        console.error(`❌ [${index + 1}/${clinicUsers.length}] Failed: ${user.email} - ${data.message}`);
      }
      
      // Show summary when done
      if (created + failed === clinicUsers.length) {
        console.log(`\n📊 Summary: ${created} created, ${failed} failed`);
        alert(`Setup complete!\n${created} users created\n${failed} failed`);
      }
    })
    .catch(error => {
      failed++;
      console.error(`❌ [${index + 1}/${clinicUsers.length}] Error: ${user.email}`, error);
    });
  }, index * 300); // 300ms delay between requests
});

console.log('🚀 Starting user creation...');
```

## Getting User Token for API Testing

If you need to test API with a specific user:

1. Login as that user in the browser
2. Open console and run:
   ```javascript
   localStorage.getItem('token');
   ```
3. Copy the token for use in API calls

## Tips

1. **Test in Development First**: Always test user creation in development before production
2. **Use Strong Passwords**: Even for temporary passwords
3. **Verify Emails**: Ensure email addresses are correct and accessible
4. **Document Credentials**: Keep a secure record of initial passwords
5. **Change Passwords**: Ask users to change passwords on first login
6. **Regular Audits**: Review user list monthly and deactivate unused accounts

For detailed information, see [USER_MANAGEMENT.md](USER_MANAGEMENT.md).
