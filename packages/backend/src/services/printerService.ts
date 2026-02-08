import {
    ThermalPrinter,
    PrinterTypes,
    CharacterSet,
} from 'node-thermal-printer';
import { query } from '../db/pool.js';

export interface PrintOrderData {
    order_number: string;
    table_name?: string;
    items: any[];
    subtotal: number;
    discount_amount: number;
    total: number;
    cashier_name?: string;
    created_at: string;
    payments: any[];
}

export class PrinterService {
    /**
     * Prints a receipt directly to a network printer
     */
    static async printDirect(orderId: string, printerIp: string, printerType: string = 'EPSON') {
        // 1. Fetch full order data
        const orderResult = await query(`
            SELECT o.*, t.name as table_name, u.name as cashier_name
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.id = $1
        `, [orderId]);

        if (orderResult.rows.length === 0) throw new Error('Order not found');
        const order = orderResult.rows[0];

        const itemsResult = await query(`
            SELECT oi.*, p.name_vi, p.name_ja
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `, [orderId]);
        const items = itemsResult.rows;

        // 2. Initialize printer
        const printer = new ThermalPrinter({
            type: printerType === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON,
            interface: `tcp://${printerIp}`,
            // characterSet: CharacterSet.PC852, // Common for Vietnamese/Latin
            removeSpecialCharacters: false,
            width: 42, // Default for 80mm
        });

        const isConnected = await printer.isPrinterConnected();
        if (!isConnected) throw new Error(`Cannot connect to printer at ${printerIp}`);

        // 3. Build Receipt
        printer.alignCenter();
        printer.bold(true);
        printer.setTextDoubleHeight();
        printer.setTextDoubleWidth();
        printer.println("IZAKAYA ORDER");
        printer.setTextNormal();
        printer.println("--------------------------------");

        printer.alignLeft();
        printer.println(`Đơn hàng: #${order.order_number}`);
        printer.println(`Bàn: ${order.table_name || 'Take-away'}`);
        printer.println(`Ngày: ${new Date(order.created_at).toLocaleString('vi-VN')}`);
        if (order.cashier_name) printer.println(`NV: ${order.cashier_name}`);
        printer.println("--------------------------------");

        // Header table
        printer.tableCustom([
            { text: "Món", align: "LEFT", width: 0.5 },
            { text: "SL", align: "CENTER", width: 0.2 },
            { text: "Tiền", align: "RIGHT", width: 0.3 }
        ]);

        // Items
        for (const item of items) {
            const name = item.name_vi || item.open_item_name || 'Unknown';
            const price = (item.unit_price * item.quantity).toLocaleString();
            printer.tableCustom([
                { text: name, align: "LEFT", width: 0.5 },
                { text: item.quantity.toString(), align: "CENTER", width: 0.2 },
                { text: price, align: "RIGHT", width: 0.3 }
            ]);
            if (item.note) {
                // printer.italic(true);
                printer.println(`  * ${item.note}`);
                // printer.italic(false);
            }
        }

        printer.println("--------------------------------");
        printer.alignRight();
        printer.println(`Tạm tính:  ${Number(order.subtotal).toLocaleString()}đ`);
        if (order.discount_amount > 0) {
            printer.println(`Giảm giá: -${Number(order.discount_amount).toLocaleString()}đ`);
        }

        printer.bold(true);
        printer.setTextDoubleHeight();
        printer.println(`TỔNG CỘNG: ${Number(order.total).toLocaleString()}đ`);
        printer.setTextNormal();
        printer.bold(false);

        printer.println("--------------------------------");
        printer.alignCenter();
        printer.println("Cảm ơn Quý khách!");
        printer.println("Hẹn gặp lại!");

        // 4. Execute Print
        printer.cut();
        try {
            await printer.execute();
            console.log(`✅ [Printer] Order #${order.order_number} printed to ${printerIp}`);
            return { success: true };
        } catch (error) {
            console.error(`❌ [Printer] Print failed:`, error);
            throw error;
        }
    }

    /**
     * Prints a ticket for the kitchen
     */
    static async printKitchenTicket(orderId: string, printerIp: string) {
        // Similar logic but only items with display_in_kitchen = true
        // and bigger font for table number
    }
}
