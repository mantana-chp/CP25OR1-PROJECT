import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { PrismaClient, Prisma } from '../src/generated/prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Seed Users
  const users: Prisma.usersCreateManyInput[] = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      status: "active",
      current_installation_id: "install-uuid-001",
      current_platform: "ios",
      current_platform_device_id: "ios-device-001",
      current_platform_id_source: "ios_keychain",
      created_at: new Date("2025-10-31T06:44:33.488Z"),
      updated_at: new Date("2025-10-31T06:44:33.488Z"),
      last_active_at: new Date("2025-10-31T06:44:33.488Z")
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      status: "active",
      current_installation_id: "install-uuid-003",
      current_platform: "ios",
      current_platform_device_id: "ios-device-002",
      current_platform_id_source: "ios_keychain",
      created_at: new Date("2025-10-31T06:44:33.488Z"),
      updated_at: new Date("2025-10-31T06:44:33.488Z"),
      last_active_at: new Date("2025-10-31T06:44:33.488Z")
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      status: "disabled",
      current_installation_id: "install-uuid-004",
      current_platform: "android",
      current_platform_device_id: "android-device-002",
      current_platform_id_source: "android_ssaid",
      created_at: new Date("2025-10-31T06:44:33.488Z"),
      updated_at: new Date("2025-10-31T06:44:33.488Z"),
      last_active_at: null
    },
    {
      id: "44444444-4444-4444-4444-444444444444",
      status: "active",
      current_installation_id: "install-uuid-005",
      current_platform: "ios",
      current_platform_device_id: "ios-device-003",
      current_platform_id_source: "ios_keychain",
      created_at: new Date("2025-10-31T06:44:33.488Z"),
      updated_at: new Date("2025-10-31T06:44:33.488Z"),
      last_active_at: new Date("2025-10-31T06:44:33.488Z")
    },
    {
      id: "55555555-5555-5555-5555-555555555555",
      status: "active",
      current_installation_id: "install-uuid-006",
      current_platform: "android",
      current_platform_device_id: "android-device-003",
      current_platform_id_source: "android_ssaid",
      created_at: new Date("2025-10-31T06:44:33.488Z"),
      updated_at: new Date("2025-10-31T06:44:33.488Z"),
      last_active_at: new Date("2025-10-31T06:44:33.488Z")
    },
    {
      id: "e2bb3bb4-e6ee-452b-989c-9e97b5f2891f",
      status: "active",
      current_installation_id: "77a9dc1b-01cb-4cc6-8391-5df003e49ba5",
      current_platform: "ios",
      current_platform_device_id: "f4c38677-cc8e-405c-8eac-383c7f390758",
      current_platform_id_source: "ios_keychain",
      created_at: new Date("2025-11-05T14:00:20.394Z"),
      updated_at: null,
      last_active_at: null
    }
  ];
  await prisma.users.createMany({ data: users, skipDuplicates: true });

  // Seed Species
  const species: Prisma.speciesCreateManyInput[] = [
    { id: "aaa11111-1111-1111-1111-111111111111", name: "dog", description: "Domestic dog" },
    { id: "aaa22222-2222-2222-2222-222222222222", name: "cat", description: "Domestic cat" },
    { id: "aaa33333-3333-3333-3333-333333333333", name: "rabbit", description: "Small herbivorous mammal" },
    { id: "aaa44444-4444-4444-4444-444444444444", name: "bird", description: "Pet bird species" },
    { id: "aaa55555-5555-5555-5555-555555555555", name: "hamster", description: "Small rodent pet" }
  ];
  await prisma.species.createMany({ data: species, skipDuplicates: true });

  // Seed Breeds
  const breeds: Prisma.breedsCreateManyInput[] = [
    { id: "bbb11111-1111-1111-1111-111111111111", species_id: "aaa11111-1111-1111-1111-111111111111", name: "Pomeranian", description: "Small fluffy dog" },
    { id: "bbb22222-2222-2222-2222-222222222222", species_id: "aaa11111-1111-1111-1111-111111111111", name: "Golden Retriever", description: "Friendly large breed" },
    { id: "bbb33333-3333-3333-3333-333333333333", species_id: "aaa22222-2222-2222-2222-222222222222", name: "Siamese", description: "Elegant short-haired cat" },
    { id: "bbb44444-4444-4444-4444-444444444444", species_id: "aaa33333-3333-3333-3333-333333333333", name: "Holland Lop", description: "Mini rabbit with floppy ears" },
    { id: "bbb55555-5555-5555-5555-555555555555", species_id: "aaa44444-4444-4444-4444-444444444444", name: "Cockatiel", description: "Popular small parrot" }
  ];
  await prisma.breeds.createMany({ data: breeds, skipDuplicates: true });

  // Seed Reminder Categories
  const reminder_categories: Prisma.reminder_categoriesCreateManyInput[] = [
    { id: "ccc11111-1111-1111-1111-111111111111", name: "General", description: "General reminders not tied to specific health tasks" },
    { id: "ccc22222-2222-2222-2222-222222222222", name: "Vaccination", description: "Vaccination reminders" },
    { id: "ccc33333-3333-3333-3333-333333333333", name: "Checkup", description: "Routine health check reminders" },
    { id: "ccc44444-4444-4444-4444-444444444444", name: "Medication", description: "Medicine or supplement reminders" },
    { id: "ccc55555-5555-5555-5555-555555555555", name: "Deworming", description: "Parasite and deworming schedule reminders" },
    { id: "ccc66666-6666-6666-6666-666666666666", name: "Grooming", description: "Bath, trim, or hygiene care reminders" },
    { id: "ccc77777-7777-7777-7777-777777777777", name: "Feeding", description: "Feeding schedule reminders" }
  ];
  await prisma.reminder_categories.createMany({ data: reminder_categories, skipDuplicates: true });

  // Seed Pets
  const pets: Prisma.petsCreateManyInput[] = [
    {
      id: "ddd11111-1111-1111-1111-111111111111",
      user_id: "11111111-1111-1111-1111-111111111111",
      species_id: "aaa11111-1111-1111-1111-111111111111",
      breed_id: "bbb11111-1111-1111-1111-111111111111",
      pet_name: "Milo",
      gender: "male",
      birth_date: new Date("2022-02-15T00:00:00.000Z"),
      weight: "3.5",
      created_at: new Date("2025-10-31T06:44:33.495Z"),
      updated_at: new Date("2025-10-31T06:44:33.495Z")
    },
    {
      id: "ddd22222-2222-2222-2222-222222222222",
      user_id: "11111111-1111-1111-1111-111111111111",
      species_id: "aaa22222-2222-2222-2222-222222222222",
      breed_id: "bbb33333-3333-3333-3333-333333333333",
      pet_name: "Luna",
      gender: "female",
      birth_date: new Date("2021-08-20T00:00:00.000Z"),
      weight: "4.2",
      created_at: new Date("2025-10-31T06:44:33.495Z"),
      updated_at: new Date("2025-10-31T06:44:33.495Z")
    },
    {
      id: "ddd33333-3333-3333-3333-333333333333",
      user_id: "22222222-2222-2222-2222-222222222222",
      species_id: "aaa33333-3333-3333-3333-333333333333",
      breed_id: "bbb44444-4444-4444-4444-444444444444",
      pet_name: "Coco",
      gender: "female",
      birth_date: new Date("2023-01-10T00:00:00.000Z"),
      weight: "1.8",
      created_at: new Date("2025-10-31T06:44:33.495Z"),
      updated_at: new Date("2025-10-31T06:44:33.495Z")
    },
    {
      id: "ddd44444-4444-4444-4444-444444444444",
      user_id: "33333333-3333-3333-3333-333333333333",
      species_id: "aaa44444-4444-4444-4444-444444444444",
      breed_id: "bbb55555-5555-5555-5555-555555555555",
      pet_name: "Rio",
      gender: "male",
      birth_date: new Date("2020-12-05T00:00:00.000Z"),
      weight: "0.9",
      created_at: new Date("2025-10-31T06:44:33.495Z"),
      updated_at: new Date("2025-10-31T06:44:33.495Z")
    },
    {
      id: "ddd55555-5555-5555-5555-555555555555",
      user_id: "44444444-4444-4444-4444-444444444444",
      species_id: "aaa55555-5555-5555-5555-555555555555",
      breed_id: null,
      pet_name: "Hammy",
      gender: "male",
      birth_date: new Date("2023-03-11T00:00:00.000Z"),
      weight: "0.3",
      created_at: new Date("2025-10-31T06:44:33.495Z"),
      updated_at: new Date("2025-10-31T06:44:33.495Z")
    }
  ];
  await prisma.pets.createMany({ data: pets, skipDuplicates: true });

  // Seed Reminders
  const reminders: Prisma.remindersCreateManyInput[] = [
    {
      id: "eee11111-1111-1111-1111-111111111111",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc22222-2222-2222-2222-222222222222",
      reminder_name: "Rabies Vaccine",
      description: "Annual rabies shot",
      reminder_date: new Date("2025-10-01T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T09:00:00.000Z"),
      reminder_status: "done",
      status_done_at: new Date("2025-10-31T06:44:33.496Z"),
      created_at: new Date("2025-10-31T06:44:33.496Z"),
      updated_at: new Date("2025-10-31T06:44:33.496Z")
    },
    {
      id: "eee22222-2222-2222-2222-222222222222",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd22222-2222-2222-2222-222222222222",
      category_id: "ccc33333-3333-3333-3333-333333333333",
      reminder_name: "Health Checkup",
      description: "Annual vet visit",
      reminder_date: new Date("2025-10-24T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T14:00:00.000Z"),
      reminder_status: "overdue",
      status_done_at: new Date("2025-10-31T06:44:33.496Z"),
      created_at: new Date("2025-10-31T06:44:33.496Z"),
      updated_at: new Date("2025-10-31T06:44:33.496Z")
    },
    {
      id: "eee33333-3333-3333-3333-333333333333",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc66666-6666-6666-6666-666666666666",
      reminder_name: "Grooming Session",
      description: "Trim and clean",
      reminder_date: new Date("2025-11-02T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T10:00:00.000Z"),
      reminder_status: "to_do",
      status_done_at: new Date("2025-10-31T06:44:33.496Z"),
      created_at: new Date("2025-10-31T06:44:33.496Z"),
      updated_at: new Date("2025-10-31T06:44:33.496Z")
    },
    {
      id: "eee44444-4444-4444-4444-444444444444",
      user_id: "22222222-2222-2222-2222-222222222222",
      pet_id: "ddd33333-3333-3333-3333-333333333333",
      category_id: "ccc44444-4444-4444-4444-444444444444",
      reminder_name: "Vitamin Supplement",
      description: "Monthly rabbit vitamins",
      reminder_date: new Date("2025-11-05T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T08:30:00.000Z"),
      reminder_status: "to_do",
      status_done_at: new Date("2025-10-31T06:44:33.496Z"),
      created_at: new Date("2025-10-31T06:44:33.496Z"),
      updated_at: new Date("2025-10-31T06:44:33.496Z")
    },
    {
      id: "eee55555-5555-5555-5555-555555555555",
      user_id: "44444444-4444-4444-4444-444444444444",
      pet_id: "ddd55555-5555-5555-5555-555555555555",
      category_id: "ccc77777-7777-7777-7777-777777777777",
      reminder_name: "Feeding Time",
      description: "Schedule feeding reminder",
      reminder_date: new Date("2025-11-01T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T07:30:00.000Z"),
      reminder_status: "to_do",
      status_done_at: new Date("2025-10-31T06:44:33.496Z"),
      created_at: new Date("2025-10-31T06:44:33.496Z"),
      updated_at: new Date("2025-10-31T06:44:33.496Z")
    },
    {
      id: "84aa3c91-67f1-47c1-8c15-974ea0be2e19",
      user_id: "22222222-2222-2222-2222-222222222222",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "refactor two",
      description: "Get the new brand of kibble.",
      reminder_date: new Date("2025-11-05T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T18:00:00.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-01T04:28:37.469Z"),
      updated_at: new Date("2025-11-01T04:28:37.469Z")
    },
    {
      id: "e766b5e2-2b5f-41ca-b1d2-740f21b8863f",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "Test CP1",
      description: "blahblah",
      reminder_date: new Date("2025-11-05T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T17:00:00.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-01T14:08:45.842Z"),
      updated_at: new Date("2025-11-01T14:08:45.842Z")
    },
    {
      id: "0bc12f4a-eb24-44a2-a305-5a419d16a8af",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "Test CP3",
      description: "blahblah",
      reminder_date: new Date("2025-11-05T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T17:00:00.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-01T14:08:50.304Z"),
      updated_at: new Date("2025-11-01T14:08:50.304Z")
    },
    {
      id: "dccccb95-eeb5-434f-9e42-7e8dc0a2c993",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "T3",
      description: "T\n",
      reminder_date: new Date("2025-11-01T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T21:36:39.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-01T14:37:01.437Z"),
      updated_at: new Date("2025-11-01T14:37:01.437Z")
    },
    {
      id: "939378ea-5282-4c5d-8ced-90b8b7f32504",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "T5",
      description: "T",
      reminder_date: new Date("2025-11-12T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T22:13:34.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-01T15:22:45.533Z"),
      updated_at: new Date("2025-11-01T15:22:45.533Z")
    },
    {
      id: "f45c672b-f8dd-4a0b-9bec-1a8b435c672f",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "T6",
      description: "T",
      reminder_date: new Date("2025-11-02T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T13:31:35.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-02T06:28:38.137Z"),
      updated_at: new Date("2025-11-02T06:28:38.137Z")
    },
    {
      id: "e14d9fe8-297d-43b1-871b-40ccbea1f870",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "สวัสดี",
      description: "ที่นี่ไทยแลนด์",
      reminder_date: new Date("2025-11-02T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T21:50:55.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-02T14:51:14.462Z"),
      updated_at: new Date("2025-11-02T14:51:14.462Z")
    },
    {
      id: "44b25ff8-0fdf-4531-917e-6b7dcda64ece",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "กินข้าว",
      description: "",
      reminder_date: new Date("2025-11-03T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T16:06:39.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-03T09:06:47.898Z"),
      updated_at: new Date("2025-11-03T09:06:47.898Z")
    },
    {
      id: "f59d28e1-5537-44b5-b3ee-ee9e572aa01b",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "T7",
      description: "T\n",
      reminder_date: new Date("2025-11-06T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T20:34:56.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-03T13:35:15.872Z"),
      updated_at: new Date("2025-11-03T13:35:15.872Z")
    },
    {
      id: "5c75be1e-9f5d-4d48-85b2-e1b9f80a09c0",
      user_id: "11111111-1111-1111-1111-111111111111",
      pet_id: "ddd11111-1111-1111-1111-111111111111",
      category_id: "ccc11111-1111-1111-1111-111111111111",
      reminder_name: "สวัสดีวันพุธ",
      description: "",
      reminder_date: new Date("2025-11-05T00:00:00.000Z"),
      reminder_time: new Date("1970-01-01T14:47:01.000Z"),
      reminder_status: "to_do",
      status_done_at: null,
      created_at: new Date("2025-11-05T07:47:11.672Z"),
      updated_at: new Date("2025-11-05T07:47:11.672Z")
    }
  ];
  await prisma.reminders.createMany({ data: reminders, skipDuplicates: true });

  // Seed Notifications
  const notifications: Prisma.notificationsCreateManyInput[] = [
    {
      id: "fff11111-1111-1111-1111-111111111111",
      user_id: "11111111-1111-1111-1111-111111111111",
      reminder_id: "eee11111-1111-1111-1111-111111111111",
      sent_at: new Date("2025-10-02T06:44:33.498Z"),
      status: "sent",
      read_at: new Date("2025-10-03T06:44:33.498Z"),
      created_at: new Date("2025-10-31T06:44:33.498Z")
    },
    {
      id: "fff22222-2222-2222-2222-222222222222",
      user_id: "11111111-1111-1111-1111-111111111111",
      reminder_id: "eee22222-2222-2222-2222-222222222222",
      sent_at: new Date("2025-10-28T06:44:33.498Z"),
      status: "sent",
      read_at: new Date("2025-10-31T06:44:33.498Z"),
      created_at: new Date("2025-10-31T06:44:33.498Z")
    },
    {
      id: "fff33333-3333-3333-3333-333333333333",
      user_id: "11111111-1111-1111-1111-111111111111",
      reminder_id: "eee33333-3333-3333-3333-333333333333",
      sent_at: new Date("2025-10-31T06:44:33.498Z"),
      status: "pending",
      read_at: new Date("2025-10-31T06:44:33.498Z"),
      created_at: new Date("2025-10-31T06:44:33.498Z")
    },
    {
      id: "fff44444-4444-4444-4444-444444444444",
      user_id: "22222222-2222-2222-2222-222222222222",
      reminder_id: "eee44444-4444-4444-4444-444444444444",
      sent_at: new Date("2025-10-31T06:44:33.498Z"),
      status: "pending",
      read_at: new Date("2025-10-31T06:44:33.498Z"),
      created_at: new Date("2025-10-31T06:44:33.498Z")
    },
    {
      id: "fff55555-5555-5555-5555-555555555555",
      user_id: "44444444-4444-4444-4444-444444444444",
      reminder_id: "eee55555-5555-5555-5555-555555555555",
      sent_at: new Date("2025-10-31T06:44:33.498Z"),
      status: "pending",
      read_at: new Date("2025-10-31T06:44:33.498Z"),
      created_at: new Date("2025-10-31T06:44:33.498Z")
    }
  ];
  await prisma.notifications.createMany({ data: notifications, skipDuplicates: true });

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
