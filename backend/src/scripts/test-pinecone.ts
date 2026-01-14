import { PineconeService } from '../services/pinecone-service';
import { logger } from '../libs/logger';

async function testPinecone() {
  const pineconeService = new PineconeService();

  logger.info('Testing Pinecone Index Status...');
  try {
    await pineconeService.createIndexIfNotExists();
    const description = await pineconeService.describeIndex();
    console.log('Index Description:', JSON.stringify(description, null, 2));

    logger.info('Testing Pinecone Upsert & Query...');
    const testVector = new Array(768).fill(0).map(() => Math.random());
    const id = 'test-vector-1';

    await pineconeService.upsert([{
      id,
      values: testVector,
      metadata: { text: 'This is a test vector' }
    }]);
    logger.info('Upserted test vector');

    const queryResponse = await pineconeService.query(testVector, 1);
    console.log('Query Result:', JSON.stringify(queryResponse, null, 2));

  } catch (error) {
    console.error('Pinecone Test Error:', error);
  }
}

testPinecone();
