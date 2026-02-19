import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config';
import { logger } from '../libs/logger';

export class PineconeService {
  private pc: Pinecone;
  private indexName: string;

  constructor() {
    if (!config.pinecone.apiKey) {
      logger.error('Pinecone API Key is missing');
      throw new Error('Pinecone API Key is missing');
    }
    this.pc = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
    this.indexName = config.pinecone.indexName;
  }

  async describeIndex() {
    try {
      const index = await this.pc.describeIndex(this.indexName);
      return index;
    } catch (error) {
      logger.error('Error describing Pinecone index:', error as Error);
      throw error;
    }
  }

  async createIndexIfNotExists() {
    try {
      const indexList = await this.pc.listIndexes();
      const exists = indexList.indexes?.some(idx => idx.name === this.indexName);

      if (!exists) {
        logger.info(`Creating Pinecone index: ${this.indexName}`);
        await this.pc.createIndex({
          name: this.indexName,
          dimension: 3072, // according to google docs
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        logger.info('Pinecone index created successfully');
      } else {
        logger.info(`Pinecone index ${this.indexName} already exists`);
      }
    } catch (error) {
      logger.error('Error creating Pinecone index:', error as Error);
      throw error;
    }
  }

  getIndex() {
    return this.pc.index(this.indexName);
  }

  async upsert(vectors: { id: string; values: number[]; metadata?: any }[]) {
    try {
      const index = this.getIndex();
      await index.upsert(vectors);
    } catch (error) {
      logger.error('Error upserting to Pinecone:', error as Error);
      throw error;
    }
  }

  async query(vector: number[], topK: number = 5, filter?: any) {
    try {
      const index = this.getIndex();
      const queryResponse = await index.query({
        vector,
        topK,
        includeMetadata: true,
        filter,
      });
      return queryResponse;
    } catch (error) {
      logger.error('Error querying Pinecone:', error as Error);
      throw error;
    }
  }
}