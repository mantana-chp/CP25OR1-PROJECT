import { chatWithAI } from '../features/ai-chat/ai-chat-service';
import { logger } from '../libs/logger';

async function testScenarios() {
  try {
    logger.info('=== SCENARIO 1: Irrelevant Query (Parrot) ===');
    // Expect: Knowledge Base section should be MISSING in the debug log (if visible) or just a general answer.
    const response1 = await chatWithAI("อยากจะลองเลี้ยงนกแก้วดู มีนกแก้วแนะนำมั้ย");
    console.log('AI Response 1:', response1);

    console.log('
--------------------------------------------------
');

    logger.info('=== SCENARIO 2: Relevant Query (Dog Vaccine) ===');
    // Expect: Knowledge Base section SHOULD be present in the prompt.
    const response2 = await chatWithAI("สุนัขต้องฉีดวัคซีนพิษสุนัขบ้าตอนกี่เดือน");
    console.log('AI Response 2:', response2);

  } catch (error) {
    console.error('Test Failed:', error);
  }
}

testScenarios();
