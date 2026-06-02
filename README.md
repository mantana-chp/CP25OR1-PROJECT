# 🐾 PAWMI

PAWMI is a mobile application that helps pet owners track, manage, and maintain their pets' health through reminders, personalized notifications, and AI-assisted health advice in one platform.

---

## Overview

PAWMI focuses on common pet care challenges:

- Missing important health appointments (vaccines, deworming, grooming)
- Scattered or incomplete health records
- Limited access to reliable, quick pet health guidance

The app targets pet owners in Thailand and brings health records, reminders, and guidance into one place.
Our goal is to make pet care simpler, smarter, and more consistent for every owner.

---

## Project Objectives

- Provide a mobile-first experience for storing and managing pet health data
- Offer automated reminders with AI-assisted scheduling
- Deliver personalized notifications for each pet's profile and routine
  -Support shared caregiving and secure ownership transfer
- Keep the system accessible, friendly, and scalable

---

## Feature Scope

- Pet Profile: Create and manage profiles with species, breed, age, weight, vaccines, and treatment history. Owners can add past records and track health changes over time.
- Reminders: Add appointments to an in-app calendar and set custom notifications for each event.
- Automated Health Scheduler: Analyze health history (such as last vaccine date) to suggest the next care schedule. Owners can confirm or adjust the date, then the system creates the reminder.
- Notifications: In-app and push alerts with AI-personalized messaging based on age and breed.
- Pet AI Chatbot: Thai-language assistant for basic health, nutrition, and early symptom guidance before visiting a vet.
- Pet Sharing and Transfer Owner: Share pet profiles with family or caregivers, and transfer full ownership with complete history.

---

## System Architecture

- Frontend: Expo (React Native)
- Backend: Node.js + Express.js
- Database: PostgreSQL
- Storage: MinIO for images and files
- AI Model: Gemma 3
- Containerization: Docker
- OS Environment: Ubuntu (SIT VM)
- Push Notifications: Expo Notifications via FCM and APNs

---

## Repository Structure

- [backend/](backend/) API service, Prisma schema, background jobs, and shared services
- [frontend/](frontend/) Expo app, UI components, assets, and domain logic

---

## Documentation

- [backend/README.md](backend/README.md) Backend setup, environment, and scripts
- [frontend/README.md](frontend/README.md) Mobile app setup and local development
