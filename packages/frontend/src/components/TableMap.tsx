import { useState, useEffect } from 'react';
import type { Table, Area } from '../services/api';
import { api } from '../services/api';
import { Clock, Users, QrCode, ArrowRight, Merge, MoreHorizontal } from 'lucide-react';
import { useToast } from './Toast';

interface TableMapProps {
    tables: Table[];
    selectedTable: Table | null;
    onTableSelect: (table: Table) => void;
    onRefresh?: () => void;
}

export default function TableMap({ tables, selectedTable, onTableSelect, onRefresh }: TableMapProps) {
    const toast = useToast();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    // We keep contextMenu state for backward compatibility or complex actions, 
    // but the primary interaction is now via the Quick Menu button
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [transferModal, setTransferModal] = useState<Table | null>(null);
    const [mergeModal, setMergeModal] = useState<Table | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Area Support
    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedArea, setSelectedArea] = useState<string>('all');

    useEffect(() => {
        loadAreas();
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const loadAreas = async () => {
        try {
            const res = await api.getAreas();
            if (res.data?.areas) {
                setAreas(res.data.areas);
            }
        } catch (error) {
            console.error('Failed to load areas:', error);
        }
    };

    // New Color Logic: Returns the "Theme Color" for the table state
    const getThemeColor = (status: string) => {
        switch (status) {
            case 'available': return 'emerald';
            case 'occupied': return 'orange';
            case 'reserved': return 'blue';
            case 'cleaning': return 'slate';
            default: return 'slate';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'available': return 'Trống';
            case 'occupied': return 'Đang dùng';
            case 'reserved': return 'Đã đặt';
            case 'cleaning': return 'Đang dọn';
            default: return status;
        }
    };

    const getSessionDuration = (startedAt?: string) => {
        if (!startedAt) return '';
        // Parse the server timestamp - JavaScript Date handles ISO 8601 with timezone correctly
        const start = new Date(startedAt);
        const now = new Date();

        // Both dates are now in UTC internally, so difference is correct
        const diffMs = now.getTime() - start.getTime();

        // If negative (server time is in future), return 0
        if (diffMs < 0) return '0p';

        const diff = Math.floor(diffMs / 1000 / 60);
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return hours > 0 ? `${hours}h ${mins}p` : `${mins}p`;
    };

    const filteredTables = tables.filter(t => {
        if (selectedArea === 'all') return true;
        if (selectedArea === 'none') return !t.area_id;
        return t.area_id === selectedArea;
    });

    // Transfer table
    const handleTransfer = async (targetTable: Table) => {
        if (!transferModal) return;
        setIsLoading(true);
        try {
            await api.transferTable(transferModal.id, targetTable.id);
            setTransferModal(null);
            onRefresh?.();
        } catch (error) {
            console.error('Error transferring table:', error);
            toast.error('Không thể chuyển bàn', 'Vui lòng thử lại sau');
        } finally {
            setIsLoading(false);
        }
    };

    // Merge tables
    const handleMerge = async (sourceTable: Table) => {
        if (!mergeModal) return;
        setIsLoading(true);
        try {
            await api.mergeTables(mergeModal.id, sourceTable.id);
            setMergeModal(null);
            onRefresh?.();
        } catch (error) {
            console.error('Error merging tables:', error);
            toast.error('Không thể gộp bàn', 'Vui lòng thử lại sau');
        } finally {
            setIsLoading(false);
        }
    };

    const availableTables = tables.filter(t => t.status === 'available');
    const occupiedTablesForMerge = tables.filter(t =>
        t.status === 'occupied' && t.id !== mergeModal?.id
    );

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="text-blue-600" size={24} />
                        Sơ đồ bàn
                    </h2>
                    <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-emerald-600 font-medium">
                            {filteredTables.filter(t => t.status === 'available').length} bàn trống
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="text-orange-600 font-medium">
                            {filteredTables.filter(t => t.status === 'occupied').length} đang dùng
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Area Filters */}
                    {areas.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto max-w-[500px] scrollbar-hide py-1">
                            <button
                                onClick={() => setSelectedArea('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedArea === 'all'
                                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                            >
                                Tất cả
                            </button>
                            {areas.map(area => (
                                <button
                                    key={area.id}
                                    onClick={() => setSelectedArea(area.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${selectedArea === area.id
                                        ? `bg-${area.color || 'blue'}-500 text-white shadow-lg shadow-${area.color || 'blue'}-200`
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                >
                                    {area.name || area.name_vi}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-20">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filteredTables.map((table) => {
                            const color = getThemeColor(table.status);
                            const isSelected = selectedTable?.id === table.id;

                            return (
                                <div
                                    key={table.id}
                                    className={`relative group bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border overflow-hidden ${isSelected
                                        ? `border-${color}-500 ring-2 ring-${color}-200`
                                        : 'border-slate-200'
                                        }`}
                                >
                                    {/* Top Color Bar */}
                                    <div className={`h-1.5 w-full bg-${color}-500`} />

                                    {/* Quick Actions Button */}
                                    <div className="absolute top-3 right-3 z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === table.id ? null : table.id);
                                            }}
                                            className={`p-1.5 rounded-full transition-colors ${activeMenuId === table.id
                                                ? 'bg-slate-100 text-slate-900'
                                                : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'
                                                }`}
                                        >
                                            <MoreHorizontal size={20} />
                                        </button>

                                        {/* Dropdown Menu */}
                                        {activeMenuId === table.id && (
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                {table.status === 'occupied' ? (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTransferModal(table);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 font-medium"
                                                        >
                                                            <ArrowRight size={16} className="text-slate-400" />
                                                            Chuyển bàn
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMergeModal(table);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center gap-3 text-sm text-slate-700 font-medium"
                                                        >
                                                            <Merge size={16} className="text-slate-400" />
                                                            Gộp bàn
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="px-4 py-2 text-xs text-slate-400 text-center italic">
                                                        Bàn trống không có hành động
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Main Card Content - Click to Select */}
                                    <div
                                        className="p-5 cursor-pointer"
                                        onClick={() => onTableSelect(table)}
                                    >
                                        {/* Header: Name + Badge */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <div className="text-2xl font-bold text-slate-800 tracking-tight">
                                                    {table.number}
                                                </div>
                                                <div className="text-xs font-medium text-slate-400 mt-0.5 truncate max-w-[100px]" title={table.name}>
                                                    {table.name}
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${table.status === 'available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                table.status === 'occupied' ? 'bg-orange-50 text-orange-600 border border-orange-100 animate-pulse' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                {getStatusLabel(table.status)}
                                            </span>
                                        </div>

                                        {/* Occupied State Info */}
                                        {table.status === 'occupied' ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                                                        // Alert if over 2 hours
                                                        table.session_started_at && (new Date().getTime() - new Date(table.session_started_at).getTime()) > 7200000
                                                            ? 'text-red-500'
                                                            : 'text-slate-500'
                                                        }`}>
                                                        <Clock size={14} />
                                                        {getSessionDuration(table.session_started_at)}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
                                                        <span className="text-xs text-slate-400 font-normal">¥</span>
                                                        {Math.round(table.current_order_total || 0).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Empty State Info */
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 text-slate-300 px-1">
                                                    <Users size={14} />
                                                    <span className="text-xs font-medium">{table.capacity} chỗ</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* QR Indicator */}
                                        {table.session_token && (
                                            <div className="absolute bottom-2 right-2 opacity-20 transform rotate-12 pointer-events-none">
                                                <QrCode size={32} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List View Redesigned */
                    <div className="space-y-3">
                        {filteredTables.map((table) => {
                            const color = getThemeColor(table.status);
                            const isSelected = selectedTable?.id === table.id;

                            return (
                                <div
                                    key={table.id}
                                    onClick={() => onTableSelect(table)}
                                    className={`relative flex items-center justify-between p-4 bg-white rounded-xl border transition-all cursor-pointer ${isSelected
                                        ? `border-${color}-500 shadow-md ring-1 ring-${color}-200`
                                        : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-6">
                                        <div className={`w-1.5 h-12 rounded-full bg-${color}-500`} />
                                        <div>
                                            <div className="text-lg font-bold text-slate-800 flex items-center gap-3">
                                                {table.number}
                                                <span className="text-sm font-normal text-slate-400 px-2 border-l border-slate-200">{table.name}</span>
                                            </div>
                                            <div className="text-sm text-slate-500 flex items-center gap-4 mt-1">
                                                <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded text-xs font-medium">
                                                    <Users size={12} /> {table.capacity} khách
                                                </span>
                                                {table.status === 'occupied' && (
                                                    <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                                                        <Clock size={12} /> {getSessionDuration(table.session_started_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {table.current_order_total && table.current_order_total > 0 && (
                                            <div className="text-right">
                                                <div className="text-xs text-slate-400">Tạm tính</div>
                                                <div className="font-bold text-slate-800">¥{Math.round(table.current_order_total || 0).toLocaleString()}</div>
                                            </div>
                                        )}
                                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${table.status === 'available' ? 'bg-emerald-50 text-emerald-600' :
                                            table.status === 'occupied' ? 'bg-orange-50 text-orange-600 animate-pulse' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {getStatusLabel(table.status)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Transfer Modal - Kept Functional */}
            {transferModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <ArrowRight size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Chuyển Bàn {transferModal.number}</h3>
                                <p className="text-sm text-slate-500">Chuyển toàn bộ đơn hàng sang bàn mới</p>
                            </div>
                        </div>

                        {availableTables.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-3">😬</div>
                                <p className="text-slate-500 font-medium">Không còn bàn trống nào!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-3 mb-6 max-h-[300px] overflow-y-auto">
                                {availableTables.map(table => (
                                    <button
                                        key={table.id}
                                        onClick={() => handleTransfer(table)}
                                        disabled={isLoading}
                                        className="aspect-square flex flex-col items-center justify-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all border border-emerald-100 hover:border-emerald-300 hover:shadow-md group"
                                    >
                                        <span className="text-xl font-bold group-hover:scale-110 transition-transform">{table.number}</span>
                                        <span className="text-[10px] opacity-70">Trống</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setTransferModal(null)}
                            className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                    </div>
                </div>
            )}

            {/* Merge Modal - Kept Functional */}
            {mergeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                <Merge size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Gộp Bàn vào {mergeModal.number}</h3>
                                <p className="text-sm text-slate-500">Chọn bàn muốn gộp vào bàn này</p>
                            </div>
                        </div>

                        {occupiedTablesForMerge.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-slate-500 font-medium">Không có bàn nào khác đang dùng!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-3 mb-6 max-h-[300px] overflow-y-auto">
                                {occupiedTablesForMerge.map(table => (
                                    <button
                                        key={table.id}
                                        onClick={() => handleMerge(table)}
                                        disabled={isLoading}
                                        className="aspect-square flex flex-col items-center justify-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl transition-all border border-orange-100 hover:border-orange-300 hover:shadow-md group"
                                    >
                                        <span className="text-xl font-bold group-hover:scale-110 transition-transform">{table.number}</span>
                                        <span className="text-[10px] opacity-70">Đang chọn</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setMergeModal(null)}
                            className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
