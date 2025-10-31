const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({ 
  connectionString,
  ssl: (connectionString?.includes('supabase.co') || connectionString?.includes('azure') || process.env.DB_SSL === 'true')
    ? { rejectUnauthorized: false }
    : false
});

async function checkBudgetResources() {
  try {
    console.log('🔍 Checking budget resources for EcoTrack...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        type,
        allocation,
        description
      FROM resources
      WHERE project_id = '172508c6-346e-49b5-9ae6-47291f941f41'
      AND type = 'budget'
      ORDER BY name
    `);
    
    console.log(`📊 Found ${result.rows.length} budget resource(s):\n`);
    
    result.rows.forEach((r, i) => {
      console.log(`${i + 1}. Name: "${r.name}"`);
      console.log(`   Type: ${r.type}`);
      console.log(`   Allocation: "${r.allocation}"`);
      console.log(`   Description: "${r.description || 'N/A'}"`);
      console.log('');
    });
    
    // Test the parser
    console.log('🧪 Testing currency parser:\n');
    
    function parseCurrencyToNumber(value) {
      if (typeof value === 'number') return value;
      if (!value) return NaN;
      let s = value.toString().trim();
      
      s = s.replace(/[€$£\s\u00A0]/g, '');
      
      const lastComma = s.lastIndexOf(',');
      const lastDot = s.lastIndexOf('.');
      
      if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
          s = s.replace(/\./g, '').replace(',', '.');
        } else {
          s = s.replace(/,/g, '');
        }
      } else if (lastComma !== -1) {
        const afterComma = s.substring(lastComma + 1);
        if (afterComma.length === 3) {
          s = s.replace(/,/g, '');
        } else {
          s = s.replace(',', '.');
        }
      } else {
        s = s.replace(/,/g, '');
      }
      
      const n = parseFloat(s);
      return isNaN(n) ? NaN : n;
    }
    
    let total = 0;
    result.rows.forEach((r, i) => {
      const parsed = parseCurrencyToNumber(r.name);
      console.log(`${i + 1}. "${r.name}" → ${parsed}`);
      if (!isNaN(parsed)) total += parsed;
    });
    
    console.log(`\n💰 Total Budget: €${total.toLocaleString('en-US')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBudgetResources();

