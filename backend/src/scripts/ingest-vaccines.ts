import prisma from '../libs/db';
import { GeminiService } from '../services/gemini-service';
import { PineconeService } from '../services/pinecone-service';
import { logger } from '../libs/logger';

const geminiService = new GeminiService();
const pineconeService = new PineconeService();

type VaccineVector = {
  id: string;
  values: number[];
  metadata: {
    text: string;
    type: 'vaccine';
    species: string;
    vaccine_id: number;
  };
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const UPSERT_BATCH_SIZE = parsePositiveInt(
  process.env.PINECONE_UPSERT_BATCH_SIZE,
  100
);

async function ingestVaccines() {
  try {
    logger.info('Starting vaccine ingestion...');
    logger.info(`Pinecone upsert batch size: ${UPSERT_BATCH_SIZE}`);

    // 1. Fetch data
    const vaccines = await prisma.vaccine.findMany({
      include: {
        species: true, // Include species name (e.g., "Dog", "Cat")
      }
    });
    logger.info(`Found ${vaccines.length} vaccines to ingest.`);

    if (vaccines.length === 0) {
      logger.warn('No vaccines found to ingest.');
      return;
    }

    // Ensure index exists before processing vectors.
    await pineconeService.createIndexIfNotExists();

    // 2. Prepare embeddings and upsert in chunks to avoid oversized payloads.
    const vectorBatch: VaccineVector[] = [];
    let totalUpserted = 0;
    let batchNumber = 0;

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

      vectorBatch.push({
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

      if (vectorBatch.length >= UPSERT_BATCH_SIZE) {
        await pineconeService.upsert(vectorBatch);
        totalUpserted += vectorBatch.length;
        batchNumber += 1;

        logger.info(
          `Upserted batch ${batchNumber}: ${vectorBatch.length} vectors (total ${totalUpserted}/${vaccines.length})`
        );

        vectorBatch.length = 0;
      }
    }

    if (vectorBatch.length > 0) {
      await pineconeService.upsert(vectorBatch);
      totalUpserted += vectorBatch.length;
      batchNumber += 1;

      logger.info(
        `Upserted batch ${batchNumber}: ${vectorBatch.length} vectors (total ${totalUpserted}/${vaccines.length})`
      );
    }

    logger.info(`Successfully ingested ${totalUpserted} vaccine records into Pinecone.`);

  } catch (error) {
    logger.error('Error during ingestion:', error as Error);
  } finally {
    await prisma.$disconnect();
  }
}

ingestVaccines();
