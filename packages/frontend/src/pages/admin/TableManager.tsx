import { useState, useEffect } from 'react';
import { api, type Table, type Area, type CreateAreaDTO, type CreateTableDTO, type UpdateTableDTO } from '../../services/api';
import {
    LayoutGrid, Plus, Edit2, Trash2,
    Layers, X, Loader2, QrCode, Download, Printer, RefreshCw, Check, Copy, ExternalLink
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

interface QRData {
    qrcode: string;
    url: string;
    table_id: string;
}

type TabType = 'tables' | 'qrcodes';

export default function TableManager() {
    const [activeTab, setActiveTab] = useState<TabType>('tables');
    const [areas, setAreas] = useState<Area[]>([]);
    const [allTables, setAllTables] = useState<Table[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

    // Modals
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    // Form Data
    const [areaForm, setAreaForm] = useState<CreateAreaDTO>({ name: '', sort_order: 0 });
    const [tableForm, setTableForm] = useState<CreateTableDTO>({
        number: 1,
        name: '',
        capacity: 4,
        area_id: '',
        position_x: 0,
        position_y: 0
    });

    // QR Code State
    const [qrCodes, setQRCodes] = useState<Map<string, QRData>>(new Map());
    const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);

    // Delete confirmation states
    const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);
    const [deleteTableId, setDeleteTableId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [areasRes, tablesRes] = await Promise.all([
                api.getAreas(),
                api.getTables()
            ]);

            if (areasRes.data) {
                setAreas(areasRes.data.areas);
                if (!activeAreaId && areasRes.data.areas.length > 0) {
                    setActiveAreaId(areasRes.data.areas[0].id);
                }
            }
            if (tablesRes.data) {
                setAllTables(tablesRes.data.tables);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Table handlers
    const handleSaveArea = async () => {
        try {
            if (editingArea) {
                await api.updateArea(editingArea.id, areaForm);
            } else {
                await api.createArea(areaForm);
            }
            setShowAreaModal(false);
            setEditingArea(null);
            setAreaForm({ name: '', sort_order: 0 });
            loadData();
        } catch (error) {
            console.error('Failed to save area:', error);
            alert('Có lỗi xảy ra khi lưu khu vực');
        }
    };

    const handleDeleteArea = async (id: string) => {
        setDeleteAreaId(id);
    };

    const confirmDeleteArea = async () => {
        if (!deleteAreaId) return;
        try {
            await api.deleteArea(deleteAreaId);
            loadData();
            if (activeAreaId === deleteAreaId) setActiveAreaId(null);
        } catch (error) {
            console.error('Failed to delete area:', error);
            alert('Không thể xóa khu vực này (có thể đang chứa bàn)');
        } finally {
            setDeleteAreaId(null);
        }
    };

    const handleSaveTable = async () => {
        try {
            const payload: CreateTableDTO = {
                ...tableForm,
                area_id: activeAreaId || undefined
            };

            if (editingTable) {
                await api.updateTable(editingTable.id, payload as UpdateTableDTO);
            } else {
                await api.createTable(payload);
            }
            setShowTableModal(false);
            setEditingTable(null);
            resetTableForm();
            loadData();
        } catch (error) {
            console.error('Failed to save table:', error);
            alert('Có lỗi xảy ra khi lưu bàn');
        }
    };

    const handleDeleteTable = async (id: string) => {
        setDeleteTableId(id);
    };

    const confirmDeleteTable = async () => {
        if (!deleteTableId) return;
        try {
            await api.deleteTable(deleteTableId);
            loadData();
        } catch (error) {
            console.error('Failed to delete table:', error);
            alert('Không thể xóa bàn này (đang có đơn hàng hoặc lỗi hệ thống)');
        } finally {
            setDeleteTableId(null);
        }
    };

    const resetTableForm = () => {
        const nextNumber = allTables.length > 0
            ? Math.max(...allTables.map(t => t.number)) + 1
            : 1;
        setTableForm({
            number: nextNumber,
            name: `Bàn ${nextNumber}`,
            capacity: 4,
            area_id: activeAreaId || '',
            position_x: 0,
            position_y: 0
        });
    };

    const openTableModal = (table?: Table) => {
        if (table) {
            setEditingTable(table);
            setTableForm({
                number: table.number,
                name: table.name,
                capacity: table.capacity,
                area_id: table.area_id || activeAreaId || '',
                position_x: table.position_x,
                position_y: table.position_y
            });
        } else {
            setEditingTable(null);
            resetTableForm();
        }
        setShowTableModal(true);
    };

    const openAreaModal = (area?: Area) => {
        if (area) {
            setEditingArea(area);
            setAreaForm({ name: area.name, sort_order: area.sort_order });
        } else {
            setEditingArea(null);
            setAreaForm({ name: '', sort_order: areas.length + 1 });
        }
        setShowAreaModal(true);
    };

    // QR Code handlers
    const generateQRCode = async (tableId: string) => {
        try {
            const res = await api.getQRCode(tableId);
            if (res.data) {
                setQRCodes(prev => new Map(prev).set(tableId, res.data as QRData));
            }
        } catch (error) {
            console.error('Error generating QR:', error);
        }
    };

    const generateAllQRCodes = async () => {
        setQrLoading(true);
        try {
            const res = await api.getAllQRCodes();
            if (res.data && res.data.qrcodes) {
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
            setQrLoading(false);
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
                const table = allTables.find(t => t.id === id);
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
        if (selectedTables.size === allTables.length) {
            setSelectedTables(new Set());
        } else {
            setSelectedTables(new Set(allTables.map(t => t.id)));
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

    // Filter tables by active area
    const activeTables = allTables.filter(t => {
        if (!activeAreaId) return false;
        return t.area_id === activeAreaId;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý Bàn & Khu vực</h1>
                    <p className="text-slate-500">Thiết lập sơ đồ nhà hàng và mã QR</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('tables')}
                    className={`px-4 py-2.5 font-medium text-sm transition-all border-b-2 -mb-px ${activeTab === 'tables'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <LayoutGrid size={18} className="inline mr-2" />
                    Quản lý Bàn
                </button>
                <button
                    onClick={() => setActiveTab('qrcodes')}
                    className={`px-4 py-2.5 font-medium text-sm transition-all border-b-2 -mb-px ${activeTab === 'qrcodes'
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <QrCode size={18} className="inline mr-2" />
                    QR Code
                </button>
            </div>

            {/* Tables Tab */}
            {activeTab === 'tables' && (
                <>
                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => openAreaModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                        >
                            <Layers size={18} />
                            Thêm Khu vực
                        </button>
                        <button
                            onClick={() => openTableModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-sm"
                            disabled={!activeAreaId}
                        >
                            <Plus size={18} />
                            Thêm Bàn
                        </button>
                    </div>

                    {/* Areas Tabs */}
                    <div className="flex overflow-x-auto gap-2 pb-2 border-b border-slate-200 no-scrollbar">
                        {areas.map(area => (
                            <div key={area.id} className="group relative">
                                <button
                                    onClick={() => setActiveAreaId(area.id)}
                                    className={`px-4 py-2 whitespace-nowrap text-sm font-medium rounded-lg transition ${activeAreaId === area.id
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {area.name}
                                </button>
                                <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-1 bg-white shadow-sm rounded-full p-0.5 border border-slate-100">
                                    <button onClick={(e) => { e.stopPropagation(); openAreaModal(area); }} className="p-1 hover:text-blue-600 rounded-full"><Edit2 size={10} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteArea(area.id); }} className="p-1 hover:text-red-600 rounded-full"><Trash2 size={10} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tables Grid */}
                    {activeAreaId ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {activeTables.map(table => (
                                <div
                                    key={table.id}
                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group hover:border-blue-300 transition"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${table.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                                            table.status === 'occupied' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {table.status === 'available' ? 'Trống' : 'Có khách'}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                onClick={() => openTableModal(table)}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTable(table.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-slate-800 text-lg">{table.name}</h3>
                                    <div className="flex items-center gap-1 text-slate-500 text-sm mt-1">
                                        <LayoutGrid size={14} />
                                        <span>{table.capacity} ghế</span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-2">
                                        Số: {table.number}
                                    </div>
                                </div>
                            ))}

                            {/* Add Button Card */}
                            <button
                                onClick={() => openTableModal()}
                                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition min-h-[120px]"
                            >
                                <Plus size={24} className="mb-2" />
                                <span className="font-medium text-sm">Thêm bàn</span>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                            <p>Vui lòng chọn hoặc tạo khu vực để quản lý bàn</p>
                        </div>
                    )}
                </>
            )}

            {/* QR Codes Tab */}
            {activeTab === 'qrcodes' && (
                <>
                    {/* QR Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedTables.size === allTables.length && allTables.length > 0}
                                onChange={toggleSelectAll}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                            <span className="text-slate-700">Chọn tất cả</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={generateAllQRCodes}
                                disabled={qrLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={qrLoading ? 'animate-spin' : ''} />
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

                    {/* QR Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {allTables.map(table => {
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

                                    <h3 className="font-semibold text-slate-900 text-center mb-2">
                                        {table.name || `Bàn ${table.number}`}
                                    </h3>

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

                    {allTables.length === 0 && (
                        <div className="text-center py-12 text-slate-400">
                            <QrCode size={48} className="mx-auto mb-4" />
                            <p>Chưa có bàn nào. Vui lòng tạo bàn trước.</p>
                        </div>
                    )}
                </>
            )}

            {/* Area Modal */}
            {showAreaModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingArea ? 'Sửa Khu vực' : 'Thêm Khu vực'}
                            </h3>
                            <button onClick={() => setShowAreaModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên khu vực</label>
                                <input
                                    type="text"
                                    value={areaForm.name}
                                    onChange={e => setAreaForm({ ...areaForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ví dụ: Tầng 1, Sân vườn..."
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự hiển thị</label>
                                <input
                                    type="number"
                                    value={areaForm.sort_order}
                                    onChange={e => setAreaForm({ ...areaForm, sort_order: parseInt(e.target.value) || 0 })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowAreaModal(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSaveArea}
                                    disabled={!areaForm.name}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Modal */}
            {showTableModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingTable ? 'Sửa Bàn' : 'Thêm Bàn Mới'}
                            </h3>
                            <button onClick={() => setShowTableModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Số bàn</label>
                                    <input
                                        type="number"
                                        value={tableForm.number}
                                        onChange={e => {
                                            const num = parseInt(e.target.value);
                                            setTableForm({
                                                ...tableForm,
                                                number: num,
                                                name: `Bàn ${num}`
                                            });
                                        }}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Số ghế</label>
                                    <input
                                        type="number"
                                        value={tableForm.capacity}
                                        onChange={e => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị</label>
                                <input
                                    type="text"
                                    value={tableForm.name}
                                    onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Khu vực</label>
                                <select
                                    value={tableForm.area_id}
                                    onChange={e => setTableForm({ ...tableForm, area_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="" disabled>Chọn khu vực</option>
                                    {areas.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowTableModal(false)}
                                    className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSaveTable}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Area Confirmation */}
            <ConfirmModal
                isOpen={!!deleteAreaId}
                title="Xóa khu vực"
                message="Bạn có chắc muốn xóa khu vực này? Khu vực phải trống (không có bàn) mới có thể xóa."
                confirmText="Xóa"
                cancelText="Hủy"
                variant="warning"
                onConfirm={confirmDeleteArea}
                onCancel={() => setDeleteAreaId(null)}
            />

            {/* Delete Table Confirmation */}
            <ConfirmModal
                isOpen={!!deleteTableId}
                title="Xóa bàn"
                message="Bạn có chắc muốn xóa bàn này?"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDeleteTable}
                onCancel={() => setDeleteTableId(null)}
            />
        </div>
    );
}
