import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../../config';
import { logger } from '../../libs/logger';
import { Document } from '@langchain/core/documents';
import prisma from '../../libs/db';
import { formatAgeFromBirthDate } from '../../shared/utils';

// Private module-level state for Singleton-like behavior
let vectorStore: PineconeStore | null = null;

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash',
  apiKey: config.google.apiKey,
  temperature: 0.7,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'text-embedding-004',
  apiKey: config.google.apiKey,
});

const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

/**
 * Initializes the Vector Store if it hasn't been initialized yet.
 */
const initializeVectorStore = async () => {
  if (vectorStore) return vectorStore;
  
  try {
    const pineconeIndex = pinecone.Index(config.pinecone.indexName);
    vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
    return vectorStore;
  } catch (error) {
    logger.error('Failed to initialize VectorStore:', error as Error);
    throw error;
  }
};

/**
 * Main chat function using RAG with optional Pet Context
 */
export const chatWithAI = async (query: string, petId?: string): Promise<string> => {
  const store = await initializeVectorStore();
  let petContext = '';

  try {
    // 1. Fetch Pet Context if petId is provided
    if (petId) {
      const pet = await prisma.pets.findUnique({
        where: { id: petId },
        include: {
          species: true,
          breeds: true,
          reminders: {
            where: {
              reminder_status: 'done',
              is_health: true
            },
            orderBy: {
              status_done_at: 'desc'
            },
            take: 10 // Fetch last 10 health records for context
          }
        }
      });

      if (pet) {
        const age = formatAgeFromBirthDate(pet.birth_date);
        const healthHistory = pet.reminders.map(r => 
          `- ${r.reminder_name} (Date: ${r.status_done_at?.toISOString().split('T')[0]})`
        ).join('\n');

        petContext = (
          `
--- CURRENT PET PROFILE ---
Name: ${pet.pet_name}
Species: ${pet.species.name}
Breed: ${pet.breeds?.name || 'Unknown'}
Gender: ${pet.gender}
Age: ${age}
Weight: ${pet.weight || 'Unknown'} kg

Recent Health History (Vaccines/Checkups):
${healthHistory || 'No recent health records.'}
---------------------------
        `
        );
      }
    }

    // 2. Retrieve relevant documents (Knowledge Base)
    // Use similaritySearchWithScore to filter out irrelevant results
    const resultsWithScore = await store.similaritySearchWithScore(query, 3);
    
    // DEBUG: Log retrieval scores to help tune the threshold
    resultsWithScore.forEach(([doc, score]) => {
        logger.debug(`Retrieval Score: ${score.toFixed(4)} | Content: ${(doc.metadata.text as string)?.substring(0, 50)}...`);
    });

    const threshold = 0.5; // Raised to 0.5 for stricter filtering
    
    const relevantDocs = resultsWithScore
      .filter(([_, score]) => score >= threshold)
      .map(([doc]) => doc);

    const context = relevantDocs
      .map((doc: Document) => doc.pageContent || doc.metadata.text)
      .join('\n\n');

    // 3. Construct Prompt
    const prompt = `
You are a helpful veterinary assistant AI.

INSTRUCTIONS:
1. Analyze the User Question.
2. Check the "KNOWLEDGE BASE" below.
   - IF the knowledge base contains information specifically relevant to the user's question (e.g., vaccine schedules for dogs/cats), USE IT to answer.
   - IF the knowledge base contains information (like dog vaccines) but the user asks about a different topic (like "How to feed a parrot" or "Tiger behavior"), IGNORE the knowledge base completely.
3. If ignoring the knowledge base, answer the question using your own general veterinary knowledge.
4. Do NOT apologize for missing data. Just answer helpfuly.

${petContext ? petContext : ''}

${context ? `--- KNOWLEDGE BASE (Reference Only - Ignore if irrelevant to question) ---
${context}
----------------------------------------------------------------------------` : ''}

User Question: ${query}

Answer:
    `.trim();

    logger.info(`AI Chat Request - Question: "${query}"`);
    logger.debug(`Full AI Prompt:\n${prompt}`);

    // 4. Generate Answer
    const response = await llm.invoke(prompt);
    const answer = response.content as string;

    logger.info(`AI Chat Response received successfully.`);
    logger.debug(`AI Answer:\n${answer}`);

    return answer;

  } catch (error) {
    logger.error('Error in AI Chat service:', error as Error);
    throw error;
  }
};

/**
 * Helper to test retrieval logic
 */
export const getRelevantDocs = async (query: string, k: number = 3) => {
    const store = await initializeVectorStore();
    return await store.similaritySearch(query, k);
};