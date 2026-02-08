import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireRole, authMiddleware } from '../middleware/auth.js';

const router: Router = Router();

// Schema for updating combo items
const updateComboItemsSchema = z.object({
    items: z.array(z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1)
    }))
});

/**
 * GET /api/combos/:comboId
 * Get all items included in a combo
 */
router.get('/:comboId', async (req, res) => {
    try {
        const { comboId } = req.params;

        // Verify it is a combo product
        const productCheck = await query(
            'SELECT is_combo FROM products WHERE id = $1',
            [comboId]
        );

        if (productCheck.rows.length === 0) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        if (!productCheck.rows[0].is_combo) {
            res.status(400).json({ error: 'This product is not a combo' });
            return;
        }

        const result = await query(`
            SELECT 
                ci.included_product_id as id,
                p.name_vi,
                p.image_url,
                p.price,
                ci.quantity
            FROM combo_items ci
            JOIN products p ON ci.included_product_id = p.id
            WHERE ci.combo_product_id = $1
        `, [comboId]);

        res.json({ items: result.rows });
    } catch (error) {
        console.error('Get combo items error:', error);
        res.status(500).json({ error: 'Failed to get combo items' });
    }
});

/**
 * PUT /api/combos/:comboId
 * Update items in a combo (Review: requires admin/owner/kitchen)
 */
router.put('/:comboId', authMiddleware, requireRole('owner', 'kitchen'), async (req, res) => {
    try {
        const { comboId } = req.params;
        const { items } = updateComboItemsSchema.parse(req.body);

        // Verify combo exists
        const productCheck = await query(
            'SELECT is_combo FROM products WHERE id = $1',
            [comboId]
        );

        if (productCheck.rows.length === 0) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }

        if (!productCheck.rows[0].is_combo) {
            res.status(400).json({ error: 'This product is not a combo' });
            return;
        }

        // Transaction to replace items
        const client = await query('BEGIN');

        try {
            // Delete existing items
            await query('DELETE FROM combo_items WHERE combo_product_id = $1', [comboId]);

            // Insert new items
            for (const item of items) {
                await query(
                    `INSERT INTO combo_items (combo_product_id, included_product_id, quantity)
                     VALUES ($1, $2, $3)`,
                    [comboId, item.product_id, item.quantity]
                );
            }

            await query('COMMIT');

            res.json({ success: true, message: 'Combo items updated' });
        } catch (err) {
            await query('ROLLBACK');
            throw err;
        }
    } catch (error) {
        console.error('Update combo items error:', error);
        res.status(500).json({ error: 'Failed to update combo items' });
    }
});

export const comboRouter = router;
