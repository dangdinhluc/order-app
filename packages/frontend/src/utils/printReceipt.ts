/**
 * Print Receipt Utility
 * Generates and prints thermal receipt from order data
 */

export interface OrderItem {
    id: string;
    product_id?: string;
    product_name_vi?: string;
    product_name_ja?: string;
    open_item_name?: string;
    quantity: number;
    unit_price: number;
    note?: string;
}

export interface Order {
    id: string;
    order_number?: string;
    table_number?: number;
    table_name?: string;
    subtotal: number;
    discount_amount: number;
    discount_reason?: string;
    surcharge_amount?: number;
    total: number;
    created_at: string;
    paid_at?: string;
    cashier_name?: string;
}

export interface StoreSettings {
    store_name: string;
    store_name_ja: string;
    address: string;
    phone: string;
    tax_rate: number;
    currency: string;
}

export interface ReceiptSettings {
    logo_url: string;
    header_text: string;
    footer_text: string;
    show_table_time: boolean;
    show_order_number: boolean;
    font_size: 'small' | 'medium' | 'large';
}

export interface PrinterSettings {
    printer_type: 'browser' | 'network' | 'usb';
    paper_width: '58mm' | '80mm';
}

export interface PrintReceiptOptions {
    order: Order;
    items: OrderItem[];
    storeSettings: StoreSettings;
    receiptSettings: ReceiptSettings;
    printerSettings: PrinterSettings;
    payments?: { method: string; amount: number; received_amount?: number; change_amount?: number }[];
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Tiền mặt',
    card: 'Thẻ',
    transfer: 'Chuyển khoản',
    qr: 'QR Pay',
};

function formatCurrency(amount: number, currency: string): string {
    if (currency === 'JPY') {
        return `¥${amount.toLocaleString('ja-JP')}`;
    } else if (currency === 'VND') {
        return `${amount.toLocaleString('vi-VN')}₫`;
    }
    return `$${amount.toLocaleString()}`;
}

