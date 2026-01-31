import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { ApiError } from '../middleware/errorHandler.js';
import { AuthRequest, requireRole } from '../middleware/auth.js';
// @ts-ignore - pdfkit types
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router: Router = Router();

// Format currency
const formatCurrency = (amount: number, currency: string = 'JPY'): string => {
    if (currency === 'JPY') {
        return `¥${amount.toLocaleString('ja-JP')}`;
    }
    return `${amount.toLocaleString()}`;
};

// GET /api/export/sales - Export sales report
router.get('/sales', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date, format = 'xlsx' } = req.query;

        if (!start_date || !end_date) {
            throw new ApiError('start_date and end_date are required', 400, 'INVALID_REQUEST');
        }

        // Fetch sales data
        const salesResult = await query(`
            SELECT 
                DATE(paid_at) as date,
                COUNT(*) as order_count,
                SUM(subtotal) as revenue,
                SUM(discount_amount) as discounts,
                SUM(total) as net_revenue
            FROM orders
            WHERE status = 'paid'
              AND DATE(paid_at) >= $1
              AND DATE(paid_at) <= $2
            GROUP BY DATE(paid_at)
            ORDER BY DATE(paid_at)
        `, [start_date, end_date]);

        // Fetch order details
        const ordersResult = await query(`
            SELECT 
                o.id,
                o.order_number,
                t.name as table_name,
                o.subtotal,
                o.discount_amount,
                o.total,
                o.paid_at,
                u.name as cashier_name
            FROM orders o
            LEFT JOIN tables t ON o.table_id = t.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.status = 'paid'
              AND DATE(o.paid_at) >= $1
              AND DATE(o.paid_at) <= $2
            ORDER BY o.paid_at DESC
        `, [start_date, end_date]);

        if (format === 'pdf') {
            await generateSalesPDF(res, {
                startDate: start_date as string,
                endDate: end_date as string,
                dailySummary: salesResult.rows,
                orders: ordersResult.rows,
            });
        } else {
            await generateSalesExcel(res, {
                startDate: start_date as string,
                endDate: end_date as string,
                dailySummary: salesResult.rows,
                orders: ordersResult.rows,
            });
        }
    } catch (error) {
        next(error);
    }
});

// GET /api/export/products - Export products report
router.get('/products', requireRole('owner'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { start_date, end_date, format = 'xlsx' } = req.query;

        if (!start_date || !end_date) {
            throw new ApiError('start_date and end_date are required', 400, 'INVALID_REQUEST');
        }

        // Fetch product sales
        const productsResult = await query(`
            SELECT 
                COALESCE(p.name_vi, oi.open_item_name) as product_name,
                COALESCE(p.name_ja, '') as product_name_ja,
                SUM(oi.quantity) as quantity_sold,
                SUM(oi.quantity * oi.unit_price) as revenue
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.status = 'paid'
              AND DATE(o.paid_at) >= $1
              AND DATE(o.paid_at) <= $2
            GROUP BY COALESCE(p.name_vi, oi.open_item_name), COALESCE(p.name_ja, '')
            ORDER BY revenue DESC
        `, [start_date, end_date]);

        if (format === 'pdf') {
            await generateProductsPDF(res, {
                startDate: start_date as string,
                endDate: end_date as string,
                products: productsResult.rows,
            });
        } else {
            await generateProductsExcel(res, {
                startDate: start_date as string,
                endDate: end_date as string,
                products: productsResult.rows,
            });
        }
    } catch (error) {
        next(error);
    }
});

