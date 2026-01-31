import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Generate receipt HTML for an order
async function generateReceiptHTML(orderId: string): Promise<string> {
    // Get order details
    const orderResult = await query(
        `SELECT o.*, t.number as table_number, t.name as table_name
         FROM orders o
         LEFT JOIN tables t ON o.table_id = t.id
         WHERE o.id = $1`,
        [orderId]
    );

    if (orderResult.rows.length === 0) {
        throw new ApiError('Order not found', 404, 'NOT_FOUND');
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await query(
        `SELECT oi.*, p.name_vi as product_name_vi, p.name_ja as product_name_ja
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1
         ORDER BY oi.created_at`,
        [orderId]
    );

    // Get payments
    const paymentsResult = await query(
        `SELECT * FROM payments WHERE order_id = $1`,
        [orderId]
    );

    // Get settings
    const settingsResult = await query(
        `SELECT value FROM settings WHERE key = 'receipt_settings'`
    );

    const defaultSettings = {
        header_text: '🍜 IZAKAYA POS',
        footer_text: 'Cảm ơn quý khách! ありがとうございました!',
        show_table_time: true,
        show_order_number: true,
        font_size: 'medium',
        logo_url: '',
    };

    let settings = defaultSettings;
    if (settingsResult.rows.length > 0) {
        try {
            const parsed = JSON.parse(settingsResult.rows[0].value);
            settings = { ...defaultSettings, ...parsed };
        } catch (e) {
            console.error('Error parsing receipt settings:', e);
        }
    }

    const items = itemsResult.rows;
    const payments = paymentsResult.rows;

    // Format date
    const orderDate = new Date(order.created_at);
    const formattedDate = orderDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

    // Calculate table time if needed
    let timeText = '';
    if (settings.show_table_time && order.session_started_at) {
        const start = new Date(order.session_started_at);
        const end = new Date(); // Or payment time if available, for now use current time
        const diff = Math.floor((end.getTime() - start.getTime()) / 60000);
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        timeText = `${hours}h ${mins}m`;
    }

    // Generate items HTML
    const itemsHTML = items.map(item => `
        <tr>
            <td class="item-name">${item.product_name_vi || item.open_item_name}</td>
            <td class="item-qty">${item.quantity}</td>
            <td class="item-price">¥${(item.unit_price * item.quantity).toLocaleString()}</td>
        </tr>
        ${item.note ? `<tr><td colspan="3" class="item-note">📝 ${item.note}</td></tr>` : ''}
    `).join('');

    // Generate payments HTML
    const paymentMethodNames: Record<string, string> = {
        cash: '現金 / Tiền mặt',
        card: 'カード / Thẻ',
        paypay: 'PayPay',
        linepay: 'LINE Pay',
        other: 'Khác',
    };

    const paymentsHTML = payments.map(p => `
        <div class="payment-row">
            <span>${paymentMethodNames[p.method] || p.method}</span>
            <span>¥${Number(p.amount).toLocaleString()}</span>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt #${order.order_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
            width: 80mm;
            padding: 4mm;
            font-size: ${settings.font_size === 'small' ? '10px' : settings.font_size === 'large' ? '14px' : '12px'};
            line-height: 1.4;
        }
        .header {
            text-align: center;
            border-bottom: 2px dashed #333;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        .header img {
            max-width: 60%;
            max-height: 50px;
            margin-bottom: 4px;
        }
        .header h1 {
            font-size: 1.5em;
            margin-bottom: 4px;
        }
        .info {
            margin-bottom: 8px;
            font-size: 0.9em;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        th {
            text-align: left;
            border-bottom: 1px solid #333;
            padding-bottom: 4px;
            font-size: 0.9em;
        }
        td {
            padding: 4px 0;
            vertical-align: top;
        }
        .item-qty {
            text-align: center;
            width: 30px;
        }
        .item-price {
            text-align: right;
            width: 60px;
        }
        .item-note {
            font-size: 0.8em;
            color: #666;
            padding-left: 8px;
        }
        .totals {
            border-top: 2px dashed #333;
            padding-top: 8px;
            margin-top: 8px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .grand-total {
            font-size: 1.4em;
            font-weight: bold;
            border-top: 1px solid #333;
            padding-top: 8px;
            margin-top: 8px;
        }
        .payments {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px dashed #333;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.9em;
        }
        .footer {
            text-align: center;
            margin-top: 16px;
            padding-top: 8px;
            border-top: 2px dashed #333;
            font-size: 0.9em;
        }
        @media print {
            body { width: 80mm; }
        }
    </style>
</head>
<body>
    <div class="header">
        ${settings.logo_url ? `<img src="${settings.logo_url}" alt="Logo" />` : ''}
        <h1>${settings.header_text || '🍜 IZAKAYA POS'}</h1>
        <div>伝票 / Hóa đơn</div>
    </div>

    <div class="info">
        <div class="info-row">
            <span>No.</span>
            <span>#${order.order_number}</span>
        </div>
        <div class="info-row">
            <span>日時 / Ngày</span>
            <span>${formattedDate}</span>
        </div>
        <div class="info-row">
            <span>テーブル / Bàn</span>
            <span>${order.table_name || `Bàn ${order.table_number}` || 'Take-out'}</span>
        </div>
        ${settings.show_table_time && timeText ? `
        <div class="info-row">
            <span>時間 / Time</span>
            <span>${timeText}</span>
        </div>
        ` : ''}
    </div>

    <table>
        <thead>
            <tr>
                <th>品名 / Tên</th>
                <th class="item-qty">SL</th>
                <th class="item-price">金額</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>

    <div class="totals">
        <div class="total-row">
            <span>小計 / Tạm tính</span>
            <span>¥${Number(order.subtotal).toLocaleString()}</span>
        </div>
        ${order.discount_amount > 0 ? `
        <div class="total-row" style="color: green;">
            <span>割引 / Giảm giá</span>
            <span>-¥${Number(order.discount_amount).toLocaleString()}</span>
        </div>
        ` : ''}
        ${order.surcharge_amount > 0 ? `
        <div class="total-row">
            <span>追加料金 / Phụ thu</span>
            <span>+¥${Number(order.surcharge_amount).toLocaleString()}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
            <span>合計 / Tổng</span>
            <span>¥${Number(order.total).toLocaleString()}</span>
        </div>
    </div>

    ${payments.length > 0 ? `
    <div class="payments">
        <div style="font-weight: bold; margin-bottom: 4px;">お支払い / Thanh toán:</div>
        ${paymentsHTML}
    </div>
    ` : ''}

    <div class="footer">
        <p>${settings.footer_text || 'Cảm ơn quý khách!'}</p>
        <p>ありがとうございました!</p>
    </div>
</body>
</html>
    `;
}

// GET /api/receipt/:orderId - Get receipt HTML
router.get('/:orderId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        const html = await generateReceiptHTML(orderId);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        next(error);
    }
});

// GET /api/receipt/:orderId/print - Get receipt for printing (opens print dialog)
router.get('/:orderId/print', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { orderId } = req.params;
        const html = await generateReceiptHTML(orderId);

        // Wrap with print script
        const printHTML = html.replace('</body>', `
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>`);

        res.setHeader('Content-Type', 'text/html');
        res.send(printHTML);
    } catch (error) {
        next(error);
    }
});

export { router as receiptRouter };
