import { GeminiService } from '../services/gemini-service';
import { logger } from '../libs/logger';

async function testGemini() {
  const geminiService = new GeminiService();

  logger.info('Testing Gemini Text Generation...');
  try {
    const text = await geminiService.generateText('Say "Hello World" from Gemini!');
    console.log('Gemini Response:', text);
  } catch (error) {
    console.error('Gemini Generation Error:', error);
  }

  logger.info('Testing Gemini Embedding...');
  try {
    const embedding = await geminiService.getEmbedding('Hello World');
    console.log('Embedding Length:', embedding.length);
    console.log('First 5 values:', embedding.slice(0, 5));
  } catch (error) {
    console.error('Gemini Embedding Error:', error);
  }
}

testGemini();
