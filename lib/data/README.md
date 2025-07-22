# Data Services

This directory contains data service implementations for interacting with the database and cache.

## User Data Service

The User Data Service (`users.ts`) provides CRUD operations for user data with integrated caching.

### Features

- **Full CRUD Operations**: Create, read, update, and delete user records
- **Intelligent Caching**: 10-minute TTL for cached data
- **Cache Invalidation**: Automatic cache invalidation on updates
- **User Search and Filtering**: Filter by role, active status, and text search
- **Role-based Access Control**: Support for user roles and permissions
- **Input Validation**: Validation for email format, name length, and role values
- **Error Handling**: Comprehensive error handling with descriptive messages

### Usage

```typescript
import { UserService } from '@/lib/data/users';

// Get all users
const { users, total, page, limit } = await UserService.getUsers();

// Get users with filtering
const result = await UserService.getUsers({
  role: 'admin',
  search: 'john',
  isActive: true,
  page: 1,
  limit: 10
});

// Get user by ID
const user = await UserService.getUserById('user-id');

// Get user by email
const user = await UserService.getUserByEmail('user@example.com');

// Create user
const newUser = await UserService.createUser({
  email: 'new@example.com',
  name: 'New User',
  role: 'user'
});

// Update user
const updatedUser = await UserService.updateUser('user-id', {
  name: 'Updated Name',
  role: 'admin'
});

// Delete user
await UserService.deleteUser('user-id');

// Authenticate user
const authenticatedUser = await UserService.authenticateUser('user@example.com', 'password');
```

### Caching Strategy

- **Individual Users**: Cached by ID and email
- **User Lists**: Cached with filter parameters
- **Cache Invalidation**: On create/update/delete operations
- **Cache Tags**: Used for bulk invalidation of related data

### API Routes

The User Data Service is used by the following API routes:

- `GET /api/users` - Get all users with optional filtering
- `POST /api/users` - Create a new user
- `GET /api/users/[id]` - Get a specific user by ID
- `PUT /api/users/[id]` - Update a specific user
- `DELETE /api/users/[id]` - Delete a specific user
- `POST /api/auth/login` - Authenticate a user

### Testing

Tests for the User Data Service are located in `__tests__/users.test.ts`. Run the tests with:

```bash
npm test
```