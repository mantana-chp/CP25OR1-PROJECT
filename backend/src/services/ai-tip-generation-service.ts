import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { config } from '../config';
import { logger } from '../libs/logger';
import { pets } from '../generated/prisma/client';
import { formatBirthDateToYearsMonths } from '../shared/utils';

// Initialize the LLM outside the function to reuse the instance
const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: config.google.apiKey,
  temperature: 0.8, // Slightly higher temperature for more creative tips
});

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
 * Generates a personalized pet care tip using AI, with fallback to static tips.
 * @param pet The pet object for context.
 * @returns An AITip object containing title and description.
 */
export const generatePersonalizedTip = async (pet: pets & { species: { name: string }, breeds: { name: string } | null }): Promise<AITip> => {
  try {
    const formattedAge = formatBirthDateToYearsMonths(pet.birth_date);
    const petName = pet.pet_name;
    const speciesName = pet.species.name;
    const breedName = pet.breeds?.name || 'unknown breed';

    // Randomly select a topic to make tips varied
    const topics = [
      'a fun fact',
      'a little-known fact',
      'an interesting tip',
      'a surprising piece of information',
    ];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    const prompt = `
    You are a friendly and knowledgeable veterinary assistant AI, providing lighthearted pet care tips.

    INSTRUCTIONS:
    1. Generate a short, friendly, and informative notification message about ${randomTopic} for a pet named ${petName}.
    2. Focus on facts or tips related to ${speciesName}s, or specifically ${breedName}s if relevant.
    3. The content should be non-serious, cheerful, and engaging.
    4. Avoid phrasing it as a reminder or instruction. It should be a piece of knowledge.
    5. The message should be suitable for a push notification (concise).
    6. Start the message with a captivating title (e.g., "Did you know?", "Pet Tip!", "Fun Fact!").
    7. Ensure ${petName}'s name is naturally incorporated into the description to make it personalized.
    8. You dont need to provide the source of the information.

    Here is some context about the pet:
    Name: ${petName}
    Species: ${speciesName}
    Breed: ${breedName}
    Age: ${formattedAge}

    Example format for output:
    Title: [Captivating Title]
    Description: [Personalized, non-serious tip/fact for ${petName}(do not call the receiver with their pet's name)]

    Now, generate the tip in Thai with the friendly tone as instructed.:
    `.trim();

    logger.info(`AI Tip Request for ${petName} (${speciesName}) - Topic: ${randomTopic}`);
    logger.debug(`Full AI Tip Prompt:
${prompt}`);

    const response = await llm.invoke(prompt);
    const aiResponseContent = response.content as string;

    logger.info(`AI Tip Response received successfully for ${petName}.`);
    logger.debug(`AI Tip Raw Response:
${aiResponseContent}`);

    // Attempt to parse the response into title and description
    const lines = aiResponseContent.split('\n').filter(line => line.trim() !== '');
    let title = 'Pet Tip!';
    let description = 'Check out this interesting fact about your pet!';

    // Basic parsing assuming "Title: " and "Description: " format
    const titleLine = lines.find(line => line.toLowerCase().startsWith('title:'));
    const descLine = lines.find(line => line.toLowerCase().startsWith('description:'));

    if (titleLine) {
      title = titleLine.replace(/title:/i, '').trim();
    }
    if (descLine) {
      description = descLine.replace(/description:/i, '').trim();
    } else {
      // If no "Description:" line, use the first non-title line as description
      const firstNonTitleLine = lines.find(line => !line.toLowerCase().startsWith('title:'));
      if (firstNonTitleLine) {
        description = firstNonTitleLine.trim();
      } else if (lines.length > 0) {
        // If there's only a title line, use that as the description
        description = lines[0].replace(/title:/i, '').trim();
      }
    }

    // Ensure description is personalized even if AI misses it
    if (!description.includes(petName)) {
      description = `Here's a fun fact for ${petName}: ${description}`;
    }
    // Trim to fit notification length
    description = description.substring(0, 200);
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    return { title, description };

  } catch (error) {
    logger.error(`Error generating personalized AI tip for pet ${pet.id}:`, error as Error);

    const randomFallback = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
    logger.info(`Falling back to static tip for pet ${pet.id}.`);
    return randomFallback;
  }
};