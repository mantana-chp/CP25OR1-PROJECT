import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { PrismaClient, Prisma } from '../src/generated/prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Seed species
  await prisma.species.createMany({
    data: [
      { id: 'c2e1a8d5-3b7f-4c6e-9a1d-8f2b0c5e7a4d', name: 'dog', description: 'Domestic dog' },
      { id: '5e8b3d1f-7c4a-4e8b-9a2d-6f1c0e3b7a5d', name: 'cat', description: 'Domestic cat' },
      { id: '8a4d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', name: 'rabbit', description: 'Small herbivorous mammal' },
      { id: 'b6d1e8a9-3c5f-4e7b-9a2d-8f1c0e3b7a4d', name: 'bird', description: 'Pet bird species' },
      { id: 'e9f2c1a8-7d4b-4f6e-8a3c-5d1e8b7a0c2f', name: 'hamster', description: 'Small rodent pet' },
    ],
    skipDuplicates: true,
  });

  // Seed breeds
  await prisma.breeds.createMany({
    data: [
      { id: '1d9a3e2f-8b4c-4a7d-9e1f-6c0b5e8a3d7f', species_id: 'c2e1a8d5-3b7f-4c6e-9a1d-8f2b0c5e7a4d', name: 'Pomeranian', description: 'Small fluffy dog' },
      { id: '3f6c8a1e-5d2b-4e9a-8c4f-1b7d0a5e9c3f', species_id: 'c2e1a8d5-3b7f-4c6e-9a1d-8f2b0c5e7a4d', name: 'Golden Retriever', description: 'Friendly large breed' },
      { id: '6a8d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', species_id: '5e8b3d1f-7c4a-4e8b-9a2d-6f1c0e3b7a5d', name: 'Siamese', description: 'Elegant short-haired cat' },
      { id: '8c1f0a3e-7d4b-4f6e-9a2c-5d1e8b7a0c3f', species_id: '8a4d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', name: 'Holland Lop', description: 'Mini rabbit with floppy ears' },
      { id: 'a2e3b8d5-1c7f-4e9a-8b4d-6f2c0e3b7a5d', species_id: 'b6d1e8a9-3c5f-4e7b-9a2d-8f1c0e3b7a4d', name: 'Cockatiel', description: 'Popular small parrot' },
    ],
    skipDuplicates: true,
  });

  // Seed users
  await prisma.users.createMany({
    data: [
      { id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', status: 'active', current_installation_id: '6f8b1c7a-4a2d-4f1e-8b4c-9a1d3f0e8b2a', current_platform: 'ios', current_platform_device_id: 'f1e8b2a1-c7d3-4a4d-9f0e-3a4d6b8c0a3d', current_platform_id_source: 'ios_keychain', created_at: new Date('2025-11-06T10:10:49.860114Z'), updated_at: new Date('2025-11-06T10:10:49.860114Z'), last_active_at: new Date('2025-11-06T10:10:49.860114Z') },
      { id: '9c7a4f1e-6d2f-4a8b-9e3d-1a4f0c8e3b2a', status: 'active', current_installation_id: '9e1f3a4d-6b8c-4f7d-8b2a-1c7d0a3f1e8b', current_platform: 'ios', current_platform_device_id: 'c7d3a4d6-b8c0-4f0e-8b2a-1c7d3a4d6f0e', current_platform_id_source: 'ios_keychain', created_at: new Date('2025-11-06T10:10:49.860114Z'), updated_at: new Date('2025-11-06T10:10:49.860114Z'), last_active_at: new Date('2025-11-06T10:10:49.860114Z') },
      { id: 'd3f9e8a1-5b2c-4f8e-8a6d-9c3b1e7f2a4d', status: 'disabled', current_installation_id: '0a3f1e8b-2a4c-4d7f-9e1f-3a4d6b8c0a3d', current_platform: 'android', current_platform_device_id: '4a4d6b8c-0a3d-4f0e-9e1f-3a4d6b8c0a3d', current_platform_id_source: 'android_ssaid', created_at: new Date('2025-11-06T10:10:49.860114Z'), updated_at: new Date('2025-11-06T10:10:49.860114Z'), last_active_at: null },
      { id: 'a1b8d5e2-9c3f-4e6a-8b1d-7f4c0a5e9b3d', status: 'active', current_installation_id: '5d7f0a3f-1e8b-4a4c-8b2a-1c7d3a4d6f0e', current_platform: 'ios', current_platform_device_id: '1c7d3a4d-6f0e-4b8c-8b2a-1c7d3a4d6f0e', current_platform_id_source: 'ios_keychain', created_at: new Date('2025-11-06T10:10:49.860114Z'), updated_at: new Date('2025-11-06T10:10:49.860114Z'), last_active_at: new Date('2025-11-06T10:10:49.860114Z') },
      { id: 'f7e2a9c1-4b8d-4f6e-9a2c-5d1e8b7a0c3f', status: 'active', current_installation_id: '8b2a1c7d-3a4d-4f0e-9e1f-6b8c0a3f1e8b', current_platform: 'android', current_platform_device_id: '3a4d6f0e-8b2a-4c7d-9f1e-6b8c0a3d1f0e', current_platform_id_source: 'android_ssaid', created_at: new Date('2025-11-06T10:10:49.860114Z'), updated_at: new Date('2025-11-06T10:10:49.860114Z'), last_active_at: new Date('2025-11-06T10:10:49.860114Z') },
      { id: '51ec0203-661a-470f-8a34-d01f31a0b65a', status: 'active', current_installation_id: '7fb89e7a-59e3-436d-9d0c-b105abb2533c', current_platform: 'ios', current_platform_device_id: '498fb906-fc13-43a7-9706-d3bf2b6e49a5', current_platform_id_source: 'ios_keychain', created_at: new Date('2025-11-08T09:09:44.414Z'), updated_at: null, last_active_at: null },
      { id: '7c3d3f22-460c-42cd-87c1-b68b93e7576f', status: 'active', current_installation_id: '0b67bce5-a868-4822-872b-67d0865ff1ee', current_platform: 'ios', current_platform_device_id: '8362CB69-91F7-4326-8680-DDD241F9CC8B', current_platform_id_source: 'ios_keychain', created_at: new Date('2025-11-09T10:12:29.275Z'), updated_at: null, last_active_at: null },
      { id: 'f3a22f2e-dee2-46b9-bf80-1f4195245570', status: 'active', current_installation_id: 'e3ea719c-aeb5-4f38-b0f6-71a431a8c3bf', current_platform: 'ios', current_platform_device_id: '12ECCE78-114F-4362-93CC-A9E3F1EEDA00', current_platform_id_source: 'ios_keychain', created_at: new Date('2025-11-10T14:26:34.292Z'), updated_at: null, last_active_at: null },
      { id: 'de2fb4bf-23b5-44b2-8b9b-1116b374a794', status: 'active', current_installation_id: '9b5d22cf-256c-419d-a7e1-32f0a9a686e8', current_platform: 'ios', current_platform_device_id: 'f4c38677-cc8e-405c-8eac-383c7f390758', current_platform_id_source: 'ios_keychain', created_at: new Date('2025-11-07T07:46:46.766Z'), updated_at: new Date('2025-11-11T04:59:24.385Z'), last_active_at: null },
    ],
    skipDuplicates: true,
  });

  // Seed pets
  await prisma.pets.createMany({
    data: [
      { id: 'e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', species_id: 'c2e1a8d5-3b7f-4c6e-9a1d-8f2b0c5e7a4d', breed_id: '1d9a3e2f-8b4c-4a7d-9e1f-6c0b5e8a3d7f', pet_name: 'Milo', gender: 'male', birth_date: new Date('2022-02-15'), weight: new Prisma.Decimal(3.5), created_at: new Date('2025-11-06T10:10:49.866084Z'), updated_at: new Date('2025-11-06T10:10:49.866084Z') },
      { id: 'c9f8a3e1-5b2c-4f8e-8a6d-9c3b1e7f2a4d', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', species_id: '5e8b3d1f-7c4a-4e8b-9a2d-6f1c0e3b7a5d', breed_id: '6a8d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', pet_name: 'Luna', gender: 'female', birth_date: new Date('2021-08-20'), weight: new Prisma.Decimal(4.2), created_at: new Date('2025-11-06T10:10:49.866084Z'), updated_at: new Date('2025-11-06T10:10:49.866084Z') },
      { id: 'a3e1b8d5-9c3f-4e6a-8b1d-7f4c0a5e9b3d', user_id: '9c7a4f1e-6d2f-4a8b-9e3d-1a4f0c8e3b2a', species_id: '8a4d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', breed_id: '8c1f0a3e-7d4b-4f6e-9a2c-5d1e8b7a0c3f', pet_name: 'Coco', gender: 'female', birth_date: new Date('2023-01-10'), weight: new Prisma.Decimal(1.8), created_at: new Date('2025-11-06T10:10:49.866084Z'), updated_at: new Date('2025-11-06T10:10:49.866084Z') },
      { id: '8f2c0e3b-7a4d-4f6e-9a2c-5d1e8b7a0c3f', user_id: 'd3f9e8a1-5b2c-4f8e-8a6d-9c3b1e7f2a4d', species_id: 'b6d1e8a9-3c5f-4e7b-9a2d-8f1c0e3b7a4d', breed_id: 'a2e3b8d5-1c7f-4e9a-8b4d-6f2c0e3b7a5d', pet_name: 'Rio', gender: 'male', birth_date: new Date('2020-12-05'), weight: new Prisma.Decimal(0.9), created_at: new Date('2025-11-06T10:10:49.866084Z'), updated_at: new Date('2025-11-06T10:10:49.866084Z') },
      { id: '6e1a9c2f-4b8d-4a7d-9e1f-6c0b5e8a3d7f', user_id: 'a1b8d5e2-9c3f-4e6a-8b1d-7f4c0a5e9b3d', species_id: 'e9f2c1a8-7d4b-4f6e-8a3c-5d1e8b7a0c2f', breed_id: null, pet_name: 'Hammy', gender: 'male', birth_date: new Date('2023-03-11'), weight: new Prisma.Decimal(0.3), created_at: new Date('2025-11-06T10:10:49.866084Z'), updated_at: new Date('2025-11-06T10:10:49.866084Z') },
      { id: 'a1ea975d-50fd-4e7d-88d5-730b6e8dd403', user_id: '7c3d3f22-460c-42cd-87c1-b68b93e7576f', species_id: '5e8b3d1f-7c4a-4e8b-9a2d-6f1c0e3b7a5d', breed_id: '6a8d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', pet_name: 'ดัมดัม', gender: 'male', birth_date: new Date('2025-11-07'), weight: new Prisma.Decimal(6.5), created_at: new Date('2025-11-09T15:49:01.443Z'), updated_at: new Date('2025-11-09T15:49:01.443Z') },
    ],
    skipDuplicates: true,
  });

  // Seed reminder_categories
  await prisma.reminder_categories.createMany({
    data: [
      { id: '7f5d1e9c-3a8b-4d6e-9c2f-1a4b0e8d3c7f', name: 'General', description: 'General reminders not tied to specific health tasks' },
      { id: '9a2b8e3d-5c1f-4a7b-8d4e-6f0c5b7a1d9e', name: 'Vaccination', description: 'Vaccination reminders' },
      { id: 'b4e8c1a9-7d3f-4e6a-9b2d-8f1c0e3b7a4d', name: 'Checkup', description: 'Routine health check reminders' },
      { id: 'd1f9a3e8-5b2c-4f8e-8a6d-9c3b1e7f2a4d', name: 'Medication', description: 'Medicine or supplement reminders' },
      { id: 'f8e2c1a9-7d4b-4f6e-8a3c-5d1e8b7a0c2f', name: 'Deworming', description: 'Parasite and deworming schedule reminders' },
      { id: '2a9c1e8f-4b7d-4a6e-9c2f-1a4b0e8d3c7f', name: 'Grooming', description: 'Bath, trim, or hygiene care reminders' },
      { id: '4d6e8a3c-1f5b-4e7b-9a2d-8f1c0e3b7a4d', name: 'Feeding', description: 'Feeding schedule reminders' },
    ],
    skipDuplicates: true,
  });

  // Seed reminders
  await prisma.reminders.createMany({
    data: [
      { id: 'b9d2e1a8-3c5f-4e7b-9a2d-8f1c0e3b7a4d', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', pet_id: 'e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a', category_id: '9a2b8e3d-5c1f-4a7b-8d4e-6f0c5b7a1d9e', reminder_name: 'Rabies Vaccine', description: 'Annual rabies shot', reminder_date: new Date('2025-10-07'), reminder_time: new Date('1970-01-01T09:00:00Z'), reminder_status: 'done', status_done_at: new Date('2025-11-06T10:10:49.868069Z'), status_before_done: 'overdue', created_at: new Date('2025-11-06T10:10:49.868069Z'), updated_at: new Date('2025-11-06T10:10:49.868069Z') },
      { id: 'd5f8c1a9-7d3f-4e6a-9b2d-8f1c0e3b7a4d', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', pet_id: 'c9f8a3e1-5b2c-4f8e-8a6d-9c3b1e7f2a4d', category_id: 'b4e8c1a9-7d3f-4e6a-9b2d-8f1c0e3b7a4d', reminder_name: 'Health Checkup', description: 'Annual vet visit', reminder_date: new Date('2025-10-30'), reminder_time: new Date('1970-01-01T14:00:00Z'), reminder_status: 'overdue', status_done_at: new Date('2025-11-06T10:10:49.868069Z'), status_before_done: null, created_at: new Date('2025-11-06T10:10:49.868069Z'), updated_at: new Date('2025-11-06T10:10:49.868069Z') },
      { id: '2c7f0a3e-9d4b-4f6e-8a3c-5d1e8b7a0c2f', user_id: '9c7a4f1e-6d2f-4a8b-9e3d-1a4f0c8e3b2a', pet_id: 'a3e1b8d5-9c3f-4e6a-8b1d-7f4c0a5e9b3d', category_id: 'd1f9a3e8-5b2c-4f8e-8a6d-9c3b1e7f2a4d', reminder_name: 'Vitamin Supplement', description: 'Monthly rabbit vitamins', reminder_date: new Date('2025-11-11'), reminder_time: new Date('1970-01-01T08:30:00Z'), reminder_status: 'done', status_done_at: new Date('2025-11-06T10:10:49.868069Z'), status_before_done: 'to_do', created_at: new Date('2025-11-06T10:10:49.868069Z'), updated_at: new Date('2025-11-06T10:10:49.868069Z') },
      { id: '5b1e8d7a-3c5f-4e9a-8b4d-6f2c0e3b7a5d', user_id: 'a1b8d5e2-9c3f-4e6a-8b1d-7f4c0a5e9b3d', pet_id: '6e1a9c2f-4b8d-4a7d-9e1f-6c0b5e8a3d7f', category_id: '4d6e8a3c-1f5b-4e7b-9a2d-8f1c0e3b7a4d', reminder_name: 'Feeding Time', description: 'Schedule feeding reminder', reminder_date: new Date('2025-11-07'), reminder_time: new Date('1970-01-01T07:30:00Z'), reminder_status: 'overdue', status_done_at: new Date('2025-11-06T10:10:49.868069Z'), status_before_done: null, created_at: new Date('2025-11-06T10:10:49.868069Z'), updated_at: new Date('2025-11-07T07:30:00.107Z') },
      { id: 'f1a9e3d8-5b2c-4f8e-8a6d-9c3b1e7f2a4d', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', pet_id: 'e6b3c2a1-8d4f-4e6a-9b1d-7f5c0a8e3b2a', category_id: '2a9c1e8f-4b7d-4a6e-9c2f-1a4b0e8d3c7f', reminder_name: 'Grooming Session', description: 'Trim and clean', reminder_date: new Date('2025-11-08'), reminder_time: new Date('1970-01-01T10:00:00Z'), reminder_status: 'overdue', status_done_at: new Date('2025-11-06T10:10:49.868069Z'), status_before_done: null, created_at: new Date('2025-11-06T10:10:49.868069Z'), updated_at: new Date('2025-11-08T06:30:00.240Z') },
      { id: '0e416f24-58dd-4680-8a80-73b2f518c69c', user_id: '7c3d3f22-460c-42cd-87c1-b68b93e7576f', pet_id: 'a1ea975d-50fd-4e7d-88d5-730b6e8dd403', category_id: '7f5d1e9c-3a8b-4d6e-9c2f-1a4b0e8d3c7f', reminder_name: 'Test CP4', description: 'blahblah', reminder_date: new Date('2025-12-12'), reminder_time: new Date('1970-01-01T17:00:00Z'), reminder_status: 'to_do', status_done_at: null, status_before_done: null, created_at: new Date('2025-11-10T09:25:36.298Z'), updated_at: new Date('2025-11-10T09:25:36.298Z') },
      { id: 'c147f850-238e-41d0-8f54-2f1fceda4cf0', user_id: '7c3d3f22-460c-42cd-87c1-b68b93e7576f', pet_id: 'a1ea975d-50fd-4e7d-88d5-730b6e8dd403', category_id: '7f5d1e9c-3a8b-4d6e-9c2f-1a4b0e8d3c7f', reminder_name: 'เทส Overdue', description: 'blahblah', reminder_date: new Date('2025-11-10'), reminder_time: new Date('1970-01-01T17:30:00Z'), reminder_status: 'overdue', status_done_at: null, status_before_done: null, created_at: new Date('2025-11-10T10:28:21.724Z'), updated_at: new Date('2025-11-10T10:30:00.077Z') },
    ],
    skipDuplicates: true,
  });

  // Seed notifications
  await prisma.notifications.createMany({
    data: [
      { id: '9e3f1c5b-0a7e-4a6d-8e3f-1c5b0a7e9d2f', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', reminder_id: 'b9d2e1a8-3c5f-4e7b-9a2d-8f1c0e3b7a4d', sent_at: new Date('2025-10-08T10:10:49.869895Z'), status: 'sent', read_at: new Date('2025-10-09T10:10:49.869895Z'), created_at: new Date('2025-11-06T10:10:49.869895Z') },
      { id: '7d4b8f2c-1e6a-4f8e-9a2c-5d1e8b7a0c3f', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', reminder_id: 'd5f8c1a9-7d3f-4e6a-9b2d-8f1c0e3b7a4d', sent_at: new Date('2025-11-03T10:10:49.869895Z'), status: 'sent', read_at: new Date('2025-11-06T10:10:49.869895Z'), created_at: new Date('2025-11-06T10:10:49.869895Z') },
      { id: '4a7d2f1e-9b7c-4a6d-8e3f-1c5b0a7e9d2f', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', reminder_id: 'f1a9e3d8-5b2c-4f8e-8a6d-9c3b1e7f2a4d', sent_at: new Date('2025-11-06T10:10:49.869895Z'), status: 'pending', read_at: new Date('2025-11-06T10:10:49.869895Z'), created_at: new Date('2025-11-06T10:10:49.869895Z') },
      { id: '1c5b0a7e-9d2f-4e9a-8b4d-6f2c0e3b7a5d', user_id: '9c7a4f1e-6d2f-4a8b-9e3d-1a4f0c8e3b2a', reminder_id: '2c7f0a3e-9d4b-4f6e-8a3c-5d1e8b7a0c2f', sent_at: new Date('2025-11-06T10:10:49.869895Z'), status: 'pending', read_at: new Date('2025-11-06T10:10:49.869895Z'), created_at: new Date('2025-11-06T10:10:49.869895Z') },
      { id: '3e8a1d9c-5b2c-4f8e-8a6d-9c3b1e7f2a4d', user_id: 'a1b8d5e2-9c3f-4e6a-8b1d-7f4c0a5e9b3d', reminder_id: '5b1e8d7a-3c5f-4e9a-8b4d-6f2c0e3b7a5d', sent_at: new Date('2025-11-06T10:10:49.869895Z'), status: 'pending', read_at: new Date('2025-11-06T10:10:49.869895Z'), created_at: new Date('2025-11-06T10:10:49.869895Z') },
    ],
    skipDuplicates: true,
  });

  // Seed push_tokens
  await prisma.push_tokens.createMany({
    data: [
      { id: 'b2d8e1a9-3c5f-4e7b-9a2d-8f1c0e3b7a4d', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', provider: 'expo', token: 'ExponentPushToken[abc123]', last_seen_at: null, revoked_at: null, created_at: new Date('2025-11-06T10:10:49.873915Z'), updated_at: null },
      { id: 'e8f1c0a3-5b2c-4f8e-8a6d-9c3b1e7f2a4d', user_id: '4b1a3d0f-4e89-4a41-8b4d-2bbd1a6c0c28', provider: 'expo', token: 'ExponentPushToken[xyz789]', last_seen_at: null, revoked_at: null, created_at: new Date('2025-11-06T10:10:49.873915Z'), updated_at: null },
      { id: '9a3e1f8d-7c4b-4e6a-9b1d-7f5c0a8e3b2a', user_id: '9c7a4f1e-6d2f-4a8b-9e3d-1a4f0c8e3b2a', provider: 'fcm', token: 'FCMToken[test123]', last_seen_at: null, revoked_at: null, created_at: new Date('2025-11-06T10:10:49.873915Z'), updated_at: null },
      { id: 'c1a9e3d8-5b2c-4f8e-8a6d-9c3b1e7f2a4d', user_id: 'd3f9e8a1-5b2c-4f8e-8a6d-9c3b1e7f2a4d', provider: 'expo', token: 'ExponentPushToken[test456]', last_seen_at: null, revoked_at: null, created_at: new Date('2025-11-06T10:10:49.873915Z'), updated_at: null },
      { id: 'f0a3e1b7-9d4b-4f6e-8a3c-5d1e8b7a0c2f', user_id: 'a1b8d5e2-9c3f-4e6a-8b1d-7f4c0a5e9b3d', provider: 'fcm', token: 'FCMToken[test789]', last_seen_at: null, revoked_at: null, created_at: new Date('2025-11-06T10:10:49.873915Z'), updated_at: null },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });