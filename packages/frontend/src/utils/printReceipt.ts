/**
 * Print Receipt Utility v2
 * Generates bilingual thermal receipts with multiple template options
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
    time_seated_minutes?: number; // How long customer has been seated
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
    template: 'modern' | 'classic' | 'simple';
    languages: string[];
    logo_url: string;
    header_text_vi: string;
    header_text_ja: string;
    footer_text_vi: string;
    footer_text_ja: string;
    show_table_time: boolean;
    show_order_number: boolean;
    show_time_seated: boolean;
    show_staff_name: boolean;
    show_qr_code: boolean;
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
    type?: 'final' | 'preliminary'; // final = paid receipt, preliminary = pre-bill
}

const PAYMENT_LABELS: Record<string, { vi: string; ja: string }> = {
    cash: { vi: 'Tiền mặt', ja: '現金' },
    card: { vi: 'Thẻ', ja: 'カード' },
    transfer: { vi: 'Chuyển khoản', ja: '振込' },
    qr: { vi: 'QR Pay', ja: 'QRペイ' },
};

function formatCurrency(amount: number, currency: string): string {
    if (currency === 'JPY') {
        return `¥${amount.toLocaleString('ja-JP')}`;
    } else if (currency === 'VND') {
        return `${amount.toLocaleString('vi-VN')}₫`;
    }
    return `$${amount.toLocaleString()}`;
}

function formatDateTime(dateString: string, useJapaneseEra = false): string {
    const date = new Date(dateString);
    if (useJapaneseEra) {
        // Japanese era format: 令和8年2月4日
        return date.toLocaleDateString('ja-JP-u-ca-japanese', {
            era: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }) + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function getItemName(item: OrderItem, languages: string[]): string {
    const names: string[] = [];
    if (languages.includes('vi') && item.product_name_vi) names.push(item.product_name_vi);
    if (languages.includes('ja') && item.product_name_ja) names.push(item.product_name_ja);
    if (names.length === 0 && item.open_item_name) names.push(item.open_item_name);
    if (names.length === 0) names.push('Unknown');
    return names.join(' / ');
}

function generateModernReceiptHTML(options: PrintReceiptOptions): string {
    const { order, items, storeSettings, receiptSettings, printerSettings, payments, type } = options;
    const isPreliminary = type === 'preliminary';
    const showVi = receiptSettings.languages.includes('vi');
    const showJa = receiptSettings.languages.includes('ja');

    const paperWidth = printerSettings.paper_width === '58mm' ? '58mm' : '80mm';
    const contentWidth = printerSettings.paper_width === '58mm' ? '48mm' : '72mm';

    const fontSizes = {
        small: { title: '12px', body: '10px', total: '14px' },
        medium: { title: '14px', body: '11px', total: '16px' },
        large: { title: '16px', body: '12px', total: '18px' },
    };
    const fs = fontSizes[receiptSettings.font_size];

    const itemsHTML = items.map(item => {
        const name = getItemName(item, receiptSettings.languages);
        const lineTotal = item.quantity * item.unit_price;
        return `
            <tr>
                <td style="text-align: left;">${item.quantity}x ${name}</td>
                <td style="text-align: right;">${formatCurrency(lineTotal, storeSettings.currency)}</td>
            </tr>
            ${item.note ? `<tr><td colspan="2" style="font-size: 9px; color: #666; padding-left: 10px;">※ ${item.note}</td></tr>` : ''}
        `;
    }).join('');

    const paymentsHTML = payments && payments.length > 0 ? payments.map(p => {
        const label = PAYMENT_LABELS[p.method] || { vi: p.method, ja: p.method };
        const displayLabel = showJa ? `${label.ja}` : label.vi;
        return `
            <div style="display: flex; justify-content: space-between;">
                <span>${displayLabel}</span>
                <span>${formatCurrency(p.amount, storeSettings.currency)}</span>
            </div>
            ${p.received_amount ? `
                <div style="display: flex; justify-content: space-between; font-size: 9px; color: #666;">
                    <span>${showJa ? 'お預かり' : 'Nhận'}</span><span>${formatCurrency(p.received_amount, storeSettings.currency)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 9px; color: #666;">
                    <span>${showJa ? 'お釣り' : 'Thối'}</span><span>${formatCurrency(p.change_amount || 0, storeSettings.currency)}</span>
                </div>
            ` : ''}
        `;
    }).join('') : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${isPreliminary ? 'Pre-Bill' : 'Receipt'}</title>
    <style>
        @page { size: ${paperWidth} auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', 'MS Gothic', monospace;
            font-size: ${fs.body};
            width: ${contentWidth};
            padding: 5mm;
            line-height: 1.4;
        }
        .header { text-align: center; margin-bottom: 10px; }
        .logo { max-width: 40mm; max-height: 15mm; margin-bottom: 5px; }
        .store-name { font-size: ${fs.title}; font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table td { padding: 2px 0; vertical-align: top; }
        .total-section { margin-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
        .grand-total {
            font-size: ${fs.total};
            font-weight: bold;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 5px 0;
            margin: 5px 0;
        }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        .preliminary-banner {
            background: #000;
            color: #fff;
            text-align: center;
            padding: 8px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .qr-placeholder {
            width: 60px;
            height: 60px;
            margin: 10px auto;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #999;
        }
    </style>
</head>
<body>
    ${isPreliminary ? `
        <div class="preliminary-banner">
            ${showVi ? 'PHIẾU TẠM TÍNH' : ''}${showVi && showJa ? ' / ' : ''}${showJa ? 'お会計プレビュー' : ''}
        </div>
    ` : ''}
    
    <div class="header">
        ${receiptSettings.logo_url ? `<img src="${receiptSettings.logo_url}" class="logo" alt="Logo">` : ''}
        <div class="store-name">★ ${storeSettings.store_name} ★</div>
        ${storeSettings.store_name_ja ? `<div class="store-name">${storeSettings.store_name_ja}</div>` : ''}
        <div style="font-size: 9px; color: #333;">${storeSettings.address || ''}</div>
        <div style="font-size: 9px;">TEL: ${storeSettings.phone || ''}</div>
        ${showVi && receiptSettings.header_text_vi ? `<div style="margin-top: 5px;">${receiptSettings.header_text_vi}</div>` : ''}
        ${showJa && receiptSettings.header_text_ja ? `<div>${receiptSettings.header_text_ja}</div>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div class="info-row">
        <span>Date:</span>
        <span>${formatDateTime(order.paid_at || order.created_at)}</span>
    </div>
    ${receiptSettings.show_order_number && order.order_number ? `
        <div class="info-row">
            <span>Order:</span>
            <span>#${order.order_number}</span>
        </div>
    ` : ''}
    ${order.table_name || order.table_number ? `
        <div class="info-row">
            <span>Table${showJa ? '/テーブル' : ''}:</span>
            <span>${order.table_name || `#${order.table_number}`}</span>
        </div>
    ` : ''}
    ${receiptSettings.show_time_seated && order.time_seated_minutes ? `
        <div class="info-row">
            <span>Time${showJa ? '/滞在時間' : ''}:</span>
            <span>${formatDuration(order.time_seated_minutes)}</span>
        </div>
    ` : ''}
    ${receiptSettings.show_staff_name && order.cashier_name ? `
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
            <span>Subtotal${showJa ? ' 小計' : ''}:</span>
            <span>${formatCurrency(order.subtotal, storeSettings.currency)}</span>
        </div>
        ${order.discount_amount > 0 ? `
            <div class="total-row" style="color: #c00;">
                <span>Discount${showJa ? ' 割引' : ''}${order.discount_reason ? ` (${order.discount_reason})` : ''}:</span>
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
                <span>Tax${showJa ? ' 税' : ''} (${storeSettings.tax_rate}% incl.):</span>
                <span>${formatCurrency(Math.round(order.total * storeSettings.tax_rate / (100 + storeSettings.tax_rate)), storeSettings.currency)}</span>
            </div>
        ` : ''}
        
        <div class="total-row grand-total">
            <span>TOTAL${showJa ? ' 合計' : ''}:</span>
            <span>${formatCurrency(order.total, storeSettings.currency)}</span>
        </div>
        
        ${!isPreliminary && paymentsHTML ? `
            <div style="margin-top: 10px;">
                <div style="font-weight: bold; margin-bottom: 5px;">Payment${showJa ? ' お支払い' : ''}:</div>
                ${paymentsHTML}
            </div>
        ` : ''}
        
        ${isPreliminary ? `
            <div style="text-align: center; margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                <div style="font-weight: bold; color: #c00;">
                    ${showVi ? '⚠ CHƯA THANH TOÁN' : ''}
                </div>
                <div style="font-weight: bold; color: #c00;">
                    ${showJa ? '⚠ まだお支払いされていません' : ''}
                </div>
                <div style="font-size: 9px; margin-top: 5px;">
                    ${showVi ? 'Xin đến quầy thanh toán' : ''}
                    ${showVi && showJa ? ' / ' : ''}
                    ${showJa ? 'レジにてお支払いください' : ''}
                </div>
            </div>
        ` : ''}
    </div>
    
    <div class="footer">
        ${showVi && receiptSettings.footer_text_vi ? `<div>${receiptSettings.footer_text_vi}</div>` : ''}
        ${showJa && receiptSettings.footer_text_ja ? `<div>${receiptSettings.footer_text_ja}</div>` : ''}
        ${receiptSettings.show_qr_code ? '<div class="qr-placeholder">QR CODE</div>' : ''}
        <div style="margin-top: 10px; font-size: 8px; color: #999;">
            Powered by Hybrid POS
        </div>
    </div>
</body>
</html>
    `;
}

function generateClassicReceiptHTML(options: PrintReceiptOptions): string {
    // Classic Japanese style (Izakaya receipt) - uses Japanese era dates
    const { order, items, storeSettings, receiptSettings, printerSettings, type } = options;
    const isPreliminary = type === 'preliminary';
    const showVi = receiptSettings.languages.includes('vi');
    const showJa = receiptSettings.languages.includes('ja');

    const paperWidth = printerSettings.paper_width === '58mm' ? '58mm' : '80mm';
    const contentWidth = printerSettings.paper_width === '58mm' ? '48mm' : '72mm';

    const fontSizes = {
        small: { title: '12px', body: '10px', total: '14px' },
        medium: { title: '14px', body: '11px', total: '16px' },
        large: { title: '16px', body: '12px', total: '18px' },
    };
    const fs = fontSizes[receiptSettings.font_size];

    const itemsHTML = items.map(item => {
        const nameJa = item.product_name_ja || '';
        const nameVi = item.product_name_vi || item.open_item_name || '';
        const lineTotal = item.quantity * item.unit_price;
        return `
            <div style="margin: 5px 0;">
                <div style="display: flex; justify-content: space-between;">
                    <span>${showJa && nameJa ? nameJa : nameVi} ×${item.quantity}</span>
                    <span>${formatCurrency(lineTotal, storeSettings.currency)}</span>
                </div>
                ${showJa && nameJa && showVi && nameVi ? `<div style="font-size: 9px; color: #666;">(${nameVi})</div>` : ''}
                ${item.note ? `<div style="font-size: 9px; color: #666;">※${showJa ? item.note.replace('Không hành', 'ネギ抜き').replace('Không', 'なし').replace('Thêm', '追加') : item.note}</div>` : ''}
            </div>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${isPreliminary ? '仮計算書' : '領収書'}</title>
    <style>
        @page { size: ${paperWidth} auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'MS Gothic', 'Meiryo', monospace;
            font-size: ${fs.body};
            width: ${contentWidth};
            padding: 5mm;
            line-height: 1.4;
        }
        .fancy-border {
            border: 2px solid #000;
            padding: 5px;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .divider { border-top: 1px solid #000; margin: 8px 0; }
    </style>
</head>
<body>
    <div class="fancy-border">
        ${isPreliminary ? '仮 計 算 書' : '領 収 書'}
    </div>
    
    <div style="text-align: center; margin-bottom: 10px;">
        <div style="font-size: ${fs.title}; font-weight: bold;">${storeSettings.store_name_ja || storeSettings.store_name}</div>
        ${storeSettings.address ? `<div style="font-size: 9px;">${storeSettings.address}</div>` : ''}
        ${storeSettings.phone ? `<div style="font-size: 9px;">TEL: ${storeSettings.phone}</div>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div style="margin-bottom: 10px;">
        <div>${formatDateTime(order.paid_at || order.created_at, true)}</div>
        ${order.table_name || order.table_number ? `<div>テーブル: ${order.table_name || `#${order.table_number}`}</div>` : ''}
        ${receiptSettings.show_order_number && order.order_number ? `<div>No. ${order.order_number}</div>` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div style="margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>品名</span>
            <span>金額</span>
        </div>
    </div>
    
    ${itemsHTML}
    
    <div class="divider"></div>
    
    <div style="margin: 10px 0;">
        <div style="display: flex; justify-content: space-between;">
            <span>小計</span>
            <span>${formatCurrency(order.subtotal, storeSettings.currency)}</span>
        </div>
        ${order.discount_amount > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #c00;">
                <span>割引</span>
                <span>-${formatCurrency(order.discount_amount, storeSettings.currency)}</span>
            </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 0; margin: 5px 0;">
            <span>合計</span>
            <span>${formatCurrency(order.total, storeSettings.currency)}</span>
        </div>
        <div style="text-align: right; font-size: 9px; color: #666;">(税込)</div>
    </div>
    
    ${isPreliminary ? `
        <div style="text-align: center; margin-top: 15px; padding: 10px; border: 2px solid #c00;">
            <div style="font-weight: bold; color: #c00;">
                まだお支払いされていません
            </div>
            <div style="font-size: 9px; margin-top: 5px;">
                レジにてお支払いください
            </div>
        </div>
    ` : ''}
    
    <div style="text-align: center; margin-top: 20px;">
        ${showJa && receiptSettings.footer_text_ja ? `<div>${receiptSettings.footer_text_ja}</div>` : ''}
        ${showVi && receiptSettings.footer_text_vi ? `<div>${receiptSettings.footer_text_vi}</div>` : ''}
    </div>
</body>
</html>
    `;
}

function generateSimpleReceiptHTML(options: PrintReceiptOptions): string {
    // Simple style - minimal, clean, fast printing
    const { order, items, storeSettings, printerSettings, type } = options;
    const isPreliminary = type === 'preliminary';

    const paperWidth = printerSettings.paper_width === '58mm' ? '58mm' : '80mm';
    const contentWidth = printerSettings.paper_width === '58mm' ? '48mm' : '72mm';

    const itemsHTML = items.map(item => {
        const name = item.product_name_vi || item.open_item_name || 'Item';
        const lineTotal = item.quantity * item.unit_price;
        return `<div style="display:flex;justify-content:space-between;">${item.quantity}x ${name}<span>${formatCurrency(lineTotal, storeSettings.currency)}</span></div>`;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: ${paperWidth} auto; margin: 0; }
        body { font-family: monospace; font-size: 11px; width: ${contentWidth}; padding: 3mm; line-height: 1.3; }
    </style>
</head>
<body>
    <div style="text-align:center;font-weight:bold;margin-bottom:5px;">${storeSettings.store_name}</div>
    <div style="text-align:center;font-size:9px;margin-bottom:10px;">${formatDateTime(order.paid_at || order.created_at)}</div>
    ${order.table_name || order.table_number ? `<div>Table: ${order.table_name || order.table_number}</div>` : ''}
    <div style="border-top:1px dashed #000;margin:5px 0;"></div>
    ${itemsHTML}
    <div style="border-top:1px dashed #000;margin:5px 0;"></div>
    ${order.discount_amount > 0 ? `<div style="display:flex;justify-content:space-between;">Discount<span>-${formatCurrency(order.discount_amount, storeSettings.currency)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;border-top:2px solid #000;padding-top:5px;">TOTAL<span>${formatCurrency(order.total, storeSettings.currency)}</span></div>
    ${isPreliminary ? '<div style="text-align:center;margin-top:10px;font-weight:bold;color:#c00;">** NOT PAID **</div>' : ''}
</body>
</html>
    `;
}

function generateReceiptHTML(options: PrintReceiptOptions): string {
    const template = options.receiptSettings.template || 'modern';
    switch (template) {
        case 'classic':
            return generateClassicReceiptHTML(options);
        case 'simple':
            return generateSimpleReceiptHTML(options);
        case 'modern':
        default:
            return generateModernReceiptHTML(options);
    }
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

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.onafterprint = () => {
                printWindow.close();
            };
        };
    } else {
        alert('Popup bị chặn. Vui lòng cho phép popup để in hóa đơn.');
    }
}

/**
 * Print preliminary bill (pre-bill for customer review)
 */
export function printPreliminaryBill(options: Omit<PrintReceiptOptions, 'type'>): void {
    printReceipt({ ...options, type: 'preliminary' });
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

    const itemsHTML = items.map(item => {
        const nameVi = item.product_name_vi || item.open_item_name || 'Unknown';
        const nameJa = item.product_name_ja || '';
        return `
            <div style="margin: 5px 0; font-size: 14px;">
                <strong>${item.quantity}x</strong> ${nameVi}
                ${nameJa ? `<span style="color: #666;">(${nameJa})</span>` : ''}
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
            font-family: 'Arial', 'MS Gothic', sans-serif;
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
    <div class="header">🍳 PHIẾU BẾP / キッチン</div>
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

export default { printReceipt, printPreliminaryBill, printKitchenTicket };
