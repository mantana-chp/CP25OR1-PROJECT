# Backend Project Description for Claude

## PetCare Application - Backend API

A **feature-based modular Node.js/TypeScript backend** for a comprehensive pet health management platform with multi-user collaboration capabilities.

---

## Core Architecture

- **Stack:** Node.js, TypeScript, Express.js, Prisma ORM, PostgreSQL, MinIO (S3-compatible storage)
- **Pattern:** Layered architecture (Controller → Service → Repository → Database) with feature-based modules
- **Auth:** JWT with device-based session management
- **Validation:** Zod schemas with OpenAPI/Swagger documentation

---

## Key Features

### Multi-user Pet Management
Owner/Caregiver role-based access control for shared pet profiles

### Health Tracking
- Health logs
- Medical documents
- Vaccine schedules
- Health insights

### AI Integration
- AI-powered chat assistant for pet health advice
- Automated health tips generation

### Smart Notifications
- Cron-based health insight notifications
- Reminder system with attachments

### File Management
MinIO-based file storage for medical documents and reminder attachments

### Reminder System
Comprehensive reminder management with image attachments and multi-pet support

---

## Current Backend Tasks to Implement

### High Priority
1. **🟡 AI Context Enhancement:** Fix AI chat not having access to shared pet profiles (caregivers' pets not visible to AI)
2. **🟡 Pet Name Validation:** Enforce unique names for active pets while allowing duplicate names for deceased pets
3. **🟡 Vaccine Data Integration:** Include vaccine records in health records endpoint

### Medium Priority
4. **🟡 Multi-device Support:** Enable single user to use multiple devices (similar to caregiver role management)
5. **🟡 Profile Defaults:** Implement default profile color assignment
6. **🟡 Owner Transfer:** Create owner transfer workflow requiring both parties to be active
7. **🟡 Database Seeding:** Prepare comprehensive seed data for testing and development

### Infrastructure
8. **🔵 iOS Deployment:** Build and deployment configuration for iOS platform

---

## Development Conventions

### Naming
- **Database fields:** snake_case
- **API requests/responses:** camelCase
- **Files/folders:** kebab-case

### Access Control
Always validate pet access using `canAccessPet()` utility

### Error Handling
Custom error classes (NotFoundError, BadRequestError, etc.) with centralized middleware

### Response Format
Standardized JSON responses with `sendSuccess()` and `sendError()` utilities

---

## Feature Module Structure

```
{feature}/
├── {feature}-controller.ts    # HTTP layer
├── {feature}-service.ts        # Business logic
├── {feature}-repository.ts     # Database queries
├── {feature}-routes.ts         # Route definitions + OpenAPI docs
├── {feature}-schema.ts         # Zod validation schemas
├── {feature}-mapper.ts         # DB model → DTO transformation
└── {feature}-types.ts          # TypeScript interfaces
```

---

## Tech Stack Details

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

## Project Structure

```
backend/
├── src/
│   ├── features/           # Feature modules
│   │   ├── ai-chat/
│   │   ├── ai-tips-generation/
│   │   ├── auth/
│   │   ├── file-uploads/
│   │   ├── health-insights/
│   │   ├── health-log/
│   │   ├── health-record/
│   │   ├── meta/
│   │   ├── notifications/
│   │   ├── pet-medical-documents/
│   │   ├── pet-sharing/
│   │   ├── pets/
│   │   ├── reminders/
│   │   ├── users/
│   │   └── vaccine-schedule/
│   ├── middlewares/        # Express middlewares
│   ├── shared/             # Shared utilities
│   ├── libs/               # Third-party integrations
│   ├── config/             # Configuration
│   ├── jobs/               # Cron jobs
│   └── routes.ts           # Root router
├── prisma/
│   └── schema.prisma       # Database schema
└── package.json
```

---

## Key Architectural Principles

### Separation of Concerns
- **Controllers** handle HTTP concerns only (request/response)
- **Services** contain business logic
- **Repositories** handle database operations
- **Mappers** transform database models to DTOs
- **Shared utilities** for cross-cutting concerns

### Feature-based Modularity
Each feature is self-contained with all its layers in one directory

### Layered Architecture
Clean boundaries between layers: Controller → Service → Repository → Database

---

## Authentication & Authorization

### Authentication Flow
1. User provides JWT token via `Authorization: Bearer <token>` header
2. `authGuard` middleware verifies token and sets `req.user`
3. Device identification via `X-Installation-Id` header

### Authorization Flow
1. `resolvePetRole` middleware determines user's role (OWNER/CAREGIVER)
2. `requireOwner` middleware restricts access to owners only
3. Service layer validates access using `canAccessPet()` utility

### Permission Matrix
- **OWNER:** Full access to pet data, can delete, can share
- **CAREGIVER:** Read/write access to shared pet data, cannot delete or manage sharing

---

## Important Implementation Notes

### Access Validation Pattern
```typescript
// Always validate pet access in services
const hasAccess = await canAccessPet(petId, userId);
if (!hasAccess) {
  throw new BadRequestError('Access denied to this pet');
}
```

### Transaction Pattern
```typescript
// Use Prisma transactions for multi-step operations
await prisma.$transaction(async (tx) => {
  // Multiple operations here
});
```

### File Upload Pattern
- Files stored in MinIO with generated UUID filenames
- Presigned URLs for secure temporary access
- Proper cleanup on entity deletion

---

## Documentation References

For detailed implementation guidance, see:
- `BACKEND_CONTEXT.md` - Comprehensive development guide
- `SHARED_PET.md` - Pet sharing implementation details
- `AI_CHAT_IMPLEMENTATION.md` - AI chat feature documentation
- `REMINDER_ATTACHMENTS_FEATURE.md` - Reminder attachments implementation
- `HEALTH_INSIGHTS_NOTIFICATION.md` - Notification system details
- `PERMISSIONS_MATRIX.md` - Detailed permission rules
