// ============= refactored to backend/src/features/ai-tips-generation/ai-tips-generation-service.ts =============
// import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// import { v4 as uuidv4 } from 'uuid';
// import { z } from 'zod';

// import { config } from '../config';
// import { pets } from '../generated/prisma/client';
// import prisma from '../libs/db';
// import { logger } from '../libs/logger';
// import { formatBirthDateToYearsMonths } from '../shared/utils';
// import { expoPushService, type PushMessage } from './expo-push-service';

// // Zod schema for structured output from the AI
// const GeneratedTipSchema = z.object({
//   userId: z.string().describe("The user's unique identifier from the input."),
//   petId: z.string().describe("The pet's unique identifier from the input."),
//   title: z.string().describe('The catchy, personalized Thai question about the pet, designed to create curiosity.'),
//   description: z.string().describe('The clear and friendly Thai answer to the question posed in the title.'),
// });

// const GeneratedTipsSchema = z.array(GeneratedTipSchema);

// // Type alias for the batch processing input
// type UserPetInfo = {
//   userId: string;
//   pet: pets & {
//     species: { name: string };
//     breeds: { name: string } | null;
//   };
// };

// // Type alias for the generated tip structure
// export type GeneratedTip = z.infer<typeof GeneratedTipSchema>;

// /**
//  * Processes a batch of users and their pets to generate personalized, curiosity-gap tips using AI.
//  * @param batch A batch of user-pet information.
//  * @returns A promise that resolves to an array of generated tips.
//  */
// const batchProcess = async (batch: UserPetInfo[]): Promise<GeneratedTip[]> => {
//   // Expanded list of topics for variety
//   const topics = [
//     'a fun fact',
//     'a little-known fact',
//     'an interesting tip',
//     'a surprising piece of information',
//     'a common myth',
//     'a behavioral insight',
//     'a quick training tip',
//     'a nutritional secret',
//     'a weird-but-true fact',
//     'a health tip',
//   ];

//   // Create a simplified list of pets for the prompt, each with a random topic
//   const petDataForPrompt = batch.map(({ userId, pet }) => {
//     const randomTopic = topics[Math.floor(Math.random() * topics.length)];
//     return {
//       userId,
//       petId: pet.id,
//       petName: pet.pet_name,
//       species: pet.species.name,
//       breed: pet.breeds?.name || 'mixed breed',
//       topic: randomTopic,
//     };
//   });

//   const prompt = `
// You are an expert veterinary content creator, specializing in engaging, short-form content for pet owners. Your task is to generate push notification content in Thai.

// **Core Objective:** For each pet, generate a push notification containing a fun fact or tip about the specified **topic**, structured as a question and answer.

// **Content Rules:**
// 1.  **Language:** MUST be in Thai (ภาษาไทย).
// 2.  **Title Rule:** The title MUST be a short, friendly, and intriguing question about the pet, based on its assigned **topic**. Include the pet's name. Make the tone warm and personal, not robotic. Vary the sentence structure between different pets to avoid sounding repetitive.
// 3.  **Description Rule (Very Important):** The description MUST provide a clear, concise, and friendly answer to the exact question asked in the title.
// 4.  **Tone:** Friendly, informative, and engaging.

// **Input Data:**
// Here is the list of pets and their assigned topics to generate notifications for:
// ${JSON.stringify(petDataForPrompt, null, 2)}

// **Output Format (Strict Requirement):**
// Your response MUST be a valid JSON array of objects, with no surrounding text or explanations. Each object in the array must correspond to a pet in the input list and follow this exact structure:
// [
//   {
//     "userId": "the-user-id-from-input",
//     "petId": "the-pet-id-from-input",
//     "title": "Thai question about the topic including pet's name",
//     "description": "Thai answer to the question in the title"
//   }
// ]
// `.trim();

//   try {
//     logger.info(`Sending batch request to AI for ${batch.length} pets.`);
//     logger.debug(`Full AI batch prompt:\n${prompt}`);

//     const llmWithJsonOutput = llm.withStructuredOutput(GeneratedTipsSchema);

//     const response = await llmWithJsonOutput.invoke(prompt);

//     logger.info(`AI batch response received successfully. Generated ${response.length} tips.`);
//     logger.debug(`AI batch raw response:\n${JSON.stringify(response, null, 2)}`);

//     return response;
//   } catch (error) {
//     logger.error('Error processing AI batch request:', error as Error);
//     return []; // Return empty array on failure
//   }
// };

