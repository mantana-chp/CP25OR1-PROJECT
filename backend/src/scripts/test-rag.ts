import { AIChatService } from '../features/ai-chat/ai-chat-service';
import { logger } from '../libs/logger';

async function testRAG() {
  const chatService = new AIChatService();

  const query = "What vaccines does a dog need?";
  logger.info(`Testing RAG with query: "${query}"`);

  try {
    // 1. Test Retrieval Logic
    logger.info('--- Retrieval Test ---');
    const docs = await chatService.testRetrieval(query);
    docs.forEach((doc, i) => {
      console.log(`
Doc ${i + 1}:`);
      console.log(doc.pageContent || doc.metadata.text); // PineconeStore might put text in pageContent or metadata
    });

    // 2. Test Full Chat
    logger.info('\n--- Full Chat Generation Test ---');
    const answer = await chatService.chat(query);
    console.log('\nAI Answer:');
    console.log(answer);

  } catch (error) {
    logger.error('RAG Test Failed:', error as Error);
  }
}

testRAG();
