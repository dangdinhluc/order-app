import express from 'express';
import QRCode from 'qrcode';

export const qrcodeRouter: express.Router = express.Router();

/**
 * GET /api/qrcode/:tableId
 * Generate QR code for a table
 */
qrcodeRouter.get('/:tableId', async (req, res) => {
    try {
        const { tableId } = req.params;
        const { format } = req.query; // 'svg' | 'png' | 'dataurl'

        // Get base URL from settings or environment
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const orderUrl = `${baseUrl}/customer/${tableId}`;

        const options = {
            errorCorrectionLevel: 'M' as const,
            margin: 2,
            width: 300,
            color: {
                dark: '#1e293b',
                light: '#ffffff'
            }
        };

        if (format === 'svg') {
            const svg = await QRCode.toString(orderUrl, { ...options, type: 'svg' });
            res.type('image/svg+xml').send(svg);
        } else if (format === 'png') {
            const buffer = await QRCode.toBuffer(orderUrl, { ...options, type: 'png' });
            res.type('image/png').send(buffer);
            // Default: return data URL (default is png)
            const dataUrl = await QRCode.toDataURL(orderUrl, options);
            res.json({
                success: true,
                data: {
                    qrcode: dataUrl,
                    url: orderUrl,
                    table_id: tableId
                }
            });
        }
    } catch (error) {
        console.error('QR code generation error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Lỗi tạo mã QR',
                code: 'QR_GEN_ERROR'
            }
        });
    }
});

/**
 * GET /api/qrcode/batch
 * Generate QR codes for multiple tables
 */
qrcodeRouter.get('/batch/all', async (req, res) => {
    try {
        const { query: dbQuery } = await import('../db/pool.js');

        const tablesResult = await dbQuery(
            'SELECT id, number, name FROM tables ORDER BY number ASC'
        );

        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const qrcodes = [];

        for (const table of tablesResult.rows) {
            const orderUrl = `${baseUrl}/customer/${table.id}`;
            const dataUrl = await QRCode.toDataURL(orderUrl, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: 200
            });

            qrcodes.push({
                table_id: table.id,
                table_number: table.number,
                table_name: table.name,
                qrcode: dataUrl,
                url: orderUrl
            });
        }

        res.json({
            success: true,
            data: { qrcodes }
        });
    } catch (error) {
        console.error('Batch QR code error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Lỗi tạo mã QR hàng loạt',
                code: 'BATCH_QR_ERROR'
            }
        });
    }
});

export default qrcodeRouter;