// /**
//  * Splits an array into chunks of a specified size.
//  * @param array The array to chunk.
//  * @param size The size of each chunk.
//  * @returns An array of chunks.
//  */
// const chunkArray = <T>(array: T[], size: number): T[][] => {
//   const chunks: T[][] = [];
//   for (let i = 0; i < array.length; i += size) {
//     chunks.push(array.slice(i, i + size));
//   }
//   return chunks;
// };

// /**
//  * Fetches users who are eligible for a tip notification today.
//  * Eligibility criteria:
//  * - User must have at least one pet.
//  * - User must not have received any other notification today (reminder or tip).
//  * @returns A list of objects, each containing a userId and a randomly selected pet.
//  */
// export const getEligibleUsersForTip = async () => {
//   const startOfDay = new Date();
//   startOfDay.setUTCHours(0, 0, 0, 0);

//   const endOfDay = new Date();
//   endOfDay.setUTCHours(23, 59, 59, 999);

//   // Find user IDs who already have a notification today
//   const usersWithRecentNotifications = await prisma.notifications.findMany({
//     where: {
//       created_at: {
//         gte: startOfDay,
//         lte: endOfDay,
//       },
//       OR: [{ reminder_id: { not: null } }, { tips_title: { not: null } }],
//     },
//     select: { user_id: true },
//     distinct: ['user_id'],
//   });

//   const ineligibleUserIds = usersWithRecentNotifications.map(n => n.user_id);

//   // Find users who are not in the ineligible list and have at least one pet
//   const eligibleUsers = await prisma.users.findMany({
//     where: {
//       id: {
//         notIn: ineligibleUserIds,
//       },
//       pets: {
//         some: {},
//       },
//     },
//     include: {
//       pets: {
//         include: {
//           species: true,
//           breeds: true,
//         },
//       },
//     },
//   });

//   // For each eligible user, randomly select one pet
//   const usersWithRandomPet = eligibleUsers.map(user => {
//     const randomPetIndex = Math.floor(Math.random() * user.pets.length);
//     const selectedPet = user.pets[randomPetIndex];
//     return {
//       userId: user.id,
//       pet: selectedPet,
//     };
//   });

//   logger.info(`Found ${usersWithRandomPet.length} eligible users for AI tips.`);

//   return usersWithRandomPet;
// };

// // Initialize the LLM outside the function to reuse the instance
// const llm = new ChatGoogleGenerativeAI({
//   model: 'gemini-2.5-flash',
//   apiKey: config.google.apiKey,
//   temperature: 0.8, // Slightly higher temperature for more creative tips
// });

// /**
//  * The main orchestrator function for the AI tip generation and notification job.
//  */
// export const generateAndSendAITips = async () => {
//   logger.info('Starting AI Tip generation job.');

//   // 1. Get eligible users
//   const usersWithPets = await getEligibleUsersForTip();
//   if (usersWithPets.length === 0) {
//     logger.info('No eligible users found for AI tips today. Job finished.');
//     return;
//   }

//   // 2. Chunk users into batches
//   const BATCH_SIZE = 20;
//   const userBatches = chunkArray(usersWithPets, BATCH_SIZE);

//   // 3. Process each batch to generate tips
//   const allGeneratedTips: GeneratedTip[] = [];
//   for (const batch of userBatches) {
//     try {
//       const tips = await batchProcess(batch);
//       allGeneratedTips.push(...tips);
//     } catch (e) {
//       logger.error('A batch failed to process', e as Error);
//     }
//   }

//   if (allGeneratedTips.length === 0) {
//     logger.warn('AI did not generate any tips across all batches. Job finished.');
//     return;
//   }

//   logger.info(`Successfully generated ${allGeneratedTips.length} tips in total.`);

//   // 4. Save notifications to the database
//   const notificationsToCreate = allGeneratedTips.map(tip => ({
//     id: uuidv4(),
//     user_id: tip.userId,
//     pet_id: tip.petId,
//     tips_title: tip.title,
//     tips_desc: tip.description,
//     status: 'pending' as const, // Status is pending until push is confirmed
//   }));

//   try {
//     const createResult = await prisma.notifications.createMany({
//       data: notificationsToCreate,
//     });
//     logger.info(`Successfully saved ${createResult.count} notification records to the database.`);
//   } catch (error) {
//     logger.error('Failed to save AI tips to the database:', error as Error);
//     return; // Do not proceed if database write fails
//   }

//   // 5. Fetch push tokens and send notifications
//   const userIds = allGeneratedTips.map(tip => tip.userId);
//   const userPushTokens = await prisma.push_tokens.findMany({
//     where: {
//       user_id: {
//         in: userIds,
//       },
//     },
//     select: {
//       user_id: true,
//       token: true,
//     },
//   });

