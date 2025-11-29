import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'still have no apps name - API',
      version: '1.0.0',
      description: 'API documentation for the joodjoodjood backend services.',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        InstallationIdHeader: {
          in: 'header',
          name: 'x-installation-id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'The unique installation ID of the device.',
        },
      },
      schemas: {
        // Generic Error
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'A description of the error.',
            },
          },
        },
        // Auth Schemas
        DeviceLoginBody: {
          type: 'object',
          required: [
            'installationId',
            'platform',
            'platformDeviceId',
            'platformIdSource',
          ],
          properties: {
            installationId: {
              type: 'string',
              format: 'uuid',
              description: 'The unique installation ID from the device.',
            },
            platform: {
              type: 'string',
              enum: ['ios', 'android', 'other'],
            },
            platformDeviceId: {
              type: 'string',
              description: "The device's unique hardware ID.",
            },
            platformIdSource: {
              type: 'string',
              enum: ['ios_keychain', 'android_ssaid', 'unknown'],
            },
          },
        },
        RefreshBody: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User',
            },
            accessToken: {
              type: 'string',
            },
            refreshToken: {
              type: 'string',
            },
          },
        },
        // User Schema
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['active', 'disabled'] },
            current_installation_id: { type: 'string' },
            current_platform: {
              type: 'string',
              enum: ['ios', 'android', 'other'],
            },
            current_platform_device_id: { type: 'string' },
            current_platform_id_source: {
              type: 'string',
              enum: ['ios_keychain', 'android_ssaid', 'unknown'],
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            last_active_at: { type: 'string', format: 'date-time' },
          },
        },
        PushTokenBody: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
              description: 'The Expo push token.'
            }
          }
        },
        // Pet Schemas
        Pet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            species_id: { type: 'string', format: 'uuid' },
            breed_id: { type: 'string', format: 'uuid' },
            pet_name: { type: 'string' },
            gender: { type: 'string', enum: ['male', 'female', 'unknown'] },
            birth_date: { type: 'string', format: 'date-time' },
            weight: { type: 'number' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          }
        },
        CreatePetBody: {
          type: 'object',
          required: ['pet_name', 'species_id', 'gender'],
          properties: {
            pet_name: { type: 'string', minLength: 1 },
            species_id: { type: 'string', format: 'uuid' },
            breed_id: { type: 'string', format: 'uuid' },
            gender: { type: 'string', enum: ['male', 'female', 'unknown'] },
            weight: { type: 'number', format: 'float' },
            birth_date: { type: 'string', format: 'date-time' },
          }
        },
        UpdatePetBody: {
          type: 'object',
          properties: {
            pet_name: { type: 'string', minLength: 1 },
            species_id: { type: 'string', format: 'uuid' },
            breed_id: { type: 'string', format: 'uuid' },
            gender: { type: 'string', enum: ['male', 'female', 'unknown'] },
            weight: { type: 'number', format: 'float' },
            birth_date: { type: 'string', format: 'date-time' },
          }
        },
        // Reminder Schemas
        Reminder: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            pet_id: { type: 'string', format: 'uuid' },
            reminder_name: { type: 'string' },
            description: { type: 'string' },
            reminder_date: { type: 'string', format: 'date' },
            reminder_time: { type: 'string', format: 'time' },
            reminder_status: { type: 'string', enum: ['to_do', 'done', 'overdue'] },
            status_done_at: { type: 'string', format: 'date-time' },
            category_name: { type: 'string', enum: ['General', 'Vaccination', 'Checkup', 'Medication', 'Deworming', 'Grooming', 'Feeding'] },
            parent_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          }
        },
        SimpleReminderObject: {
          type: 'object',
          required: ['reminderName', 'reminderDate'],
          properties: {
            reminderName: { type: 'string' },
            description: { type: 'string' },
            reminderDate: { type: 'string', format: 'date' },
            reminderTime: { type: 'string', format: 'time', example: '14:30:00' },
            categoryName: { type: 'string', enum: ['General', 'Vaccination', 'Checkup', 'Medication', 'Deworming', 'Grooming', 'Feeding'] },
          }
        },
        CreateReminderBody: {
          type: 'object',
          required: ['petId', 'reminderName', 'reminderDate'],
          properties: {
            petId: { type: 'string', format: 'uuid' },
            reminderName: { type: 'string' },
            description: { type: 'string' },
            reminderDate: { type: 'string', format: 'date' },
            reminderTime: { type: 'string', format: 'time', example: '14:30:00' },
            categoryName: { type: 'string', enum: ['General', 'Vaccination', 'Checkup', 'Medication', 'Deworming', 'Grooming', 'Feeding'] },
            children: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/SimpleReminderObject'
              }
            }
          }
        },
        UpdateReminderBody: {
          type: 'object',
          properties: {
            reminderName: { type: 'string' },
            description: { type: 'string' },
            reminderDate: { type: 'string', format: 'date' },
            reminderTime: { type: 'string', format: 'time', example: '14:30:00' },
            categoryName: { type: 'string', enum: ['General', 'Vaccination', 'Checkup', 'Medication', 'Deworming', 'Grooming', 'Feeding'] },
            reminder_status: { type: 'string', enum: ['to_do', 'done', 'overdue'] },
            parentId: { type: 'string', format: 'uuid' },
          }
        },
        // Notification Schema
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            reminder_id: { type: 'string', format: 'uuid' },
            sent_at: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['sent', 'pending', 'failed'] },
            read_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
          }
        },
        UpdateNotificationBody: {
          type: 'object',
          required: ['read'],
          properties: {
            read: {
              type: 'boolean',
              description: 'Set to true to mark the notification as read.'
            }
          }
        },
        // Vaccine Schemas
        VaccineCalculationBody: {
          type: 'object',
          required: ['petId', 'vaccineId'],
          properties: {
            petId: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the pet.'
            },
            vaccineId: {
              type: 'integer',
              description: 'The ID of the vaccine template.'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Optional start date for the calculation (YYYY-MM-DD).'
            }
          }
        },
        VaccineAppointment: {
          type: 'object',
          properties: {
            doseNumber: { type: 'integer' },
            date: { type: 'string', format: 'date' },
            type: { type: 'string', enum: ['Primary', 'Booster'] },
            ageInDays: { type: 'integer' }
          }
        },
        Vaccine: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                species_id: { type: 'string', format: 'uuid' },
                vaccine_name: { type: 'string' },
                vaccine_name_th: { type: 'string' },
            }
        },
        // Meta Schemas
        Breed: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The unique identifier for the breed.',
              example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            },
            name: {
              type: 'string',
              description: 'The Thai name of the breed.',
              example: 'ค็อกคาเทล'
            },
            description_th: {
              type: 'string',
              description: 'The Thai description of the breed.'
            }
          }
        },
        SpeciesWithBreeds: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'The unique identifier for the species.',
              example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
            },
            name: {
              type: 'string',
              description: 'The Thai name of the species.',
              example: 'หมา'
            },
            description_th: {
              type: 'string',
              description: 'The Thai description of the species.'
            },
            breeds: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Breed',
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/features/**/*-routes.ts', './src/routes.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
