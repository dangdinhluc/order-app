/**
 * Telegram Notification Service
 * Sends real-time alerts to Telegram for important POS events
 */

interface TelegramConfig {
    botToken: string;
    chatId: string;
    enabled: boolean;
}

// Store configuration (can be fetched from DB/settings)
let config: TelegramConfig = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled: !!process.env.TELEGRAM_BOT_TOKEN,
};

/**
 * Set telegram configuration
 */
export function setTelegramConfig(newConfig: Partial<TelegramConfig>) {
    config = { ...config, ...newConfig };
}

/**
 * Get current telegram configuration
 */
export function getTelegramConfig(): Omit<TelegramConfig, 'botToken'> & { hasToken: boolean } {
    return {
        chatId: config.chatId,
        enabled: config.enabled,
        hasToken: !!config.botToken,
    };
}

/**
 * Send a message to Telegram
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
    if (!config.enabled || !config.botToken || !config.chatId) {
        console.log('[Telegram] Notification disabled or not configured');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Telegram] Send failed:', error);
            return false;
        }

        console.log('[Telegram] Message sent successfully');
        return true;
    } catch (error) {
        console.error('[Telegram] Error sending message:', error);
        return false;
    }
}

/**
 * Alert types for different events
 */
export const TelegramAlerts = {
    /**
     * Deep discount alert (> 10%)
     */
    discountAlert: async (data: {
        orderId: string;
        tableName?: string;
        discountPercent: number;
        discountAmount: number;
        cashierName: string;
        reason?: string;
    }) => {
        const message = `
🔔 <b>GIẢM GIÁ LỚN</b>

📍 Bàn: ${data.tableName || 'N/A'}
💰 Giảm: ${data.discountPercent}% (¥${data.discountAmount.toLocaleString()})
👤 Thu ngân: ${data.cashierName}
📝 Lý do: ${data.reason || 'Không có'}
🆔 Order: ${data.orderId.substring(0, 8)}
🕐 ${new Date().toLocaleString('ja-JP')}
        `.trim();

        return sendTelegramMessage(message);
    },

    /**
     * Item void/cancel alert
     */
    voidAlert: async (data: {
        itemName: string;
        quantity: number;
        price: number;
        tableName?: string;
        cashierName: string;
        reason?: string;
    }) => {
        const message = `
⚠️ <b>HỦY MÓN</b>

📍 Bàn: ${data.tableName || 'N/A'}
🍜 Món: ${data.itemName} x${data.quantity}
💰 Giá: ¥${data.price.toLocaleString()}
👤 Thu ngân: ${data.cashierName}
📝 Lý do: ${data.reason || 'Không có'}
🕐 ${new Date().toLocaleString('ja-JP')}
        `.trim();

        return sendTelegramMessage(message);
    },

    /**
     * Order completed alert
     */
    orderCompleted: async (data: {
        orderId: string;
        tableName?: string;
        total: number;
        itemCount: number;
        paymentMethod: string;
    }) => {
        const message = `
✅ <b>ĐƠN HOÀN THÀNH</b>

📍 Bàn: ${data.tableName || 'Mang về'}
💰 Tổng: ¥${data.total.toLocaleString()}
🛒 ${data.itemCount} món
💳 ${data.paymentMethod}
🕐 ${new Date().toLocaleString('ja-JP')}
        `.trim();

        return sendTelegramMessage(message);
    },

    /**
     * Daily summary
     */
    dailySummary: async (data: {
        date: string;
        totalRevenue: number;
        orderCount: number;
        avgOrder: number;
        topProduct?: string;
        peakHour?: string;
    }) => {
        const message = `
📊 <b>BÁO CÁO NGÀY ${data.date}</b>

💰 Tổng doanh thu: ¥${data.totalRevenue.toLocaleString()}
🛒 Số đơn: ${data.orderCount}
📈 TB/đơn: ¥${data.avgOrder.toLocaleString()}
🏆 Top: ${data.topProduct || 'N/A'}
⏰ Giờ cao điểm: ${data.peakHour || 'N/A'}
        `.trim();

        return sendTelegramMessage(message);
    },

    /**
     * Table session long duration alert
     */
    longSessionAlert: async (data: {
        tableName: string;
        duration: number; // in minutes
        total: number;
    }) => {
        const hours = Math.floor(data.duration / 60);
        const mins = data.duration % 60;

        const message = `
⏰ <b>CẢNH BÁO THỜI GIAN</b>

📍 Bàn: ${data.tableName}
⏱️ Đã ${hours}h${mins}m
💰 Hiện tại: ¥${data.total.toLocaleString()}
        `.trim();

        return sendTelegramMessage(message);
    },

    /**
     * Product sold out alert
     */
    soldOutAlert: async (data: {
        productName: string;
        lastSoldBy: string;
    }) => {
        const message = `
🚫 <b>HẾT MÓN</b>

🍜 ${data.productName}
👤 Đã bán hết bởi: ${data.lastSoldBy}
🕐 ${new Date().toLocaleString('ja-JP')}
        `.trim();

        return sendTelegramMessage(message);
    },

    /**
     * Test message
     */
    test: async () => {
        const message = `
🧪 <b>TIN NHẮN THỬ</b>

Hệ thống Telegram đã được cấu hình thành công!
🕐 ${new Date().toLocaleString('ja-JP')}
        `.trim();

        return sendTelegramMessage(message);
    },
};

export default {
    sendTelegramMessage,
    setTelegramConfig,
    getTelegramConfig,
    TelegramAlerts,
};
