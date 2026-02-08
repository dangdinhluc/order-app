import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { authRouter } from './routes/auth.js';
import { categoriesRouter } from './routes/categories.js';
import { badgesRouter } from './routes/badges.js';
import { tablesRouter } from './routes/tables.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { kitchenRouter } from './routes/kitchen.js';
import { reportsRouter } from './routes/reports.js';
import { clientRouter } from './routes/client.js';
import { auditRouter } from './routes/audit.js';
import { receiptRouter } from './routes/receipt.js';
import { usersRouter } from './routes/users.js';
import { vouchersRouter } from './routes/vouchers.js';
import { settingsRouter } from './routes/settings.js';
import areasRouter from './routes/areas.js';
import { cashRouter } from './routes/cash.js';
import { customerRouter } from './routes/customer.js';
import { qrcodeRouter } from './routes/qrcode.js';
import { comboRouter } from './routes/combos.js';
import { exportRouter } from './routes/export.js';
import { notificationRouter } from './routes/notification.js';
import { stationsRouter } from './routes/stations.js';
import { adminRouter } from './routes/admin.js';
import { loyaltyRouter } from './routes/loyalty.js';
import schedulingRouter from './routes/scheduling.js';
import languageRouter from './routes/languages.js';
import { setupSocketHandlers } from './socket/index.js';
import { startSessionCleanupJob } from './jobs/sessionCleanup.js';
import { setupDbListener } from './services/dbListener.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { query } from './db/pool.js';

const app: Express = express();
const httpServer = createServer(app);

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175', // Allow port 5175
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:517\d$/, // Allow 517x
    /^http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:517\d$/ // Allow any IP with port 517x
];

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Middleware
app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Server Info (Hybrid Deployment)
app.get('/api/info', (_req, res) => {
    res.json({
        deploymentMode: process.env.DEPLOYMENT_MODE || 'vps',
        version: '1.0.0-hybrid'
    });
});

// Pending Sync Count
app.get('/api/sync/pending-count', async (_req, res, next) => {
    try {
        const result = await query('SELECT COUNT(*) as count FROM offline_sync_queue WHERE status = \'pending\'');
        res.json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
        next(error);
    }
});

// Static serve for uploads
app.use('/uploads', express.static('uploads'));

// Public routes (no auth)
app.use('/api/auth', authRouter);
app.use('/api/client', clientRouter); // Customer QR order - no auth
app.use('/api/customer', customerRouter); // NEW: Customer self-order
app.use('/api/qrcode', qrcodeRouter); // NEW: QR code generation
app.use('/api/combos', comboRouter); // NEW: Combo management

// Protected routes
app.use('/api/categories', authMiddleware, categoriesRouter);
app.use('/api/badges', authMiddleware, badgesRouter);
app.use('/api/tables', authMiddleware, tablesRouter);
app.use('/api/areas', authMiddleware, areasRouter);
app.use('/api/products', authMiddleware, productsRouter);
app.use('/api/orders', authMiddleware, ordersRouter);
app.use('/api/kitchen', authMiddleware, kitchenRouter);
app.use('/api/reports', authMiddleware, reportsRouter);
app.use('/api/audit', authMiddleware, auditRouter);
app.use('/api/receipt', authMiddleware, receiptRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/vouchers', authMiddleware, vouchersRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/cash', authMiddleware, cashRouter);
app.use('/api/stations', authMiddleware, stationsRouter);
app.use('/api/admin', authMiddleware, adminRouter);
app.use('/api/loyalty', authMiddleware, loyaltyRouter);
app.use('/api/scheduling', authMiddleware, schedulingRouter);
app.use('/api/languages', languageRouter);

// Public endpoint for payment methods (needed for POS checkout without extra auth check)
app.get('/api/public/payment-methods', async (_req, res, next) => {
    try {
        const result = await require('./db/pool.js').query(`
            SELECT * FROM payment_methods
            WHERE is_active = true
            ORDER BY sort_order
        `);
        res.json({ success: true, data: { payment_methods: result.rows } });
    } catch (error) {
        next(error);
    }
});

app.use('/api/export', authMiddleware, exportRouter);
app.use('/api/notifications', authMiddleware, notificationRouter);

// Error handler
app.use(errorHandler);

// Socket.IO handlers
setupSocketHandlers(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3001;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Socket.IO ready`);

    // Start scheduled jobs
    startSessionCleanupJob();

    // Setup Sync Listener (Real-time sync between Cloud/Local)
    setupDbListener(io);

    console.log(`\n📋 Available endpoints:`);
    console.log(`   GET  /api/health`);
    console.log(`   POST /api/auth/login`);
    console.log(`   GET  /api/categories`);
    console.log(`   GET  /api/products`);
    console.log(`   GET  /api/tables`);
    console.log(`   GET  /api/orders`);
    console.log(`   GET  /api/kitchen/queue`);
});

export { app, io };
