import dotenv from 'dotenv';
dotenv.config();

const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAIProviders() {
  try {
    console.log('\n🤖 AI PROVIDER CONFIGURATION:\n');

    await db.initDb()
    const result = await db.query(`
      SELECT 
        name,
        type,
        is_active,
        priority,
        config->>'model' as model,
        CASE 
          WHEN api_key IS NOT NULL AND LENGTH(api_key) > 0 THEN 'CONFIGURED ✅'
          ELSE 'MISSING ❌'
        END as api_key_status,
        health_status,
        last_used_at,
        created_at
      FROM ai_providers
      ORDER BY priority DESC, name
    `);

    if (result.rows.length === 0) {
      console.log('❌ NO AI PROVIDERS CONFIGURED!\n');
      console.log('You need to add AI providers via the ADPA UI or database.\n');
    } else {
      result.rows.forEach((provider, idx) => {
        console.log(`${idx + 1}. ${provider.name}`);
        console.log(`   Type: ${provider.type}`);
        console.log(`   Status: ${provider.is_active ? '✅ ACTIVE' : '⏸️ INACTIVE'}`);
        console.log(`   API Key: ${provider.api_key_status}`);
        console.log(`   Priority: ${provider.priority}`);
        console.log(`   Model: ${provider.model || 'default'}`);
        console.log(`   Health: ${provider.health_status || 'unknown'}`);
        console.log(`   Last Used: ${provider.last_used_at || 'never'}`);
        console.log('');
      });
    }

    console.log('\n📊 SUMMARY:\n');
    const active = result.rows.filter(p => p.is_active).length;
    const withKeys = result.rows.filter(p => p.api_key_status.includes('✅')).length;
    
    console.log(`Total Providers: ${result.rows.length}`);
    console.log(`Active: ${active}`);
    console.log(`With API Keys: ${withKeys}`);
    console.log('');

    if (withKeys === 0) {
      console.log('⚠️  WARNING: No AI providers have API keys configured!');
      console.log('   Entity extraction will fail until you add at least one API key.\n');
    }

    await db.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAIProviders();

