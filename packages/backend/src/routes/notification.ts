import { Router, Response, NextFunction } from 'express';
import { AuthRequest, requireRole } from '../middleware/auth.js';
import {
    sendTelegramMessage,
    setTelegramConfig,
    getTelegramConfig,
    TelegramAlerts
} from '../services/telegram.js';

const router: Router = Router();

// GET /api/notifications/telegram/status - Get Telegram config status
router.get('/telegram/status', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const config = getTelegramConfig();

        res.json({
            success: true,
            data: config,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/notifications/telegram/config - Update Telegram config
router.post('/telegram/config', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { botToken, chatId, enabled } = req.body;

        setTelegramConfig({
            botToken,
            chatId,
            enabled,
        });

        res.json({
            success: true,
            message: 'Telegram configuration updated',
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/notifications/telegram/test - Send test message
router.post('/telegram/test', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const success = await TelegramAlerts.test();

        if (success) {
            res.json({
                success: true,
                message: 'Test message sent successfully',
            });
        } else {
            res.status(400).json({
                success: false,
                error: {
                    message: 'Failed to send test message. Check your bot token and chat ID.',
                    code: 'TELEGRAM_SEND_FAILED',
                },
            });
        }
    } catch (error) {
        next(error);
    }
});

// POST /api/notifications/custom - Send custom notification
router.post('/custom', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { message } = req.body;

        if (!message) {
            res.status(400).json({
                success: false,
                error: { message: 'Message is required', code: 'INVALID_REQUEST' },
            });
            return;
        }

        const success = await sendTelegramMessage(message);

        res.json({
            success,
            message: success ? 'Notification sent' : 'Failed to send notification',
        });
    } catch (error) {
        next(error);
    }
});

export { router as notificationRouter };