//   const tokenMap = new Map<string, string[]>();
//   userPushTokens.forEach(t => {
//     const existing = tokenMap.get(t.user_id) || [];
//     if (!existing.includes(t.token)) {
//       existing.push(t.token);
//     }
//     tokenMap.set(t.user_id, existing);
//   });

//   const pushMessages: PushMessage[] = [];
//   for (const tip of allGeneratedTips) {
//     const tokens = tokenMap.get(tip.userId);
//     if (tokens && tokens.length > 0) {
//       tokens.forEach(pushToken => {
//         pushMessages.push({
//           to: pushToken,
//           title: tip.title,
//           body: tip.description,
//           sound: 'default',
//         });
//       });
//     } else {
//       logger.warn(`No push token found for user ${tip.userId}. Cannot send tip notification.`);
//     }
//   }

//   if (pushMessages.length > 0) {
//     logger.info(`Sending ${pushMessages.length} push notifications via Expo.`);
//     await expoPushService.send(pushMessages);
//     // In a production scenario, you would process the tickets returned by `send()`
//     // to update the status of each notification in the database from 'pending' to 'sent' or 'failed'.
//     logger.info('Push notification job submitted to Expo.');
//   }

//   logger.info('AI Tip generation job finished successfully.');
// };

// /**
//  * [Manual Trigger] Generates and sends a tip for a single, specific user, bypassing eligibility checks.
//  * @param userId The ID of the user to process.
//  */
// export const generateAndSendTipForSingleUser = async (userId: string) => {
//   logger.info(`[Manual Trigger] Starting AI Tip generation for user: ${userId}`);

//   const user = await prisma.users.findUnique({
//     where: { id: userId },
//     include: {
//       pets: {
//         include: {
//           species: true,
//           breeds: true,
//         },
//       },
//     },
//   });

//   if (!user) {
//     logger.warn(`[Manual Trigger] User ${userId} not found.`);
//     return;
//   }

//   if (user.pets.length === 0) {
//     logger.info(`[Manual Trigger] User ${user.id} has no pets. Skipping AI tip generation.`);
//     return;
//   }

//   // 1. Randomly select one pet
//   const randomPetIndex = Math.floor(Math.random() * user.pets.length);
//   const selectedPet = user.pets[randomPetIndex];

//   const userPetInfo: UserPetInfo = { userId: user.id, pet: selectedPet };

//   // 2. Process this single user in a "batch" of 1
//   const generatedTips = await batchProcess([userPetInfo]);

//   if (generatedTips.length === 0) {
//     logger.warn(`[Manual Trigger] AI did not generate a tip for user ${userId}.`);
//     return;
//   }

//   const tip = generatedTips[0];
//   logger.info(`[Manual Trigger] Successfully generated tip for user ${userId}.`);

//   // 3. Save notification to DB
//   try {
//     await prisma.notifications.create({
//       data: {
//         id: uuidv4(),
//         user_id: tip.userId,
//         pet_id: tip.petId,
//         tips_title: tip.title,
//         tips_desc: tip.description,
//         status: 'pending' as const,
//       },
//     });
//     logger.info(`[Manual Trigger] Successfully saved notification record for user ${userId}.`);
//   } catch (error) {
//     logger.error(`[Manual Trigger] Failed to save AI tip to the database for user ${userId}:`, error as Error);
//     return;
//   }

//   // 4. Send push notification
//   const pushTokens = await prisma.push_tokens.findMany({
//     where: { user_id: userId },
//     select: { token: true },
//   });

//   if (pushTokens.length === 0) {
//     logger.warn(`[Manual Trigger] No push token found for user ${userId}. Cannot send tip notification.`);
//     return;
//   }

//   const pushMessages: PushMessage[] = pushTokens.map(t => ({
//     to: t.token,
//     title: tip.title,
//     body: tip.description,
//     sound: 'default',
//   }));

//   logger.info(`[Manual Trigger] Sending ${pushMessages.length} push notifications for user ${userId}.`);
//   await expoPushService.send(pushMessages);
//   logger.info(`[Manual Trigger] Push notification job submitted to Expo for user ${userId}.`);
// };

