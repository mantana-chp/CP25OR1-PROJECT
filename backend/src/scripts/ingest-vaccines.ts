import prisma from '../libs/db';
import { GeminiService } from '../services/gemini-service';
import { PineconeService } from '../services/pinecone-service';
import { logger } from '../libs/logger';

const geminiService = new GeminiService();
const pineconeService = new PineconeService();

async function ingestVaccines() {
  try {
    logger.info('Starting vaccine ingestion...');

    // 1. Fetch data
    const vaccines = await prisma.vaccine.findMany({
      include: {
        species: true, // Include species name (e.g., "Dog", "Cat")
      }
    });
    logger.info(`Found ${vaccines.length} vaccines to ingest.`);

    // 2. Prepare vectors
    const vectors = [];

    for (const v of vaccines) {
      // Create a descriptive text for the AI
      // Combining key fields into a natural language paragraph
      const description = `
        Vaccine Name: ${v.vaccine_name} (${v.vaccine_name_th || ''}).
        Species: ${v.species.name} (${v.species.name_th || ''}).
        Type: ${v.vaccine_type}.
        Minimum Age: ${v.min_age_days} days.
        Primary Logic: ${v.primary_series_logic}.
        Dose Count: ${v.primary_target_value}.
        Interval: ${v.primary_interval_days} days.
        Booster Interval: ${v.booster_1_interval_days} days.
        Repeat Interval: ${v.booster_repeat_interval_days} days.
        Source: ${v.reference_source || 'N/A'}.
      `.trim().replace(/\s+/g, ' '); // Clean up whitespace

      logger.info(`Generating embedding for: ${v.vaccine_name}`);

      const embedding = await geminiService.getEmbedding(description);

      vectors.push({
        id: `vaccine-${v.id}`, // Unique ID for Pinecone
        values: embedding,
        metadata: {
          // We store the text so we can retrieve it later for the Context
          text: description,
          type: 'vaccine',
          species: v.species.name,
          vaccine_id: v.id
        }
      });
    }

    // 3. Upsert to Pinecone
    if (vectors.length > 0) {
      // Pinecone has a limit on request size, but for 4 rows, one batch is fine.
      // For larger datasets, we would batch this (e.g., chunks of 100).
      await pineconeService.createIndexIfNotExists(); // Ensure index exists
      await pineconeService.upsert(vectors);
      logger.info(`Successfully ingested ${vectors.length} vaccine records into Pinecone.`);
    } else {
      logger.warn('No vaccines found to ingest.');
    }

  } catch (error) {
    logger.error('Error during ingestion:', error as Error);
  } finally {
    await prisma.$disconnect();
  }
}

ingestVaccines();
