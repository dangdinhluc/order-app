
import express from 'express';
import { getLanguages, updateLanguage, createLanguage } from '../controllers/LanguageController';
import { authMiddleware } from '../middleware/auth';

const router: express.Router = express.Router();

// Public route to get languages (for customer view)
router.get('/', getLanguages);

// Protected routes (for admin)
router.post('/', authMiddleware, createLanguage);
router.put('/:code', authMiddleware, updateLanguage);

export default router;
