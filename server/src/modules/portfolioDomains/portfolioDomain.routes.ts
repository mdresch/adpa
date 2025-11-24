// Express routes for portfolio domains
import express from 'express';
import { getAllDomains, getDomainById } from './portfolioDomain.service';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const domains = await getAllDomains();
    res.json(domains);
  } catch (err: any) {
    console.error('Error fetching domains:', err.message);
    res.status(500).json({ error: 'Failed to fetch domains', details: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const domain = await getDomainById(req.params.id);
    if (!domain) return res.status(404).json({ error: 'Not found' });
    res.json(domain);
  } catch (err: any) {
    console.error('Error fetching domain by id:', err.message);
    res.status(500).json({ error: 'Failed to fetch domain', details: err.message });
  }
});

// Add POST, PUT, DELETE as needed

export default router;
