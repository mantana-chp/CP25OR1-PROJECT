import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { v4 as uuidv4 } from 'uuid';

import { config } from '../../config';
import prisma from '../../libs/db';
import { logger } from '../../libs/logger';
import { expoPushService, type PushMessage } from '../../services/expo-push-service';
import { getEligibleUsersForTip } from './ai-tips-generation-repository';
import { GeneratedTipsSchema, type GeneratedTip, type UserPetInfo } from './ai-tips-generation-schema';

// Initialize the LLM outside the function to reuse the instance
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: config.google.apiKey,
  temperature: 0.8, // Slightly higher temperature for more creative tips
});

/**
 * Splits an array into chunks of a specified size.
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const batchProcess = async (batch: UserPetInfo[]): Promise<GeneratedTip[]> => {
  const topics = [
    'a fun fact',
    'a little-known fact',
    'an interesting tip',
    'a surprising piece of information',
    'a common myth',
    'a behavioral insight',
    'a quick training tip',
    'a nutritional secret',
    'a weird-but-true fact',
    'a health tip',
  ];

  const petDataForPrompt = batch.map(({ userId, pet }) => {
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    return {
      userId,
      petId: pet.id,
      petName: pet.pet_name,
      species: pet.species.name,
      breed: pet.breeds?.name || 'mixed breed',
      topic: randomTopic,
    };
  });

  const prompt = `
You are an expert veterinary content creator, specializing in engaging, short-form content for pet owners. Your task is to generate push notification content in Thai.

**Core Objective:** For each pet, generate a push notification containing a fun fact or tip about the specified **topic**, structured as a question and answer.

**Content Rules:**
1.  **Language:** MUST be in Thai (ภาษาไทย).
2.  **Title Rule:** The title MUST be a short, friendly, and intriguing question about the pet, based on its assigned **topic**. Include the pet's name. Make the tone warm and personal, not robotic. Vary the sentence structure between different pets to avoid sounding repetitive.
3.  **Description Rule (Very Important):** The description MUST provide a clear, concise, and friendly answer to the exact question asked in the title.
4.  **Tone:** Friendly, informative, and engaging.

**Input Data:**
Here is the list of pets and their assigned topics to generate notifications for:
${JSON.stringify(petDataForPrompt, null, 2)}

**Output Format (Strict Requirement):**
Your response MUST be a valid JSON array of objects, with no surrounding text or explanations. Each object in the array must correspond to a pet in the input list and follow this exact structure:
[
  {
    "userId": "the-user-id-from-input",
    "petId": "the-pet-id-from-input",
    "title": "Thai question about the topic including pet's name",
    "description": "Thai answer to the question in the title"
  }
]
`.trim();

  try {
    logger.info(`[AITipsService] Sending batch request to AI for ${batch.length} pets.`);
    logger.debug(`[AITipsService] Full AI batch prompt:
${prompt}`);

    const llmWithJsonOutput = llm.withStructuredOutput(GeneratedTipsSchema);

    const response = await llmWithJsonOutput.invoke(prompt);

    logger.info(`[AITipsService] AI batch response received successfully. Generated ${response.length} tips.`);
    logger.debug(`[AITipsService] AI batch raw response:
${JSON.stringify(response, null, 2)}`);

    return response;
  } catch (error) {
    logger.error('[AITipsService] Error processing AI batch request:', error as Error);
    return [];
  }
};

export const generateAndSendAITips = async () => {
  logger.info('[AITipsService] Starting AI Tip generation job.');

  const usersWithPets = await getEligibleUsersForTip();
  if (usersWithPets.length === 0) {
    logger.info('[AITipsService] No eligible users found for AI tips today. Job finished.');
    return;
  }

  const BATCH_SIZE = 20;
  const userBatches = chunkArray(usersWithPets, BATCH_SIZE);

  const allGeneratedTips: GeneratedTip[] = [];
  for (const batch of userBatches) {
    try {
      const tips = await batchProcess(batch);
      allGeneratedTips.push(...tips);
    } catch (e) {
      logger.error('[AITipsService] A batch failed to process', e as Error);
    }
  }

  if (allGeneratedTips.length === 0) {
    logger.warn('[AITipsService] AI did not generate any tips across all batches. Job finished.');
    return;
  }

  logger.info(`[AITipsService] Successfully generated ${allGeneratedTips.length} tips in total.`);

  const notificationsToCreate = allGeneratedTips.map(tip => ({
    id: uuidv4(),
    user_id: tip.userId,
    pet_id: tip.petId,
    tips_title: tip.title,
    tips_desc: tip.description,
    status: 'pending' as const,
  }));

  try {
    const createResult = await prisma.notifications.createMany({
      data: notificationsToCreate,
    });
    logger.info(`[AITipsService] Successfully saved ${createResult.count} notification records to the database.`);
  } catch (error) {
    logger.error('[AITipsService] Failed to save AI tips to the database:', error as Error);
    return;
  }

  const userIds = allGeneratedTips.map(tip => tip.userId);
  const userPushTokens = await prisma.push_tokens.findMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
    select: {
      user_id: true,
      token: true,
    },
  });

  const tokenMap = new Map<string, string[]>();
  userPushTokens.forEach(t => {
    const existing = tokenMap.get(t.user_id) || [];
    if (!existing.includes(t.token)) {
      existing.push(t.token);
    }
    tokenMap.set(t.user_id, existing);
  });

  const pushMessages: PushMessage[] = [];
  for (const tip of allGeneratedTips) {
    const tokens = tokenMap.get(tip.userId);
    if (tokens && tokens.length > 0) {
      tokens.forEach(pushToken => {
        pushMessages.push({
          to: pushToken,
          title: tip.title,
          body: tip.description,
          sound: 'default',
        });
      });
    } else {
      logger.warn(`[AITipsService] No push token found for user ${tip.userId}. Cannot send tip notification.`);
    }
  }

  if (pushMessages.length > 0) {
    logger.info(`[AITipsService] Sending ${pushMessages.length} push notifications via Expo.`);
    await expoPushService.send(pushMessages);
    logger.info('[AITipsService] Push notification job submitted to Expo.');
  }

  logger.info('[AITipsService] AI Tip generation job finished successfully.');
};

export const generateAndSendTipForSingleUser = async (userId: string) => {
  logger.info(`[AITipsService] [Manual Trigger] Starting AI Tip generation for user: ${userId}`);

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      pets: {
        include: {
          species: true,
          breeds: true,
        },
      },
    },
  });

  if (!user) {
    logger.warn(`[AITipsService] [Manual Trigger] User ${userId} not found.`);
    return;
  }

  if (user.pets.length === 0) {
    logger.info(`[AITipsService] [Manual Trigger] User ${user.id} has no pets. Skipping AI tip generation.`);
    return;
  }

  const randomPetIndex = Math.floor(Math.random() * user.pets.length);
  const selectedPet = user.pets[randomPetIndex];

  const userPetInfo: UserPetInfo = { userId: user.id, pet: selectedPet };

  const generatedTips = await batchProcess([userPetInfo]);

  if (generatedTips.length === 0) {
    logger.warn(`[AITipsService] [Manual Trigger] AI did not generate a tip for user ${userId}.`);
    return;
  }

  const tip = generatedTips[0];
  logger.info(`[AITipsService] [Manual Trigger] Successfully generated tip for user ${userId}.`);

  try {
    await prisma.notifications.create({
      data: {
        id: uuidv4(),
        user_id: tip.userId,
        pet_id: tip.petId,
        tips_title: tip.title,
        tips_desc: tip.description,
        status: 'pending' as const,
      },
    });
    logger.info(`[AITipsService] [Manual Trigger] Successfully saved notification record for user ${userId}.`);
  } catch (error) {
    logger.error(`[AITipsService] [Manual Trigger] Failed to save AI tip to the database for user ${userId}:`, error as Error);
    return;
  }

  const pushTokens = await prisma.push_tokens.findMany({
    where: { user_id: userId },
    select: { token: true },
  });

  if (pushTokens.length === 0) {
    logger.warn(`[AITipsService] [Manual Trigger] No push token found for user ${userId}. Cannot send tip notification.`);
    return;
  }

  const pushMessages: PushMessage[] = pushTokens.map(t => ({
    to: t.token,
    title: tip.title,
    body: tip.description,
    sound: 'default',
  }));

  logger.info(`[AITipsService] [Manual Trigger] Sending ${pushMessages.length} push notifications for user ${userId}.`);
  await expoPushService.send(pushMessages);
  logger.info('[AITipsService] [Manual Trigger] Push notification job submitted to Expo for user ${userId}.');
};