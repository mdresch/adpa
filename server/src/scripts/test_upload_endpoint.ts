import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import FormData from 'form-data';
import * as dotenv from 'dotenv';
import { connectDatabase, pool } from '../database/connection';

dotenv.config();

async function run() {
  await connectDatabase();
  
  // Find a project
  const projResult = await pool.query('SELECT id, owner_id FROM projects LIMIT 1');
  if (projResult.rows.length === 0) {
    console.error("No projects found!");
    process.exit(1);
  }
  const { id: projectId, owner_id: ownerId } = projResult.rows[0];
  console.log(`Using project ID: ${projectId}, owner ID: ${ownerId}`);
  
  // Generate a dev token
  const secret = process.env.JWT_SECRET || 'adpa-secret-key-change-in-production-2025';
  const token = jwt.sign(
    { userId: ownerId, role: 'super_admin' },
    secret,
    { expiresIn: '1h' }
  );
  
  // Prepare form data
  const form = new FormData();
  form.append('type', 'reference_document');
  form.append('title', 'Test Uploaded File');
  form.append('file', Buffer.from('Hello world context file \x00 content with null byte'), {
    filename: 'test_file.txt',
    contentType: 'text/plain',
  });
  
  try {
    console.log("Sending POST request to endpoint...");
    const url = `http://127.0.0.1:5000/api/v1/projects/${projectId}/context-items`;
    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log("SUCCESS!", response.status, response.data);
  } catch (error: any) {
    console.error("REQUEST FAILED:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
