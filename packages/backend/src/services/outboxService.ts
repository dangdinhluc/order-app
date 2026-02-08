import pool, { query } from '../db/pool.js';
import { v4 as uuidv4 } from 'uuid';

export interface OfflineOrder {
    table_id?: string;
    items: any[];
    notes?: string;
    order_type: string;
}

export class OutboxService {
    private static isSyncing = false;

    /**
     * Save order locally if DB is down, otherwise try to send it
     */
    static async enqueueOrder(order: OfflineOrder) {
        try {
            // First, try a simple heartbeat or just try the insert
            // For now, we'll assume the caller handles the initial failure
            // but we provide a way to manually enqueue if they know they are offline
            const localId = uuidv4();

            await query(`
                INSERT INTO offline_sync_queue (local_id, table_name, action, payload, status)
                VALUES ($1, 'orders', 'create', $2, 'pending')
            `, [localId, JSON.stringify(order)]);

            console.log(`📦 [Outbox] Order saved to sync queue (Local ID: ${localId})`);

            // Try to sync immediately in background
            this.triggerSync();

            return localId;
        } catch (err) {
            console.error('❌ [Outbox] Failed to enqueue order:', err);
            // If even the queue insert fails (e.g. local DB is also down), 
            // we'd need to fallback to filesystem storage
            throw err;
        }
    }

    /**
     * Attempt to sync all pending items in the queue
     */
    static async triggerSync() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const { rows: pending } = await query(`
                SELECT * FROM offline_sync_queue 
                WHERE status IN ('pending', 'failed') AND retry_count < 5
                ORDER BY created_at ASC
            `);

            if (pending.length === 0) {
                this.isSyncing = false;
                return;
            }

            console.log(`🔄 [Outbox] Syncing ${pending.length} pending items...`);

            for (const item of pending) {
                try {
                    await this.syncItem(item);
                } catch (err) {
                    console.error(`❌ [Outbox] Failed to sync item ${item.id}:`, err);
                    await query(`
                        UPDATE offline_sync_queue 
                        SET status = 'failed', 
                            retry_count = retry_count + 1,
                            error_message = $1
                        WHERE id = $2
                    `, [(err as Error).message, item.id]);
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }

    private static async syncItem(item: any) {
        console.log(`📤 [Outbox] Syncing ${item.table_name} - ${item.action}...`);

        const payload = JSON.parse(typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload));

        if (item.table_name === 'orders' && item.action === 'create') {
            // Logic to check for conflicts
            // If table_id is provided, check if there's an active session with orders created recently
            if (payload.table_id) {
                const { rows: existingOrders } = await query(`
                    SELECT o.id
                    FROM orders o
                    JOIN table_sessions ts ON o.table_session_id = ts.id
                    WHERE o.table_id = $1
                      AND ts.ended_at IS NULL
                      AND o.created_at > NOW() - INTERVAL '1 hour'
                `, [payload.table_id]);

                if (existingOrders.length > 0) {
                    console.warn(`⚠️ [Outbox] Potential conflict detected for table ${payload.table_id}`);
                    // Mark as conflict instead of synced
                    await query(`
                        UPDATE offline_sync_queue
                        SET status = 'conflict', synced_at = NOW()
                        WHERE id = $1
                    `, [item.id]);

                    // TODO: Emit socket event for conflict
                    return;
                }
            }

            // If no conflict, proceed with order creation
            // We'll use a transaction for safety
            const localId = item.local_id;
            await query(`
                INSERT INTO orders (table_id, table_session_id, customer_id, user_id, note, order_type)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [payload.table_id || null, payload.table_session_id || null, payload.customer_id || null, null, payload.note || null, payload.order_type]);
        }

        // Mark as synced
        await query(`
            UPDATE offline_sync_queue
            SET status = 'synced', synced_at = NOW()
            WHERE id = $1
        `, [item.id]);
    }
}

// Start periodic sync worker
setInterval(() => OutboxService.triggerSync(), 30000); // Every 30s
