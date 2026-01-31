import { Router } from 'express';
import { requireRole } from '../middleware/auth';
import pool from '../db/pool';

const router = Router();

// GET all active areas
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT * FROM areas 
            WHERE is_active = true 
            ORDER BY sort_order
        `);
        res.json({ success: true, data: { areas: result.rows } });
    } catch (error) {
        next(error);
    }
});

// CREATE new area
router.post('/', requireRole('owner'), async (req, res, next) => {
    const { name, name_vi, name_ja, color, sort_order } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO areas (name, name_vi, name_ja, color, sort_order) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [name, name_vi || name, name_ja, color || 'blue', sort_order || 0]
        );
        res.json({ success: true, data: { area: result.rows[0] } });
    } catch (error) {
        next(error);
    }
});

// UPDATE area
router.put('/:id', requireRole('owner'), async (req, res, next) => {
    const { id } = req.params;
    const { name, name_vi, name_ja, color, sort_order, is_active } = req.body;
    try {
        // Build dynamic update query
        const fields = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
        if (name_vi !== undefined) { fields.push(`name_vi = $${idx++}`); values.push(name_vi); }
        if (name_ja !== undefined) { fields.push(`name_ja = $${idx++}`); values.push(name_ja); }
        if (color !== undefined) { fields.push(`color = $${idx++}`); values.push(color); }
        if (sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(sort_order); }
        if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }

        if (fields.length === 0) return res.json({ success: true });

        values.push(id);
        const result = await pool.query(
            `UPDATE areas SET ${fields.join(', ')}, updated_at = NOW() 
             WHERE id = $${idx} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Area not found' });
        }

        res.json({ success: true, data: { area: result.rows[0] } });
    } catch (error) {
        next(error);
    }
});

// DELETE (soft delete)
router.delete('/:id', requireRole('owner'), async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE areas SET is_active = false, updated_at = NOW() 
             WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Area not found' });
        }

        // Optionally: Set tables in this area to NULL area_id
        // await pool.query('UPDATE tables SET area_id = NULL WHERE area_id = $1', [id]);

        res.json({ success: true, message: 'Area deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
