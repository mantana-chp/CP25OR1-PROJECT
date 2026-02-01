import { z } from 'zod';
import { pets } from '../../generated/prisma/client';

// Zod schema for structured output from the AI
export const GeneratedTipSchema = z.object({
  userId: z.string().describe("The user's unique identifier from the input."),
  petId: z.string().describe("The pet's unique identifier from the input."),
  title: z.string().describe('The catchy, personalized Thai question about the pet, designed to create curiosity.'),
  description: z.string().describe('The clear and friendly Thai answer to the question posed in the title.'),
});

export const GeneratedTipsSchema = z.array(GeneratedTipSchema);

// Type alias for the batch processing input
export type UserPetInfo = {
  userId: string;
  pet: pets & {
    species: { name: string };
    breeds: { name: string } | null;
  };
};

// Type alias for the generated tip structure
export type GeneratedTip = z.infer<typeof GeneratedTipSchema>;
