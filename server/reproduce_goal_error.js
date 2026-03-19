
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function testCreateGoal() {
  const userId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
  const projectId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
  
  // Try to find a real project ID first
  try {
    const projRes = await pool.query('SELECT id FROM projects LIMIT 1');
    const realProjectId = projRes.rows[0]?.id || projectId;
    
    const input = {
      projectId: realProjectId,
      title: 'Test Goal ' + Date.now(),
      description: 'Test description',
      priority: 'medium'
    };

    console.log('Testing createGoal with:', { input, userId });

    const result = await pool.query(`
      INSERT INTO project_goals (
        project_id,
        title,
        description,
        target_date,
        category,
        priority,
        business_quarter,
        success_criteria,
        target_value,
        status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      input.projectId,
      input.title,
      input.description,
      null, // target_date
      null, // category
      input.priority || 'medium',
      null, // business_quarter
      null, // success_criteria
      null, // target_value
      'draft',
      null // created_by (using null instead of dummy UUID for now)
    ]);

    console.log('Success:', result.rows[0]);

  } catch (err) {
    console.error('FAILED to create goal:', err);
  } finally {
    await pool.end();
  }
}

testCreateGoal();
