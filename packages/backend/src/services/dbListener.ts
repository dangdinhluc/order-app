import { Server as SocketIOServer } from 'socket.io';
import pool from '../db/pool.js';

export const setupDbListener = async (io: SocketIOServer) => {
    const client = await pool.connect();

    try {
        console.log('📡 [Hybrid Sync] Starting Database Listener...');

        // Perform LISTEN
        await client.query('LISTEN order_updates');

        // Handle notifications
        client.on('notification', async (msg) => {
            if (msg.channel === 'order_updates' && msg.payload) {
                try {
                    const data = JSON.parse(msg.payload);
                    console.log(`🔄 [Hybrid Sync] Change detected: ${data.table_name} (${data.action}) - ID: ${data.id}`);

                    // Broadcast to relevant rooms
                    // 1. Notify POS staff
                    io.to('pos-room').emit('hybrid:order_updated', data);

                    // 2. If it's a specific order, we can also notify the table room if needed
                    // io.to(`table-${orderId}`).emit('order:sync', data);

                } catch (err) {
                    console.error('❌ [Hybrid Sync] Error parsing notification payload:', err);
                }
            }
        });

        client.on('error', (err) => {
            console.error('❌ [Hybrid Sync] Database listener client error:', err);
            // Re-setup listener if client dies
            setTimeout(() => setupDbListener(io), 5000);
        });

        console.log('✅ [Hybrid Sync] Listening for database updates');

    } catch (err) {
        console.error('❌ [Hybrid Sync] Failed to start database listener:', err);
        client.release();
        // Retry
        setTimeout(() => setupDbListener(io), 10000);
    }
};
