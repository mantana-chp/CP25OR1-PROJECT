# Backend Development Context

**Project:** PetCare Application - Backend API
**Last Updated:** March 20, 2026
**Purpose:** Comprehensive guide for implementing features in this backend codebase

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Feature Implementation Pattern](#feature-implementation-pattern)
5. [Database Patterns](#database-patterns)
6. [Authentication & Authorization](#authentication--authorization)
7. [Error Handling](#error-handling)
8. [Request/Response Patterns](#requestresponse-patterns)
9. [File Upload Patterns](#file-upload-patterns)
10. [Validation with Zod](#validation-with-zod)
11. [Naming Conventions](#naming-conventions)
12. [Common Utilities](#common-utilities)
13. [Best Practices](#best-practices)

---

## 🏗️ Architecture Overview

### Pattern
- **Feature-based modular architecture** - Each feature is self-contained
- **Layered architecture** - Controller → Service → Repository → Database
- **Separation of concerns** - Clear boundaries between layers

### Key Principles
- Controllers handle HTTP concerns only (request/response)
- Services contain business logic
- Repositories handle database operations
- Mappers transform database models to DTOs
- Shared utilities for cross-cutting concerns

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Validation | Zod |
| File Storage | MinIO (S3-compatible) |
| Authentication | JWT with device-based sessions |
| API Documentation | Swagger/OpenAPI |

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── features/           # Feature modules
│   │   ├── {feature}/
│   │   │   ├── {feature}-controller.ts
│   │   │   ├── {feature}-service.ts
│   │   │   ├── {feature}-repository.ts
│   │   │   ├── {feature}-routes.ts
│   │   │   ├── {feature}-schema.ts
│   │   │   ├── {feature}-mapper.ts (optional)
│   │   │   └── {feature}-types.ts (optional)
│   ├── middlewares/        # Express middlewares
│   ├── shared/             # Shared utilities
│   │   ├── errors.ts
│   │   ├── response.ts
│   │   ├── asyncHandler.ts
│   │   ├── types.ts
│   │   └── utils.ts
│   ├── libs/               # Third-party integrations
│   │   ├── db.ts
│   │   ├── minio-client.ts
│   │   ├── logger.ts
│   │   └── swagger.ts
│   ├── config/             # Configuration
│   ├── jobs/               # Cron jobs
│   ├── routes.ts           # Root router
│   ├── app.ts              # Express app setup
│   └── index.ts            # Entry point
├── prisma/
│   └── schema.prisma       # Database schema
└── package.json
```

---

## 🔨 Feature Implementation Pattern

### Standard Feature File Structure

When creating a new feature, follow this pattern:

#### 1. **{feature}-types.ts** (optional)
Define TypeScript interfaces and types for the feature.

```typescript
export interface MyFeatureDto {
  id: string;
  userId: string;
  data: string;
  createdAt: Date;
}

export interface CreateMyFeatureInput {
  data: string;
}
```

#### 2. **{feature}-schema.ts**
Define Zod validation schemas for request validation.

```typescript
import { z } from 'zod';

export const createMyFeatureSchema = z.object({
  body: z.object({
    data: z.string().min(1, 'Data is required'),
  }),
});

export const myFeatureIdParamsSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type CreateMyFeaturePayload = z.infer<typeof createMyFeatureSchema.body>;
```

**Pattern Notes:**
- Use camelCase for request body fields
- Use snake_case for database fields
- Export types inferred from schemas using `z.infer<>`
- Validate both body and params when needed

#### 3. **{feature}-repository.ts**
Handle database operations using Prisma.

```typescript
import prisma from '../../libs/db';

export const create = async (data: {
  user_id: string;
  data: string;
}) => {
  return await prisma.my_feature.create({
    data,
  });
};

export const findById = async (id: string) => {
  return await prisma.my_feature.findUnique({
    where: { id },
  });
};

export const findByUserId = async (userId: string) => {
  return await prisma.my_feature.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
};

export const deleteById = async (id: string) => {
  return await prisma.my_feature.delete({
    where: { id },
  });
};
```

**Repository Best Practices:**
- Keep repositories simple - only database queries
- Use descriptive function names (findById, findByUserId, etc.)
- Always use snake_case for database field names
- Use `include` for relations
- Use `select` when you need only specific fields
- Order results appropriately (usually `created_at: 'desc'`)

#### 4. **{feature}-mapper.ts** (optional)
Transform database models to DTOs.

```typescript
import { my_feature } from '../../generated/prisma/client';
import { MyFeatureDto } from './my-feature-types';

export const toDto = (model: my_feature): MyFeatureDto => {
  return {
    id: model.id,
    userId: model.user_id,
    data: model.data,
    createdAt: model.created_at,
  };
};
```

**Mapper Notes:**
- Transform snake_case to camelCase
- Add computed fields if needed
- Keep mappers pure functions

#### 5. **{feature}-service.ts**
Implement business logic.

```typescript
import * as myFeatureRepository from './my-feature-repository';
import { toDto } from './my-feature-mapper';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { canAccessPet } from '../pet-sharing/pet-sharing-repository';
import prisma from '../../libs/db';
import { MyFeatureDto, CreateMyFeatureInput } from './my-feature-types';

export const createMyFeature = async (
  userId: string,
  petId: string,
  input: CreateMyFeatureInput
): Promise<MyFeatureDto> => {
  // 1. Validate access
  const hasAccess = await canAccessPet(petId, userId);
  if (!hasAccess) {
    throw new BadRequestError('Access denied to this pet');
  }

  // 2. Business logic
  const created = await myFeatureRepository.create({
    user_id: userId,
    pet_id: petId,
    data: input.data,
  });

  // 3. Return DTO
  return toDto(created);
};

export const getMyFeature = async (
  id: string,
  userId: string
): Promise<MyFeatureDto> => {
  const feature = await myFeatureRepository.findById(id);

  if (!feature) {
    throw new NotFoundError('Feature not found');
  }

  // Verify access
  if (feature.user_id !== userId) {
    const hasAccess = await canAccessPet(feature.pet_id, userId);
    if (!hasAccess) {
      throw new NotFoundError('Feature not found');
    }
  }

  return toDto(feature);
};

export const deleteMyFeature = async (
  id: string,
  userId: string
): Promise<void> => {
  const feature = await myFeatureRepository.findById(id);

  if (!feature) {
    throw new NotFoundError('Feature not found');
  }

  // Only owner can delete
  if (feature.user_id !== userId) {
    throw new BadRequestError('Only the owner can delete this feature');
  }

  await myFeatureRepository.deleteById(id);
};
```

**Service Layer Best Practices:**
- Always validate access using `canAccessPet()` for pet-related features
- Throw appropriate errors (NotFoundError, BadRequestError, etc.)
- Use transactions for multi-step operations
- Keep services focused on business logic
- Return DTOs, not Prisma models

#### 6. **{feature}-controller.ts**
Handle HTTP requests and responses.

```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/asyncHandler';
import { sendSuccess } from '../../shared/response';
import * as myFeatureService from './my-feature-service';
import {
  createMyFeatureSchema,
  myFeatureIdParamsSchema,
} from './my-feature-schema';

export const createMyFeature = asyncHandler(
  async (req: Request, res: Response) => {
    const { body } = createMyFeatureSchema.parse(req);
    const { id: userId } = req.user!;
    const { petId } = req.params;

    const feature = await myFeatureService.createMyFeature(
      userId,
      petId,
      body
    );

    sendSuccess(res, { feature }, 201);
  }
);

export const getMyFeature = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = myFeatureIdParamsSchema.parse(req.params);
    const { id: userId } = req.user!;

    const feature = await myFeatureService.getMyFeature(id, userId);

    sendSuccess(res, { feature }, 200);
  }
);

export const deleteMyFeature = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = myFeatureIdParamsSchema.parse(req.params);
    const { id: userId } = req.user!;

    await myFeatureService.deleteMyFeature(id, userId);

    sendSuccess(res, undefined, 200);
  }
);
```

**Controller Best Practices:**
- Always wrap with `asyncHandler`
- Validate using Zod schemas
- Extract userId from `req.user!`
- Use `sendSuccess` for responses
- Let errors bubble up to error middleware
- Keep controllers thin - delegate to services

#### 7. **{feature}-routes.ts**
Define Express routes with OpenAPI documentation.

```typescript
import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard';
import { resolvePetRole, requireOwner } from '../../middlewares/resolvePetRole';
import {
  createMyFeature,
  getMyFeature,
  deleteMyFeature,
} from './my-feature-controller';

const myFeatureRoutes = Router();

/**
 * @openapi
 * /pets/{petId}/my-features:
 *   post:
 *     tags: [My Features]
 *     summary: Create a new feature for a pet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: petId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *     responses:
 *       201:
 *         description: Feature created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
myFeatureRoutes.post(
  '/:petId/my-features',
  authGuard,
  resolvePetRole,
  createMyFeature
);

/**
 * @openapi
 * /my-features/{id}:
 *   get:
 *     tags: [My Features]
 *     summary: Get a feature by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Feature retrieved successfully
 *       404:
 *         description: Feature not found
 */
myFeatureRoutes.get(
  '/:id',
  authGuard,
  getMyFeature
);

/**
 * @openapi
 * /my-features/{id}:
 *   delete:
 *     tags: [My Features]
 *     summary: Delete a feature (owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Feature deleted successfully
 *       403:
 *         description: Forbidden - owner only
 *       404:
 *         description: Feature not found
 */
myFeatureRoutes.delete(
  '/:id',
  authGuard,
  deleteMyFeature
);

export default myFeatureRoutes;
```

**Routes Best Practices:**
- All routes require `authGuard`
- Use `resolvePetRole` for pet-related routes
- Use `requireOwner` after `resolvePetRole` for owner-only operations
- Document all routes with OpenAPI comments
- Export as default

#### 8. **Register Routes in src/routes.ts**

```typescript
import myFeatureRoutes from './features/my-feature/my-feature-routes';

// In v1Router setup:
v1Router.use('/my-features', myFeatureRoutes);
// OR for pet-specific routes:
v1Router.use('/pets', myFeatureRoutes); // if routes start with /:petId
```

---

## 💾 Database Patterns

### Prisma Schema Conventions

```prisma
model my_feature {
  id          String   @id @default(uuid()) @db.Uuid
  user_id     String   @db.Uuid
  pet_id      String   @db.Uuid
  data        String   @db.VarChar
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  updated_at  DateTime @updatedAt @db.Timestamptz(6)

  user users @relation(fields: [user_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  pet  pets  @relation(fields: [pet_id], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@index([user_id])
  @@index([pet_id])
}
```

**Schema Conventions:**
- Use **snake_case** for all table and column names
- Use **plural** for table names (e.g., `my_features`, not `my_feature`)
- Always include `id`, `created_at`, `updated_at`
- Use UUID for IDs: `@id @default(uuid()) @db.Uuid`
- Use `@db.Timestamptz(6)` for timestamps
- Add foreign key relations with proper cascade rules
- Add indexes on frequently queried fields

### Common Prisma Patterns

#### Soft Deletes
```prisma
model my_feature {
  deleted_at DateTime? @db.Timestamptz(6)
  // ...
}
```

```typescript
// In repository:
export const findActive = async (userId: string) => {
  return await prisma.my_feature.findMany({
    where: {
      user_id: userId,
      deleted_at: null, // Only active records
    },
  });
};

export const softDelete = async (id: string) => {
  return await prisma.my_feature.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
};
```

#### Transactions
```typescript
export const createWithRelated = async (data: CreateInput) => {
  return await prisma.$transaction(async (tx) => {
    const main = await tx.my_feature.create({
      data: {
        user_id: data.userId,
        data: data.data,
      },
    });

    await tx.related_feature.create({
      data: {
        feature_id: main.id,
        // ...
      },
    });

    return main;
  });
};
```

#### Access Control Queries
```typescript
// Check if user owns the pet OR is an active caregiver
export const findAccessibleByUser = async (userId: string) => {
  return await prisma.my_feature.findMany({
    where: {
      OR: [
        // User owns the pet
        { pets: { user_id: userId } },
        // User is an active caregiver
        { pets: { user_access: { some: { user_id: userId, revoked_at: null } } } },
      ],
    },
    include: {
      pets: true,
    },
  });
};
```

---

## 🔐 Authentication & Authorization

### Authentication Flow

1. **Device-based authentication** using JWT tokens
2. Each token contains `userId` and `installationId`
3. Tokens must match the `X-Installation-Id` header

### Middleware Chain

```typescript
// Basic authentication
router.get('/resource', authGuard, controller);

// Pet-specific route with role resolution
router.get('/pets/:petId/data', authGuard, resolvePetRole, controller);

// Owner-only operation
router.delete('/pets/:petId', authGuard, resolvePetRole, requireOwner, controller);
```

### Middleware Details

#### `authGuard`
- **Location:** `src/middlewares/authGuard.ts`
- **Purpose:** Verify JWT token and set `req.user`
- **Sets:** `req.user = { id: userId }`
- **Requires:** `Authorization: Bearer <token>` header and `X-Installation-Id` header

#### `resolvePetRole`
- **Location:** `src/middlewares/resolvePetRole.ts`
- **Purpose:** Determine user's role for the pet
- **Sets:** `req.petRole = 'OWNER' | 'CAREGIVER'`
- **Requires:** `req.params.petId` or `req.params.id`
- **Must be used after:** `authGuard`

#### `requireOwner`
- **Location:** `src/middlewares/resolvePetRole.ts`
- **Purpose:** Ensure user is the pet owner
- **Throws:** `403 Forbidden` if `req.petRole !== 'OWNER'`
- **Must be used after:** `resolvePetRole`

### Permission Checking in Services

```typescript
import { canAccessPet } from '../pet-sharing/pet-sharing-repository';

// Check if user has access (owner OR active caregiver)
const hasAccess = await canAccessPet(petId, userId);
if (!hasAccess) {
  throw new BadRequestError('Access denied to this pet');
}

// Check if user is the owner
const pet = await prisma.pets.findUnique({
  where: { id: petId },
  select: { user_id: true },
});

const isOwner = pet?.user_id === userId;
if (!isOwner) {
  throw new ForbiddenError('Only the owner can perform this action');
}
```

### Permission Matrix

| Operation | Owner | Caregiver | Auth Required | Middleware |
|-----------|-------|-----------|---------------|------------|
| View pet profile | ✅ | ✅ | Yes | `authGuard`, `resolvePetRole` |
| Edit/delete pet | ✅ | ❌ | Yes | `authGuard`, `resolvePetRole`, `requireOwner` |
| View reminders | ✅ | ✅ | Yes | `authGuard` + service check |
| Create reminder | ✅ | ✅ | Yes | `authGuard` + service check |
| Delete reminder | ✅ | ❌ | Yes | `authGuard` + service check |
| Upload medical docs | ✅ | ✅ | Yes | `authGuard` + service check |
| Delete medical docs | ✅ | Only their own | Yes | `authGuard` + service check |
| Manage caregivers | ✅ | ❌ | Yes | `authGuard`, `resolvePetRole`, `requireOwner` |

---

## ❌ Error Handling

### Custom Error Classes

**Location:** `src/shared/errors.ts`

```typescript
import {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '../../shared/errors';
```

| Error Class | Status Code | Use Case |
|-------------|-------------|----------|
| `BadRequestError` | 400 | Invalid input, validation errors |
| `UnauthorizedError` | 401 | Missing or invalid token |
| `ForbiddenError` | 403 | Insufficient permissions |
| `NotFoundError` | 404 | Resource doesn't exist |
| `ConflictError` | 409 | Resource already exists |
| `ApiError` | Custom | Generic error with custom status |

### Usage in Services

```typescript
// Resource not found
if (!feature) {
  throw new NotFoundError('Feature not found');
}

// Access denied
if (!hasAccess) {
  throw new ForbiddenError('You do not have access to this pet');
}

// Invalid input
if (input.value < 0) {
  throw new BadRequestError('Value must be positive');
}

// Resource conflict
const existing = await repository.findByName(name);
if (existing) {
  throw new ConflictError('Feature with this name already exists');
}

// Custom error
throw new ApiError('Custom error message', 422, [
  { message: 'Detailed error', path: ['field'] }
]);
```

### Zod Validation Errors

Zod validation errors are automatically caught and formatted by the error middleware.

```typescript
import { formatZodError } from '../../shared/errors';

// In controller (automatic via schema.parse):
const { body } = createMyFeatureSchema.parse(req); // Throws formatted error
```

---

## 📨 Request/Response Patterns

### Standard Response Format

All successful responses use this format:

```typescript
import { sendSuccess } from '../../shared/response';

// Success with data
sendSuccess(res, { feature }, 200);

// Success with no data
sendSuccess(res, undefined, 200);

// Success with created resource
sendSuccess(res, { feature }, 201);
```

**Response Structure:**
```json
{
  "status": {
    "code": "success",
    "description": "Success"
  },
  "data": {
    "feature": { ... }
  }
}
```

### Error Response Format

Errors are automatically formatted by the error middleware:

```json
{
  "status": {
    "code": "failure",
    "description": "Feature not found"
  },
  "errors": [
    {
      "message": "Detailed error message",
      "path": ["field", "name"],
      "code": 404
    }
  ]
}
```

### Async Handler

Always wrap async controllers with `asyncHandler`:

```typescript
import { asyncHandler } from '../../shared/asyncHandler';

export const myController = asyncHandler(async (req, res) => {
  // Any thrown error is automatically caught and passed to error middleware
  const result = await service.doSomething();
  sendSuccess(res, { result }, 200);
});
```

---

## 📁 File Upload Patterns

### MinIO Integration

**Location:** `src/libs/minio-client.ts`

#### Object Key Generation

```typescript
import { generateObjectKey } from '../file-uploads/upload-service';

// Generate a unique object key
const objectKey = generateObjectKey(
  'feature-type',  // e.g., 'medical-document', 'profile-image'
  userId,
  petId,          // or reminderId, or any entity ID
  fileName
);

// Result: "feature-type/{userId}/{petId}/{timestamp}-{uuid}-{fileName}"
```

#### Presigned URL Flow

**Two-step upload process:**

1. **Request upload URL** - Client requests presigned PUT URL
2. **Confirm upload** - Client uploads to MinIO, then confirms to save metadata

```typescript
import { minioClient } from '../../libs/minio-client';

// 1. Request presigned PUT URL
export const requestUploadUrl = async (
  userId: string,
  petId: string,
  fileName: string,
  fileType: string
): Promise<{ uploadUrl: string; objectKey: string }> => {
  const objectKey = generateObjectKey('feature', userId, petId, fileName);
  const uploadUrl = await minioClient.generatePresignedPutUrl(
    objectKey,
    300 // 5 minutes expiry
  );

  return { uploadUrl, objectKey };
};

// 2. Save metadata after upload
export const confirmUpload = async (
  userId: string,
  petId: string,
  objectKey: string,
  fileName: string
): Promise<void> => {
  // Verify object exists
  const exists = await minioClient.objectExists(objectKey);
  if (!exists) {
    throw new BadRequestError('File not found in storage');
  }

  // Verify object key format
  const expectedPrefix = `feature/${userId}/${petId}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
    throw new BadRequestError('Invalid object key');
  }

  // Save to database
  await repository.create({
    user_id: userId,
    pet_id: petId,
    object_key: objectKey,
    file_name: fileName,
  });
};
```

#### Presigned GET URLs for Downloads

```typescript
// Generate download URL
const downloadUrl = await minioClient.generatePresignedGetUrl(
  objectKey,
  3600 // 1 hour expiry
);

return {
  id: document.id,
  fileName: document.file_name,
  downloadUrl, // Return to client
};
```

#### Delete Files

```typescript
import { logger } from '../../libs/logger';

// Delete from MinIO (with error handling)
await minioClient.deleteObject(objectKey).catch((err) => {
  logger.warn(`Failed to delete object ${objectKey}: ${err}`);
});

// Delete from database
await repository.deleteById(documentId);
```

### Complete File Upload Example

See `src/features/pet-medical-documents/` for a complete implementation.

---

## ✅ Validation with Zod

### Schema Definition

**Location:** `{feature}-schema.ts`

```typescript
import { z } from 'zod';

// Body validation
export const createMyFeatureSchema = z.object({
  body: z.object({
    data: z.string().min(1, 'Data is required').max(500),
    count: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// Params validation
export const myFeatureIdParamsSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  petId: z.string().uuid('Invalid pet ID'),
});

// Combined validation
export const updateMyFeatureSchema = z.object({
  params: myFeatureIdParamsSchema,
  body: z.object({
    data: z.string().min(1).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

// Type inference
export type CreateMyFeaturePayload = z.infer<typeof createMyFeatureSchema.body>;
export type UpdateMyFeaturePayload = z.infer<typeof updateMyFeatureSchema.body>;
```

### Usage in Controllers

```typescript
// Validate body only
const { body } = createMyFeatureSchema.parse(req);

// Validate params only
const { id, petId } = myFeatureIdParamsSchema.parse(req.params);

// Validate both
const {
  params: { id },
  body
} = updateMyFeatureSchema.parse(req);
```

### Common Zod Patterns

```typescript
// Required string
z.string().min(1, 'Field is required')

// Optional string
z.string().optional()

// String with length constraints
z.string().min(3).max(100)

// Number constraints
z.number().int().positive()
z.number().min(0).max(100)

// UUID validation
z.string().uuid()

// Email validation
z.string().email()

// Date validation
z.string().datetime() // ISO 8601
z.date()

// Enum validation
z.enum(['option1', 'option2', 'option3'])

// Array validation
z.array(z.string())
z.array(z.object({ id: z.string() }))

// Object validation
z.object({
  field1: z.string(),
  field2: z.number(),
})

// Nested validation
z.object({
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
})

// Optional object
z.object({ ... }).optional()

// Array of objects
z.array(z.object({
  name: z.string(),
  value: z.number(),
}))

// At least one element
z.array(z.string()).min(1, 'At least one item required')
```

---

## 🔤 Naming Conventions

### Files and Folders
- **Feature folders:** lowercase with hyphens (e.g., `pet-medical-documents`)
- **Files:** kebab-case matching feature name (e.g., `pet-medical-document-service.ts`)

### Code
- **Interfaces/Types:** PascalCase (e.g., `MyFeatureDto`)
- **Functions:** camelCase (e.g., `createMyFeature`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Database fields:** snake_case (e.g., `user_id`, `created_at`)
- **Request/Response fields:** camelCase (e.g., `userId`, `createdAt`)

### Database
- **Tables:** plural, snake_case (e.g., `my_features`, `pet_medical_documents`)
- **Columns:** snake_case (e.g., `user_id`, `created_at`)
- **Foreign keys:** `{table}_id` (e.g., `pet_id`, `reminder_id`)
- **Junction tables:** `{table1}_{table2}` (e.g., `pet_share_invite_pets`)

### Routes
- **REST conventions:**
  - `GET /resources` - List all
  - `GET /resources/:id` - Get one
  - `POST /resources` - Create
  - `PATCH /resources/:id` - Update
  - `DELETE /resources/:id` - Delete
- **Nested resources:** `/pets/:petId/medical-documents`

---

## 🛠️ Common Utilities

### Database Client
```typescript
import prisma from '../../libs/db';
```

### Logger
```typescript
import { logger } from '../../libs/logger';

logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', { error });
```

### MinIO Client
```typescript
import { minioClient } from '../../libs/minio-client';

await minioClient.generatePresignedPutUrl(objectKey, expirySeconds);
await minioClient.generatePresignedGetUrl(objectKey, expirySeconds);
await minioClient.objectExists(objectKey);
await minioClient.deleteObject(objectKey);
```

### Pet Access Check
```typescript
import { canAccessPet } from '../pet-sharing/pet-sharing-repository';

const hasAccess = await canAccessPet(petId, userId);
```

---

## 🎯 Best Practices

### General
1. **Follow the established patterns** - consistency is key
2. **Keep layers separate** - don't mix concerns
3. **Use TypeScript strictly** - avoid `any`
4. **Handle errors properly** - use custom error classes
5. **Log appropriately** - use the logger, not console.log

### Security
1. **Always validate input** - use Zod schemas
2. **Check permissions** - use `canAccessPet()` for pet-related features
3. **Never trust user input** - sanitize and validate
4. **Use parameterized queries** - Prisma handles this
5. **Verify file uploads** - check object existence before saving metadata

### Performance
1. **Use database indexes** - on frequently queried fields
2. **Fetch only needed fields** - use `select` when appropriate
3. **Use transactions** - for multi-step operations
4. **Optimize queries** - avoid N+1 problems with `include`

### Maintainability
1. **Write self-documenting code** - clear names, simple logic
2. **Add OpenAPI documentation** - for all routes
3. **Keep functions small** - single responsibility
4. **DRY principle** - extract common logic to utilities
5. **Comment complex logic** - but prefer clear code over comments

### Testing Considerations
1. **Services should be testable** - pure business logic
2. **Repositories should be simple** - just database operations
3. **Controllers should be thin** - minimal logic

---

## 📚 Reference Examples

### Complete Feature Implementations

For reference when implementing new features, see:

1. **Simple CRUD:** `src/features/health-record/`
2. **File Uploads:** `src/features/pet-medical-documents/`
3. **Complex Business Logic:** `src/features/reminders/`
4. **Multiple Relations:** `src/features/pet-sharing/`

---

## 🔄 Feature Implementation Checklist

When implementing a new feature:

- [ ] Create feature folder in `src/features/{feature-name}/`
- [ ] Define Prisma schema if needed
- [ ] Run migrations: `npm run prisma:migrate:dev`
- [ ] Create types (`{feature}-types.ts`)
- [ ] Create validation schemas (`{feature}-schema.ts`)
- [ ] Create repository (`{feature}-repository.ts`)
- [ ] Create mapper if needed (`{feature}-mapper.ts`)
- [ ] Create service with business logic (`{feature}-service.ts`)
- [ ] Check permissions using `canAccessPet()` where needed
- [ ] Create controller (`{feature}-controller.ts`)
- [ ] Create routes with OpenAPI docs (`{feature}-routes.ts`)
- [ ] Register routes in `src/routes.ts`
- [ ] Test endpoints manually or with automated tests
- [ ] Update this context if new patterns emerge

---

**This context file should be your primary reference when implementing any new feature in this backend codebase.**