function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function generateReceiptHTML(options: PrintReceiptOptions): string {
    const { order, items, storeSettings, receiptSettings, printerSettings, payments } = options;

    const paperWidth = printerSettings.paper_width === '58mm' ? '58mm' : '80mm';
    const contentWidth = printerSettings.paper_width === '58mm' ? '48mm' : '72mm';

    const fontSizes = {
        small: { title: '12px', body: '10px', total: '14px' },
        medium: { title: '14px', body: '11px', total: '16px' },
        large: { title: '16px', body: '12px', total: '18px' },
    };

    const fs = fontSizes[receiptSettings.font_size];

    const itemsHTML = items.map(item => {
        const name = item.product_name_vi || item.open_item_name || 'Unknown';
        const lineTotal = item.quantity * item.unit_price;
        return `
            <tr>
                <td style="text-align: left;">${item.quantity}x ${name}</td>
                <td style="text-align: right;">${formatCurrency(lineTotal, storeSettings.currency)}</td>
            </tr>
            ${item.note ? `<tr><td colspan="2" style="font-size: 9px; color: #666; padding-left: 10px;">※ ${item.note}</td></tr>` : ''}
        `;
    }).join('');

    const paymentsHTML = payments && payments.length > 0 ? payments.map(p => `
        <div style="display: flex; justify-content: space-between;">
            <span>${PAYMENT_LABELS[p.method] || p.method}</span>
            <span>${formatCurrency(p.amount, storeSettings.currency)}</span>
        </div>
        ${p.received_amount ? `
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #666;">
                <span>Nhận</span><span>${formatCurrency(p.received_amount, storeSettings.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #666;">
                <span>Thối</span><span>${formatCurrency(p.change_amount || 0, storeSettings.currency)}</span>
            </div>
        ` : ''}
    `).join('') : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Receipt</title>
    <style>
        @page {
            size: ${paperWidth} auto;
            margin: 0;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Courier New', monospace;
            font-size: ${fs.body};
            width: ${contentWidth};
            padding: 5mm;
            line-height: 1.3;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        .logo {
            max-width: 40mm;
            max-height: 15mm;
            margin-bottom: 5px;
        }
        .store-name {
            font-size: ${fs.title};
            font-weight: bold;
        }
        .store-info {
            font-size: 9px;
            color: #333;
        }
        .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
        }
        .items-table td {
            padding: 2px 0;
            vertical-align: top;
        }
        .total-section {
            margin-top: 10px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        .grand-total {
            font-size: ${fs.total};
            font-weight: bold;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 5px 0;
            margin: 5px 0;
        }
        .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 10px;
        }
        .footer-text {
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        ${receiptSettings.logo_url ? `<img src="${receiptSettings.logo_url}" class="logo" alt="Logo">` : ''}
        <div class="store-name">${storeSettings.store_name}</div>
        ${storeSettings.store_name_ja ? `<div class="store-name">${storeSettings.store_name_ja}</div>` : ''}
        <div class="store-info">${storeSettings.address || ''}</div>
        <div class="store-info">TEL: ${storeSettings.phone || ''}</div>
        ${receiptSettings.header_text ? `<div style="margin-top: 5px;">${receiptSettings.header_text}</div>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div class="info-row">
        <span>Date:</span>
        <span>${formatDateTime(order.paid_at || order.created_at)}</span>
    </div>
    ${receiptSettings.show_order_number && order.order_number ? `
        <div class="info-row">
            <span>Order No:</span>
            <span>#${order.order_number}</span>
        </div>
    ` : ''}
    ${order.table_name || order.table_number ? `
        <div class="info-row">
            <span>Table:</span>
            <span>${order.table_name || `#${order.table_number}`}</span>
        </div>
    ` : ''}
    ${order.cashier_name ? `
        <div class="info-row">
            <span>Staff:</span>
            <span>${order.cashier_name}</span>
        </div>
    ` : ''}
    
    <div class="divider"></div>
    
    <table class="items-table">
        ${itemsHTML}
    </table>
    
    <div class="divider"></div>
    
    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(order.subtotal, storeSettings.currency)}</span>
        </div>
        ${order.discount_amount > 0 ? `
            <div class="total-row" style="color: #c00;">
                <span>Discount${order.discount_reason ? ` (${order.discount_reason})` : ''}:</span>
                <span>-${formatCurrency(order.discount_amount, storeSettings.currency)}</span>
            </div>
        ` : ''}
        ${order.surcharge_amount && order.surcharge_amount > 0 ? `
            <div class="total-row">
                <span>Surcharge:</span>
                <span>+${formatCurrency(order.surcharge_amount, storeSettings.currency)}</span>
            </div>
        ` : ''}
        ${storeSettings.tax_rate > 0 ? `
            <div class="total-row" style="font-size: 9px; color: #666;">
                <span>Tax (${storeSettings.tax_rate}% incl.):</span>
                <span>${formatCurrency(Math.round(order.total * storeSettings.tax_rate / (100 + storeSettings.tax_rate)), storeSettings.currency)}</span>
            </div>
        ` : ''}
        
        <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>${formatCurrency(order.total, storeSettings.currency)}</span>
        </div>
        
        ${paymentsHTML ? `
            <div style="margin-top: 10px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Payment:</div>
                ${paymentsHTML}
            </div>
        ` : ''}
    </div>
    
    <div class="footer">
        ${receiptSettings.footer_text ? `<div class="footer-text">${receiptSettings.footer_text}</div>` : ''}
        <div style="margin-top: 10px; font-size: 8px; color: #999;">
            Powered by Hybrid POS
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Print receipt using browser print dialog
 */
export function printReceipt(options: PrintReceiptOptions): void {
    const html = generateReceiptHTML(options);

    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for content to load then print
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();

            // Close after printing (or cancel)
            printWindow.onafterprint = () => {
                printWindow.close();
            };
        };
    } else {
        alert('Popup bị chặn. Vui lòng cho phép popup để in hóa đơn.');
    }
}

/**
 * Print kitchen ticket (simplified version for kitchen)
 */
export function printKitchenTicket(
    order: Order,
    items: OrderItem[],
    printerSettings: PrinterSettings
): void {
    const paperWidth = printerSettings.paper_width === '58mm' ? '58mm' : '80mm';
    const contentWidth = printerSettings.paper_width === '58mm' ? '48mm' : '72mm';

    const itemsHTML = items
        .filter(i => true) // All items for kitchen
        .map(item => {
            const name = item.product_name_vi || item.open_item_name || 'Unknown';
            return `
                <div style="margin: 5px 0; font-size: 14px;">
                    <strong>${item.quantity}x</strong> ${name}
                    ${item.note ? `<div style="font-size: 11px; color: #666; margin-left: 20px;">※ ${item.note}</div>` : ''}
                </div>
            `;
        }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Kitchen Ticket</title>
    <style>
        @page { size: ${paperWidth} auto; margin: 0; }
        body {
            font-family: 'Arial', sans-serif;
            width: ${contentWidth};
            padding: 5mm;
        }
        .header {
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            border-bottom: 2px solid #000;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        .table-info {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            background: #000;
            color: #fff;
            padding: 5px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">🍳 PHIẾU BẾP</div>
    <div class="table-info">${order.table_name || `Bàn ${order.table_number}`}</div>
    <div style="font-size: 11px; margin-bottom: 10px;">
        ${new Date().toLocaleString('ja-JP')}
    </div>
    <div class="items">
        ${itemsHTML}
    </div>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=400');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
        };
    }
}

export default { printReceipt, printKitchenTicket };
