# Pet Health App - Backend Service

This repository contains the backend service for the Pet Health mobile application. It is built with Express.js, TypeScript, and Prisma to provide a robust JSON API for managing pet health data, including reminders for appointments and medications.

## Core Technologies

-   **Node.js & Express.js**: For the core web server and API routing.
-   **TypeScript**: For type safety and improved developer experience.
-   **PostgreSQL**: As the relational database.
-   **Prisma**: As the next-generation ORM for database access and management.
-   **Zod**: For request validation.

## Getting Started

### Prerequisites

-   Node.js (v16 or higher recommended)
-   npm (v8 or higher recommended)
-   PostgreSQL database running and accessible.

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd backend
    ```

2.  **Install dependencies:**
    This command will install all necessary packages and automatically generate the Prisma client.
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the `backend` directory by copying the example file.
    ```bash
    cp .env.example .env
    ```
    Now, edit the `.env` file and add your database connection string:
    ```
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
    ```

4.  **Run database migrations:**
    Apply the database schema to your PostgreSQL database.
    ```bash
    npx prisma migrate dev
    ```

5.  **Start the development server:**
    This will start the server with `nodemon`, which automatically restarts on file changes.
    ```bash
    npm run dev
    ```
    The server will be running at `http://localhost:3000`.

## Available API Endpoints

All endpoints are prefixed with `/v1`.

### Reminders

-   `GET /reminders`: Fetches a list of all reminders.
-   `POST /reminders`: Creates a new reminder.
    -   **Body:**
        ```json
        {
          "reminderName": "string",
          "description": "string" (optional),
          "reminderDate": "YYYY-MM-DD",
          "reminderTime": "HH:mm:ss" (optional)
        }
        ```

## Project Structure

The project follows a feature-based structure, where each feature (e.g., `reminders`, `auth`) contains its own routes, controllers, services, and repository, promoting modularity and separation of concerns.

```
/src
  /features
    /reminders
      - reminder-controller.ts
      - reminder-routes.ts
      - reminder-service.ts
      - reminder-repository.ts
      - reminder-schema.ts
  /middlewares
  /libs
  /shared
  app.ts
  index.ts
.env
prisma/
  - schema.prisma
package.json
README.md
```
