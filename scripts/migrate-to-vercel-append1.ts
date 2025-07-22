/**
 * Migrate schema to Vercel Postgres
 */
async function migrateSchema() {
  try {
    logger.info('Migrating schema to Vercel Postgres...');
    
    // Read existing schema
    const schemaPath = join(process.cwd(), 'server/src/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema
    try {
      await sql.query(schema);
      logger.success('Schema migration completed');
    } catch (error) {
      logger.warn('Full schema execution failed, trying statement by statement...');
      
      // Split by semicolon but be careful with functions
      const statements = schema
        .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/) // Split on semicolons not inside quotes
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        try {
          if (statement.trim()) {
            await sql.query(statement);
          }
        } catch (stmtError: any) {
          // Ignore "already exists" errors
          if (stmtError.message && stmtError.message.includes('already exists')) {
            logger.info(`Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
            throw stmtError;
          }
        }
      }
      
      logger.success('Schema migration completed (statement by statement)');
    }
    
    // Apply additional migrations
    await applyAdditionalMigrations();
    
  } catch (error) {
    logger.error('Schema migration failed:', error);
    throw error;
  }
}

/**
 * Apply additional migrations from the migrations directory
 */
async function applyAdditionalMigrations() {
  try {
    logger.info('Applying additional migrations...');
    
    // Create migrations table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Record initial schema migration
    await sql`
      INSERT INTO migrations (name) 
      VALUES ('initial_schema') 
      ON CONFLICT DO NOTHING
    `;
    
    // Apply SharePoint fields migration
    try {
      const sharepointMigrationPath = join(process.cwd(), 'server/src/database/migrations/add_sharepoint_fields.sql');
      const sharepointMigration = readFileSync(sharepointMigrationPath, 'utf-8');
      
      // Check if this migration has already been run
      const migrationCheck = await sql`
        SELECT id FROM migrations WHERE name = 'add_sharepoint_fields'
      `;
      
      if (migrationCheck.rows.length === 0) {
        await sql.query(sharepointMigration);
        await sql`
          INSERT INTO migrations (name) 
          VALUES ('add_sharepoint_fields')
        `;
        logger.success('SharePoint fields migration completed');
      } else {
        logger.info('SharePoint fields migration already applied');
      }
    } catch (error) {
      logger.warn('SharePoint migration failed (may already be applied):', error);
    }
    
    // Apply Confluence fields migration
    try {
      const confluenceMigrationPath = join(process.cwd(), 'server/src/database/migrations/add_confluence_fields.sql');
      const confluenceMigration = readFileSync(confluenceMigrationPath, 'utf-8');
      
      // Check if this migration has already been run
      const confluenceMigrationCheck = await sql`
        SELECT id FROM migrations WHERE name = 'add_confluence_fields'
      `;
      
      if (confluenceMigrationCheck.rows.length === 0) {
        await sql.query(confluenceMigration);
        await sql`
          INSERT INTO migrations (name) 
          VALUES ('add_confluence_fields')
        `;
        logger.success('Confluence fields migration completed');
      } else {
        logger.info('Confluence fields migration already applied');
      }
    } catch (error) {
      logger.warn('Confluence migration failed (may already be applied):', error);
    }
    
    logger.success('Additional migrations completed');
  } catch (error) {
    logger.error('Failed to apply additional migrations:', error);
    throw error;
  }
}