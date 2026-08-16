import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
console.log('Testing Claude API connection...\n');

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY environment variable not set.');
  process.exit(1);
}

const client = new Anthropic({ apiKey });

try {
  const response = await client.messages.create({
    model: 'claude-opus-4-1',
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Say OK' }],
  });
  
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log('✅ Claude API Authentication: SUCCESS');
  console.log('Response:', text);
} catch (error) {
  console.error('❌ Claude API Error:', error.message);
  if (error.status) console.error('Status:', error.status);
}
