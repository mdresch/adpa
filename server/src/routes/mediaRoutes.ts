
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { pool } from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

/**
 * POST /api/media/upload
 * Upload an image file
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { originalname, mimetype, size, buffer } = req.file;
        const userId = (req as any).user.id;

        // Use parameterized query for security
        const query = `
      INSERT INTO file_assets (filename, mime_type, size_bytes, data, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

        const result = await pool.query(query, [originalname, mimetype, size, buffer, userId]);
        const fileId = result.rows[0].id;

        // Construct the URL for the uploaded image
        // In production, this should include the base URL from env
        const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        const url = `${baseUrl}/api/media/${fileId}`;

        logger.info(`Image uploaded successfully: ${fileId} by user ${userId}`);

        res.json({
            success: true,
            url,
            id: fileId,
            filename: originalname
        });

    } catch (error: any) {
        logger.error('Error uploading image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

/**
 * GET /api/media/:id
 * Serve an image file
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const query = 'SELECT filename, mime_type, data FROM file_assets WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }

        const { filename, mime_type, data } = result.rows[0];

        res.setHeader('Content-Type', mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

        res.send(data);

    } catch (error: any) {
        logger.error('Error serving image:', error);
        res.status(500).json({ error: 'Failed to serve image' });
    }
});

export default router;
