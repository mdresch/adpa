import * as fs from 'fs';
import * as path from 'path';

const logFile = path.join(__dirname, '../logs/combined.log');

console.log('\n🔍 EXTRACTION ERRORS ANALYSIS\n');

try {
  const logContent = fs.readFileSync(logFile, 'utf-8');
  const lines = logContent.split('\n');
  
  const errors: { [key: string]: string[] } = {};
  
  // Find all extraction errors
  lines.forEach((line, idx) => {
    if (line.includes('EXTRACTION') && line.includes('failed')) {
      // Extract entity type
      const typeMatch = line.match(/\[EXTRACTION-([A-Z-]+)\]/);
      if (typeMatch) {
        const entityType = typeMatch[1];
        
        // Extract error message
        const errorMatch = line.match(/"error":"([^"]+)"/);
        if (errorMatch) {
          const errorMsg = errorMatch[1];
          
          if (!errors[entityType]) {
            errors[entityType] = [];
          }
          errors[entityType].push(errorMsg);
        }
      }
    }
  });
  
  // Display results
  if (Object.keys(errors).length === 0) {
    console.log('✅ No extraction errors found!\n');
  } else {
    console.log('❌ FAILED ENTITY EXTRACTIONS:\n');
    
    let totalFailures = 0;
    Object.entries(errors).forEach(([type, errorList]) => {
      console.log(`${type}:`);
      console.log(`  Failures: ${errorList.length}`);
      
      // Show unique error types
      const uniqueErrors = [...new Set(errorList)];
      uniqueErrors.forEach(error => {
        if (error.includes('JSON')) {
          console.log(`  ⚠️  JSON parsing error`);
        } else if (error.includes('quota') || error.includes('capacity')) {
          console.log(`  ⚠️  Rate limit / capacity issue`);
        } else {
          console.log(`  ⚠️  ${error.substring(0, 80)}...`);
        }
      });
      console.log('');
      totalFailures += errorList.length;
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Failed entity types: ${Object.keys(errors).length}`);
    console.log(`   Total failure instances: ${totalFailures}\n`);
    
    // Categorize by error type
    let jsonErrors = 0;
    let rateLimitErrors = 0;
    let otherErrors = 0;
    
    Object.values(errors).forEach(errorList => {
      errorList.forEach(err => {
        if (err.includes('JSON') || err.includes('position')) jsonErrors++;
        else if (err.includes('quota') || err.includes('capacity') || err.includes('429')) rateLimitErrors++;
        else otherErrors++;
      });
    });
    
    console.log('📈 ERROR BREAKDOWN:');
    console.log(`   JSON parsing errors: ${jsonErrors}`);
    console.log(`   Rate limit errors: ${rateLimitErrors}`);
    console.log(`   Other errors: ${otherErrors}\n`);
    
    if (jsonErrors > 0) {
      console.log('💡 RECOMMENDATION for JSON errors:');
      console.log('   - Try OpenAI (better JSON generation)');
      console.log('   - OR extract in smaller batches');
      console.log('   - OR retry with stricter JSON validation prompts\n');
    }
  }
  
} catch (error: any) {
  console.error('Error reading log file:', error.message);
  process.exit(1);
}

