# PetPal Backend Service

This repository contains the backend service for the PetPal mobile application, a comprehensive solution for pet owners to manage their pets' health and schedules. It is built with Express.js, TypeScript, and Prisma to provide a robust JSON API.

## Core Features

-   **Authentication**: A secure, device-based "1 device, 1 user" authentication system using JWTs (Access & Refresh Tokens).
-   **Pet Profiles**: Create and manage a profile for a user's pet.
-   **Reminders**: Full CRUD functionality for reminders. Supports parent-child relationships for complex reminder chains (e.g., a multi-dose vaccination series).
-   **Vaccine Schedules**: Calculate vaccination schedules based on a pet's species and age.
-   **Health Records**: Automatically generates a health record history from completed health-related reminders.
-   **Notifications**: An integrated system to create and manage notifications based on upcoming reminders.
-   **Localization**: Supports returning data in different languages (e.g., Thai names for species and breeds).

---

## API Documentation

The single source of truth for all API endpoints, their parameters, and response schemas is the live **Swagger UI documentation**.

Once the development server is running, you can access the interactive API documentation at:

**[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

All protected endpoints require an `Authorization: Bearer <token>` header and an `x-installation-id` header, which can be managed directly in the Swagger UI.

---

## Technology Stack

-   **Node.js & Express.js**: For the core web server and API routing.
-   **TypeScript**: For type safety and improved developer experience.
-   **PostgreSQL**: As the relational database.
-   **Prisma**: As the ORM for database access, migrations, and type generation.
-   **Zod**: For robust request validation.
-   **Docker & Docker Compose**: For containerization and production deployment.
-   **Swagger (OpenAPI)**: For live API documentation.

---

## Getting Started (Local Development)

### Prerequisites

-   Node.js (v20 or higher)
-   npm (v10 or higher)
-   Docker and Docker Compose (for running a local PostgreSQL instance)
-   A running PostgreSQL database instance.

### Installation & Setup

1.  **Clone the repository.**

2.  **Set up environment variables:**
    Create a `.env` file by copying the example file. This file is ignored by Git.
    ```bash
    cp .env.example .env
    ```
    Now, edit the `.env` file and add your database connection string and any other required variables. **`DATABASE_URL` is mandatory.**
    ```env
    # Example
    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
    ```

3.  **Install dependencies:**
    This command will install all necessary packages.
    ```bash
    npm install
    ```

4.  **Run database migrations:**
    This command applies the database schema to your database.
    ```bash
    npx prisma migrate dev
    ```

5.  **Start the development server:**
    This starts the server with `nodemon`, which automatically restarts on file changes.
    ```bash
    npm run dev
    ```
    The server will be running at `http://localhost:3000`.

---

## Running in Production with Docker

This project is configured to be built and run using Docker and Docker Compose.

### Prerequisites

-   Docker & Docker Compose installed on your VM or deployment target.
-   A complete and correct `.env` file in the project root on your VM. The `DATABASE_URL` must point to an accessible production database.

### Deployment Steps

1.  **Build the Docker image:**
    This command uses the multi-stage `Dockerfile` to build a lean, production-ready image.
    ```bash
    docker-compose build
    ```

2.  **Run the service:**
    This command starts the backend service in the background. The entrypoint script will automatically run `npx prisma migrate deploy` before starting the application.
    ```bash
    docker-compose up -d
    ```

### Managing the Service

-   **View logs:** `docker-compose logs -f`
-   **Stop the service:** `docker-compose down`
-   **Restart the service:** `docker-compose restart`