/*
================================================================================
DEPRECATED AND UNUSED CODE
================================================================================

// Define types for the AI-generated tips
export interface AITip {
  title: string;
  description: string;
}

// Fallback tips in case AI API fails
const fallbackTips: AITip[] = [
  {
    title: 'Did you know?',
    description: 'A dog’s sense of smell is 10,000 to 100,000 times more acute than humans!',
  },
  {
    title: 'Pet Care Tip',
    description: 'Regular grooming keeps your pet\'s coat healthy and reduces shedding.',
  },
  {
    title: 'Fun Fact!',
    description: 'Cats can make over 100 different sounds, whereas dogs can only make about 10.',
  },
  {
    title: 'Health Insight',
    description: 'Ensure your pet has access to fresh water throughout the day to stay hydrated.',
  },
];

/**
 * @deprecated This function processes one pet at a time and will be removed. Use the new batch processing flow.
 * Generates a personalized pet care tip using AI, with fallback to static tips.
 * @param pet The pet object for context.
 * @returns An AITip object containing title and description.
 */
// export const generatePersonalizedTip = async (pet: pets & { species: { name: string }, breeds: { name: string } | null }): Promise<AITip> => {
//   try {
//     const formattedAge = formatBirthDateToYearsMonths(pet.birth_date);
//     const petName = pet.pet_name;
//     const speciesName = pet.species.name;
//     const breedName = pet.breeds?.name || 'unknown breed';

//     // Randomly select a topic to make tips varied
//     const topics = [
//       'a fun fact',
//       'a little-known fact',
//       'an interesting tip',
//       'a surprising piece of information',
//     ];
//     const randomTopic = topics[Math.floor(Math.random() * topics.length)];

//     const prompt = `
//     You are a friendly and knowledgeable veterinary assistant AI, providing lighthearted pet care tips.

//     INSTRUCTIONS:
//     1. Generate a short, friendly, and informative notification message about ${randomTopic} for a pet named ${petName}.
//     2. Focus on facts or tips related to ${speciesName}s, or specifically ${breedName}s if relevant.
//     3. The content should be non-serious, cheerful, and engaging.
//     4. Avoid phrasing it as a reminder or instruction. It should be a piece of knowledge.
//     5. The message should be suitable for a push notification (concise).
//     6. Start the message with a captivating title (e.g., "Did you know?", "Pet Tip!", "Fun Fact!").
//     7. Ensure ${petName}'s name is naturally incorporated into the description to make it personalized.
//     8. You dont need to provide the source of the information.

//     Here is some context about the pet:
//     Name: ${petName}
//     Species: ${speciesName}
//     Breed: ${breedName}
//     Age: ${formattedAge}

//     Example format for output:
//     Title: [Captivating Title]
//     Description: [Personalized, non-serious tip/fact for ${petName}(do not call the receiver with their pet's name)]

//     Now, generate the tip in Thai with the friendly tone as instructed.:
//     `.trim();

//     logger.info(`AI Tip Request for ${petName} (${speciesName}) - Topic: ${randomTopic}`);
//     logger.debug(`Full AI Tip Prompt:
// ${prompt}`);

//     const response = await llm.invoke(prompt);
//     const aiResponseContent = response.content as string;

//     logger.info(`AI Tip Response received successfully for ${petName}.`);
//     logger.debug(`AI Tip Raw Response:
// ${aiResponseContent}`);

//     // Attempt to parse the response into title and description
//     const lines = aiResponseContent.split('\n').filter(line => line.trim() !== '');
//     let title = 'Pet Tip!';
//     let description = 'Check out this interesting fact about your pet!';

//     // Basic parsing assuming "Title: " and "Description: " format
//     const titleLine = lines.find(line => line.toLowerCase().startsWith('title:'));
//     const descLine = lines.find(line => line.toLowerCase().startsWith('description:'));

//     if (titleLine) {
//       title = titleLine.replace(/title:/i, '').trim();
//     }
//     if (descLine) {
//       description = descLine.replace(/description:/i, '').trim();
//     } else {
//       // If no "Description:" line, use the first non-title line as description
//       const firstNonTitleLine = lines.find(line => !line.toLowerCase().startsWith('title:'));
//       if (firstNonTitleLine) {
//         description = firstNonTitleLine.trim();
//       } else if (lines.length > 0) {
//         // If there's only a title line, use that as the description
//         description = lines[0].replace(/title:/i, '').trim();
//       }
//     }

//     // Ensure description is personalized even if AI misses it
//     if (!description.includes(petName)) {
//       description = `Here's a fun fact for ${petName}: ${description}`;
//     }
//     // Trim to fit notification length
//     description = description.substring(0, 200);
//     if (title.length > 50) {
//       title = title.substring(0, 47) + '...';
//     }

//     return { title, description };
//   } catch (error) {
//     logger.error(`Error generating personalized AI tip for pet ${pet.id}:`, error as Error);

//     const randomFallback = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
//     logger.info(`Falling back to static tip for pet ${pet.id}.`);
//     return randomFallback;
//   }
// };
