import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { logger } from '../libs/logger';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private embeddingModel: any;

  constructor() {
    if (!config.google.apiKey) {
      logger.error('Google API Key is missing');
      throw new Error('Google API Key is missing');
    }
    this.genAI = new GoogleGenerativeAI(config.google.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Error generating text with Gemini:', error as Error);
      throw error;
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      logger.error('Error generating embedding with Gemini:', error as Error);
      throw error;
    }
  }
}
