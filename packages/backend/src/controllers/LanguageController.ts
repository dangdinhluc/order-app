
import { Request, Response } from 'express';
import pool, { query } from '../db/pool';

export const getLanguages = async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM languages ORDER BY is_default DESC, code ASC');
        res.json({ languages: result.rows });
    } catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateLanguage = async (req: Request, res: Response) => {
    const { code } = req.params;
    const { is_active } = req.body;

    try {
        // Prevent disabling default language
        if (is_active === false) {
            const check = await query('SELECT is_default FROM languages WHERE code = $1', [code]);
            if (check.rows[0]?.is_default) {
                return res.status(400).json({ error: 'Cannot disable default language' });
            }
        }

        const result = await query(
            'UPDATE languages SET is_active = $1, updated_at = NOW() WHERE code = $2 RETURNING *',
            [is_active, code]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Language not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating language:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createLanguage = async (req: Request, res: Response) => {
    const { code, name, flag_icon } = req.body;

    try {
        const result = await query(
            `INSERT INTO languages (code, name, flag_icon, is_active, is_default) 
             VALUES ($1, $2, $3, true, false) 
             ON CONFLICT (code) DO UPDATE 
             SET name = EXCLUDED.name, flag_icon = EXCLUDED.flag_icon, updated_at = NOW()
             RETURNING *`,
            [code, name, flag_icon]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error creating language:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
