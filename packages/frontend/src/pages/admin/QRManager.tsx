import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Table } from '../../services/api';
import { QrCode, Download, Printer, RefreshCw, Check, Copy, ExternalLink } from 'lucide-react';

interface QRData {
    qrcode: string;
    url: string;
    table_id: string;
}

export default function QRManager() {
    const [tables, setTables] = useState<Table[]>([]);
    const [qrCodes, setQRCodes] = useState<Map<string, QRData>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            const res = await api.getTables();
            if (res.data && res.data.tables) {
                setTables(res.data.tables);
            }
        } catch (error) {
            console.error('Error loading tables:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateQRCode = async (tableId: string) => {
        try {
            const res = await api.getQRCode(tableId);
                                        setQRCodes(prev => {
                                            const newMap = new Map(prev);
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            if (res.data) newMap.set(tableId, res.data as any);
                                            return newMap;
                                        });
        } catch (error) {
            console.error('Error generating QR:', error);
        }
    };

    const generateAllQRCodes = async () => {
        setIsLoading(true);
        try {
            const res = await api.getAllQRCodes();
            if (res.data && res.data.qrcodes) {
                console.log('Received batch QR codes:', res.data.qrcodes.length);
                const fetchedCodes = res.data.qrcodes;
                setQRCodes(prev => {
                    const newMap = new Map(prev);
                    fetchedCodes.forEach(qr => {
                        newMap.set(qr.table_id, qr);
                    });
                    return newMap;
                });
            }
        } catch (error) {
            console.error('Error generating batch QR:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const copyLink = async (tableId: string) => {
        const qr = qrCodes.get(tableId);
        if (qr?.url) {
            await navigator.clipboard.writeText(qr.url);
            setCopiedId(tableId);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const downloadQR = (tableId: string, tableName: string) => {
        const qr = qrCodes.get(tableId);
        if (!qr?.qrcode) return;

        const link = document.createElement('a');
        link.download = `qr-${tableName.replace(/\s+/g, '-')}.png`;
        link.href = qr.qrcode;
        link.click();
    };

    const printQRCodes = () => {
        const selectedQRs = Array.from(selectedTables)
            .map(id => {
                const table = tables.find(t => t.id === id);
                const qr = qrCodes.get(id);
                return { table, qr };
            })
            .filter(item => item.table && item.qr);

        if (selectedQRs.length === 0) {
            alert('Vui lòng chọn ít nhất 1 bàn và tạo QR code trước');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Codes - Print</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; }
                    .grid { 
                        display: grid; 
                        grid-template-columns: repeat(3, 1fr); 
                        gap: 20px; 
                        padding: 20px;
                    }
                    .qr-card {
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        padding: 20px;
                        text-align: center;
                        page-break-inside: avoid;
                    }
                    .qr-card img { width: 150px; height: 150px; }
                    .table-name { 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin-top: 10px;
                        color: #1e293b;
                    }
                    .table-number { 
                        font-size: 14px; 
                        color: #64748b;
                    }
                    .url {
                        font-size: 10px;
                        color: #94a3b8;
                        margin-top: 8px;
                        word-break: break-all;
                    }
                    @media print {
                        .grid { padding: 10px; gap: 15px; }
                        .qr-card { border: 1px solid #000; }
                    }
                </style>
            </head>
            <body>
                <div class="grid">
                    ${selectedQRs.map(({ table, qr }) => `
                        <div class="qr-card">
                            <img src="${qr?.qrcode}" alt="QR Code" />
                            <div class="table-name">${table?.name || `Bàn ${table?.number}`}</div>
                            <div class="table-number">Bàn số ${table?.number}</div>
                            <div class="url">${qr?.url}</div>
                        </div>
                    `).join('')}
                </div>
                <script>
                    window.onload = () => window.print();
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const toggleSelectAll = () => {
        if (selectedTables.size === tables.length) {
            setSelectedTables(new Set());
        } else {
            setSelectedTables(new Set(tables.map(t => t.id)));
        }
    };

    const toggleSelect = (tableId: string) => {
        setSelectedTables(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tableId)) {
                newSet.delete(tableId);
            } else {
                newSet.add(tableId);
            }
            return newSet;
        });
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">QR Code Manager</h1>
                    <p className="text-slate-500">Tạo và in mã QR cho khách order</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={generateAllQRCodes}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        Tạo tất cả QR
                    </button>
                    <button
                        onClick={printQRCodes}
                        disabled={selectedTables.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                        <Printer size={18} />
                        In đã chọn ({selectedTables.size})
                    </button>
                </div>
            </div>

            {/* Select All */}
            <div className="mb-4 flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={selectedTables.size === tables.length && tables.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-slate-700">Chọn tất cả</span>
            </div>

            {/* QR Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tables.map(table => {
                    const qr = qrCodes.get(table.id);
                    const isSelected = selectedTables.has(table.id);

                    return (
                        <div
                            key={table.id}
                            className={`bg-white rounded-xl border-2 p-4 transition cursor-pointer ${isSelected
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                            onClick={() => toggleSelect(table.id)}
                        >
                            {/* Checkbox */}
                            <div className="flex items-center justify-between mb-3">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(table.id)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-5 h-5 text-blue-600 rounded"
                                />
                                <span className="text-sm font-medium text-slate-500">
                                    #{table.number}
                                </span>
                            </div>

                            {/* QR Code or Generate Button */}
                            <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center mb-3">
                                {qr?.qrcode ? (
                                    <img
                                        src={qr.qrcode}
                                        alt={`QR for ${table.name}`}
                                        className="w-full h-full p-2"
                                    />
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            generateQRCode(table.id);
                                        }}
                                        className="flex flex-col items-center gap-2 text-slate-400 hover:text-blue-600 transition"
                                    >
                                        <QrCode size={40} />
                                        <span className="text-sm">Tạo QR</span>
                                    </button>
                                )}
                            </div>

                            {/* Table Name */}
                            <h3 className="font-semibold text-slate-900 text-center mb-2">
                                {table.name || `Bàn ${table.number}`}
                            </h3>

                            {/* Actions */}
                            {qr && (
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copyLink(table.id);
                                        }}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                        title="Copy link"
                                    >
                                        {copiedId === table.id ? (
                                            <Check size={16} className="text-emerald-600" />
                                        ) : (
                                            <Copy size={16} className="text-slate-600" />
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadQR(table.id, table.name || `ban-${table.number}`);
                                        }}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                        title="Download"
                                    >
                                        <Download size={16} className="text-slate-600" />
                                    </button>
                                    <a
                                        href={qr.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                        title="Preview"
                                    >
                                        <ExternalLink size={16} className="text-slate-600" />
                                    </a>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {tables.length === 0 && !isLoading && (
                <div className="text-center py-12 text-slate-400">
                    <QrCode size={48} className="mx-auto mb-4" />
                    <p>Chưa có bàn nào. Vui lòng tạo bàn trước.</p>
                </div>
            )}
        </div>
    );
}
