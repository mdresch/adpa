const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * RPAS-CM Governance Validator
 * Validates a JSON attestation against the TAR-COL schema.
 */

function log(msg) {
  console.log(`[Governance Validator] ${msg}`);
}

function error(msg) {
  console.error(`[Governance Validator] ERROR: ${msg}`);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Args Parsing
// -----------------------------------------------------------------------------
const args = process.argv.slice(2);
let schemaPath = '';
let dataPath = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--schema' && args[i + 1]) {
    schemaPath = args[i + 1];
    i++;
  } else if (args[i] === '--data' && args[i + 1]) {
    dataPath = args[i + 1];
    i++;
  }
}

if (!schemaPath || !dataPath) {
  error('Usage: node scripts/validate-governance.js --schema <path> --data <path>');
}

// -----------------------------------------------------------------------------
// Validation Logic
// -----------------------------------------------------------------------------
try {
  const schema = JSON.parse(fs.readFileSync(path.resolve(schemaPath), 'utf8'));
  const data = JSON.parse(fs.readFileSync(path.resolve(dataPath), 'utf8'));

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    log('Validation failed!');
    validate.errors.forEach((err) => {
      console.error(`  - ${err.instancePath} ${err.message}`);
      if (err.params) {
        console.error(`    Params: ${JSON.stringify(err.params)}`);
      }
    });
    process.exit(1);
  }

  log('Validation PASSED. Attribute compliance verified.');
  process.exit(0);

} catch (err) {
  error(`Execution failed: ${err.message}`);
}
