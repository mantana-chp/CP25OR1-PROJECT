import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { config } from '../../config';
import { logger } from '../../libs/logger';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let vectorStore: PineconeStore | null = null;

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-001',
  apiKey: config.google.apiKey,
});

const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

// ---------------------------------------------------------------------------
// Vector store initialization
// ---------------------------------------------------------------------------

export const initializeVectorStore = async (): Promise<PineconeStore> => {
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

// ---------------------------------------------------------------------------
// Document retrieval
// ---------------------------------------------------------------------------

export const getRelevantDocs = async (query: string, k: number = 3) => {
  const store = await initializeVectorStore();
  return await store.similaritySearch(query, k);
};
