#!/usr/bin/env tsx

import 'dotenv/config';
import { connectDatabase, getDatabasePool } from '../server/src/database/connection';

async function diagnoseGoogleDiscovery() {
  try {
    console.log('--- Google Discovery Diagnosis ---');
    
    // 1. Check what's in the DB
    await connectDatabase();
    const db = getDatabasePool();
    
    const res = await db.query("SELECT name, api_key_encrypted FROM ai_providers WHERE provider_type = 'google'");
    if (res.rows.length === 0) {
      console.log('No Google provider found in DB');
      return;
    }
    
    const row = res.rows[0];
    console.log(`Provider: ${row.name}`);
    
    // 2. Try to decrypt
    const decrypt = (key: string) => {
      try {
        // Only try to decrypt if it looks like base64-encoded
        // A simple check: if it starts with the known Google prefix, it's not base64
        if (key.startsWith('AIza')) return key;
        
        const decoded = Buffer.from(key, 'base64').toString('utf-8');
        // Check if the decoded value looks like a Google API key
        if (decoded.startsWith('AIza')) return decoded;
        return key;
      } catch {
        return key;
      }
    };
    
    const apiKey = decrypt(row.api_key_encrypted);
    console.log(`Decrypted API Key starts with: ${apiKey.substring(0, 10)}...`);
    
    // 3. Try real fetch
    console.log('Fetching from Google API...');
    const url = 'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`Error: ${response.status} ${response.statusText}`);
      console.log(await response.text());
    } else {
      const data = await response.json() as any;
      console.log(`Total models returned by API: ${data.models?.length || 0}`);
      
      const filtered = data.models?.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent') || 
        m.supportedGenerationMethods?.includes('predict')
      );
      
      console.log(`Models after filtering: ${filtered?.length || 0}`);
      if (filtered && filtered.length > 0) {
        console.log('First 10 models (filtered):');
        console.log(filtered.slice(0, 10).map((m: any) => m.name));
      }
    }
    
    await db.end();
  } catch (error) {
    console.error('Diagnosis failed:', error);
  }
}

diagnoseGoogleDiscovery();
