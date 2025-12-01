/**
 * Script to delete the Guest User (Onboarding Guest User (System))
 * 
 * This script removes the guest user account that was previously used
 * for anonymous onboarding assessments. All users must now register
 * before accessing onboarding features.
 * 
 * Usage: ts-node server/scripts/delete-guest-user.ts
 */

import { pool, connectDatabase } from '../src/database/connection';
import { logger } from '../src/utils/logger';

async function deleteGuestUser() {
  try {
    logger.info('Connecting to database...');
    await connectDatabase();
    
    if (!pool) {
      throw new Error('Database connection failed - pool is null');
    }
    
    logger.info('Database connected successfully');

    // Find the guest user
    const guestEmail = 'onboarding-guest@system.local';
    const findResult = await pool.query(
      `SELECT id, email, name FROM users WHERE email = $1`,
      [guestEmail]
    );

    if (findResult.rows.length === 0) {
      logger.info('Guest user not found. Nothing to delete.');
      return;
    }

    const guestUser = findResult.rows[0];
    logger.info('Found guest user:', {
      id: guestUser.id,
      email: guestUser.email,
      name: guestUser.name
    });

    // Check for projects owned by guest user
    const projectsResult = await pool.query(
      `SELECT COUNT(*) as count FROM projects WHERE owner_id = $1 OR created_by = $1`,
      [guestUser.id]
    );
    const projectCount = parseInt(projectsResult.rows[0].count);

    // Check for documents created by guest user
    const documentsResult = await pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE created_by = $1`,
      [guestUser.id]
    );
    const documentCount = parseInt(documentsResult.rows[0].count);

    // Check for upload batches by guest user
    const batchesResult = await pool.query(
      `SELECT COUNT(*) as count FROM upload_batches WHERE uploaded_by = $1`,
      [guestUser.id]
    );
    const batchCount = parseInt(batchesResult.rows[0].count);

    logger.info('Guest user data summary:', {
      projects: projectCount,
      documents: documentCount,
      uploadBatches: batchCount
    });

    if (projectCount > 0 || documentCount > 0 || batchCount > 0) {
      logger.warn('Guest user has associated data. Consider reassigning ownership before deletion.');
      logger.warn('This script will NOT delete the user if they have data. Exiting.');
      logger.warn('To force deletion, you must manually reassign or delete the associated data first.');
      return;
    }

    // Delete the guest user
    const deleteResult = await pool.query(
      `DELETE FROM users WHERE id = $1`,
      [guestUser.id]
    );

    if (deleteResult.rowCount > 0) {
      logger.info('✅ Successfully deleted guest user:', {
        id: guestUser.id,
        email: guestUser.email
      });
    } else {
      logger.warn('No rows deleted. User may have already been removed.');
    }

  } catch (error: any) {
    logger.error('Error deleting guest user:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    if (pool) {
      await pool.end();
      logger.info('Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  deleteGuestUser()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export { deleteGuestUser };

