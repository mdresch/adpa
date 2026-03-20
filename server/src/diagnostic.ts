const ai = require('ai');
console.log('AI SDK Version:', require('ai/package.json').version);
console.log('AI SDK Exports:', Object.keys(ai).filter(k => k.includes('Text')));

try {
  const { generateText } = require('ai');
  console.log('generateText is available');
} catch (e) {
  console.log('generateText is not available');
}
