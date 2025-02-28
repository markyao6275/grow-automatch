import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

/**
 * Get or create the OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('OpenAI API key:', apiKey);
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not set in environment variables');
    }
    
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  
  return openaiClient;
}

/**
 * Call OpenAI API with system and user prompts
 * @param systemPrompt The system prompt
 * @param userPrompt The user prompt
 * @param tools Optional tools for function calling
 * @returns The completion response
 */
export async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  tools?: any[]
) {
  
  try {
    const client = getOpenAIClient();

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.0,
      tools: tools || undefined,
    });
    
    // Log token usage
    if (completion.usage) {
      logTokenUsage(completion.usage.total_tokens);
    }
    
    if (!completion.choices || !completion.choices[0]) {
      return null;
    }
    
    return completion.choices[0].message;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}

/**
 * Log token usage to a file
 * @param tokens Number of tokens used
 */
function logTokenUsage(tokens: number) {
  // Create logs directory if it doesn't exist
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'openai_usage.log');
  fs.appendFileSync(logFile, `${tokens}\n`);
}