// Generate Sales PDF
async function generateSalesPDF(res: Response, data: {
    startDate: string;
    endDate: string;
    dailySummary: any[];
    orders: any[];
}) {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sales_report_${data.startDate}_${data.endDate}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('BÁO CÁO DOANH THU', { align: 'center' });
    doc.fontSize(12).text(`Từ ${data.startDate} đến ${data.endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const totalRevenue = data.dailySummary.reduce((sum, d) => sum + Number(d.net_revenue || 0), 0);
    const totalOrders = data.dailySummary.reduce((sum, d) => sum + Number(d.order_count || 0), 0);
    const totalDiscounts = data.dailySummary.reduce((sum, d) => sum + Number(d.discounts || 0), 0);

    doc.fontSize(14).text('TỔNG KẾT', { underline: true });
    doc.fontSize(11);
    doc.text(`Tổng doanh thu: ${formatCurrency(totalRevenue)}`);
    doc.text(`Tổng đơn hàng: ${totalOrders}`);
    doc.text(`Tổng giảm giá: ${formatCurrency(totalDiscounts)}`);
    doc.moveDown(2);

    // Daily breakdown
    doc.fontSize(14).text('DOANH THU THEO NGÀY', { underline: true });
    doc.moveDown();

    data.dailySummary.forEach(day => {
        doc.fontSize(10).text(
            `${day.date}: ${day.order_count} đơn | ${formatCurrency(Number(day.net_revenue))}`,
            { continued: false }
        );
    });

    doc.end();
}

// Generate Sales Excel
async function generateSalesExcel(res: Response, data: {
    startDate: string;
    endDate: string;
    dailySummary: any[];
    orders: any[];
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hybrid POS';
    workbook.created = new Date();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Tổng kết');
    summarySheet.columns = [
        { header: 'Ngày', key: 'date', width: 15 },
        { header: 'Số đơn', key: 'order_count', width: 12 },
        { header: 'Doanh thu', key: 'revenue', width: 18 },
        { header: 'Giảm giá', key: 'discounts', width: 15 },
        { header: 'Thu ròng', key: 'net_revenue', width: 18 },
    ];

    data.dailySummary.forEach(row => {
        summarySheet.addRow({
            date: row.date,
            order_count: Number(row.order_count),
            revenue: Number(row.revenue),
            discounts: Number(row.discounts),
            net_revenue: Number(row.net_revenue),
        });
    });

    // Style header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' },
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

    // Add total row
    const totalRow = summarySheet.addRow({
        date: 'TỔNG',
        order_count: data.dailySummary.reduce((s, d) => s + Number(d.order_count), 0),
        revenue: data.dailySummary.reduce((s, d) => s + Number(d.revenue), 0),
        discounts: data.dailySummary.reduce((s, d) => s + Number(d.discounts), 0),
        net_revenue: data.dailySummary.reduce((s, d) => s + Number(d.net_revenue), 0),
    });
    totalRow.font = { bold: true };

    // Orders Sheet
    const ordersSheet = workbook.addWorksheet('Chi tiết đơn');
    ordersSheet.columns = [
        { header: 'Mã đơn', key: 'order_number', width: 15 },
        { header: 'Bàn', key: 'table_name', width: 15 },
        { header: 'Tạm tính', key: 'subtotal', width: 15 },
        { header: 'Giảm giá', key: 'discount', width: 12 },
        { header: 'Tổng', key: 'total', width: 15 },
        { header: 'Thu ngân', key: 'cashier', width: 15 },
        { header: 'Thời gian', key: 'paid_at', width: 20 },
    ];

    data.orders.forEach(order => {
        ordersSheet.addRow({
            order_number: order.order_number || order.id.substring(0, 8),
            table_name: order.table_name || '-',
            subtotal: Number(order.subtotal),
            discount: Number(order.discount_amount),
            total: Number(order.total),
            cashier: order.cashier_name || '-',
            paid_at: order.paid_at ? new Date(order.paid_at).toLocaleString('ja-JP') : '-',
        });
    });

    ordersSheet.getRow(1).font = { bold: true };
    ordersSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' },
    };
    ordersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="sales_report_${data.startDate}_${data.endDate}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
}

// Generate Products PDF
async function generateProductsPDF(res: Response, data: {
    startDate: string;
    endDate: string;
    products: any[];
}) {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=products_report_${data.startDate}_${data.endDate}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('BÁO CÁO SẢN PHẨM', { align: 'center' });
    doc.fontSize(12).text(`Từ ${data.startDate} đến ${data.endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Products list
    doc.fontSize(14).text('SẢN PHẨM BÁN CHẠY', { underline: true });
    doc.moveDown();

    data.products.slice(0, 30).forEach((product, index) => {
        doc.fontSize(10).text(
            `${index + 1}. ${product.product_name} - ${product.quantity_sold} món - ${formatCurrency(Number(product.revenue))}`
        );
    });

    doc.end();
}

// Generate Products Excel
async function generateProductsExcel(res: Response, data: {
    startDate: string;
    endDate: string;
    products: any[];
}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hybrid POS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sản phẩm');
    sheet.columns = [
        { header: '#', key: 'rank', width: 6 },
        { header: 'Tên sản phẩm', key: 'name', width: 30 },
        { header: 'Tên tiếng Nhật', key: 'name_ja', width: 25 },
        { header: 'Số lượng', key: 'quantity', width: 12 },
        { header: 'Doanh thu', key: 'revenue', width: 18 },
    ];

    data.products.forEach((product, index) => {
        sheet.addRow({
            rank: index + 1,
            name: product.product_name,
            name_ja: product.product_name_ja || '',
            quantity: Number(product.quantity_sold),
            revenue: Number(product.revenue),
        });
    });

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };

    // Total row
    const totalRow = sheet.addRow({
        rank: '',
        name: 'TỔNG',
        name_ja: '',
        quantity: data.products.reduce((s, p) => s + Number(p.quantity_sold), 0),
        revenue: data.products.reduce((s, p) => s + Number(p.revenue), 0),
    });
    totalRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=products_report_${data.startDate}_${data.endDate}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
}

export { router as exportRouter };
