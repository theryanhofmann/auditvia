// Quick test script to verify OpenAI key works
require('dotenv').config({ path: '.env.local' });

const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY;

console.log('\n🔍 Testing OpenAI Integration...\n');
console.log('API Key present:', !!apiKey);
console.log('API Key starts with sk-:', apiKey?.startsWith('sk-'));
console.log('API Key length:', apiKey?.length);

if (!apiKey) {
  console.log('\n❌ No API key found in .env.local');
  process.exit(1);
}

const openai = new OpenAI({ apiKey });

async function test() {
  try {
    console.log('\n🔄 Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "Hello from Auditvia!" in exactly 3 words.' }],
      max_tokens: 20
    });
    
    console.log('✅ OpenAI API Response:', completion.choices[0].message.content);
    console.log('✅ Tokens used:', completion.usage.total_tokens);
    console.log('\n🎉 OpenAI integration is working!\n');
  } catch (error) {
    console.error('\n❌ OpenAI API Error:', error.message);
    console.log('\nCheck:');
    console.log('- Is the API key valid?');
    console.log('- Do you have credits in your OpenAI account?');
    console.log('- Is your network connection working?\n');
    process.exit(1);
  }
}

test();

