import { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import type { KitchenItem } from '../../services/api';
import { Clock, RefreshCw, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';

export default function KitchenHistory() {
    const [items, setItems] = useState<KitchenItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'cancelled'>('all');

    useEffect(() => {
        loadHistory();

        // Auto refresh every minute
        const interval = setInterval(loadHistory, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const response = await api.getKitchenHistory();
            if (response.data) {
                setItems(response.data.history);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        let result = items;

        // Filter by status
        if (statusFilter !== 'all') {
            result = result.filter(item =>
                statusFilter === 'cancelled'
                    ? item.kitchen_status === 'cancelled'
                    : item.kitchen_status !== 'cancelled'
            );
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item =>
                (item.product_name_vi?.toLowerCase().includes(query)) ||
                (item.open_item_name?.toLowerCase().includes(query)) ||
                (item.table_name?.toLowerCase().includes(query)) ||
                (`bàn ${item.table_number}`.toLowerCase().includes(query)) ||
                (item.note?.toLowerCase().includes(query))
            );
        }

        return result;
    }, [items, searchQuery, statusFilter]);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDuration = (start: string, end?: string) => {
        if (!end) return '-';
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const minutes = Math.floor((endTime - startTime) / 60000);
        return `${minutes}m`;
    };

    const statsCompleted = items.filter(i => i.kitchen_status !== 'cancelled').length;
    const statsCancelled = items.filter(i => i.kitchen_status === 'cancelled').length;

    return (
        <div className="h-full flex flex-col bg-slate-900 text-slate-100 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Clock className="text-blue-400" />
                        Lịch sử trả món (24h)
                    </h2>
                    <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-emerald-400">✓ Hoàn thành: {statsCompleted}</span>
                        <span className="text-red-400">✕ Đã hủy: {statsCancelled}</span>
                    </div>
                </div>
                <button
                    onClick={loadHistory}
                    disabled={loading}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                {/* Search Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm món, tên bàn, ghi chú..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all ${statusFilter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setStatusFilter('ready')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'ready'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <CheckCircle2 size={16} /> Hoàn thành
                    </button>
                    <button
                        onClick={() => setStatusFilter('cancelled')}
                        className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5 ${statusFilter === 'cancelled'
                                ? 'bg-red-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                    >
                        <XCircle size={16} /> Đã hủy
                    </button>
                </div>
            </div>

            {/* Results count */}
            {searchQuery && (
                <div className="text-sm text-slate-500 mb-2">
                    Tìm thấy {filteredItems.length} kết quả cho "{searchQuery}"
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto bg-slate-800 rounded-xl border border-slate-700">
                <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-bold sticky top-0">
                        <tr>
                            <th className="p-4">Thời gian</th>
                            <th className="p-4">Bàn</th>
                            <th className="p-4">Món ăn</th>
                            <th className="p-4">SL</th>
                            <th className="p-4">Trạng thái</th>
                            <th className="p-4">Thời gian chế biến</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {loading && items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    <div className="flex justify-center gap-2">
                                        <RefreshCw className="animate-spin" /> Đang tải...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500">
                                    {searchQuery || statusFilter !== 'all'
                                        ? 'Không tìm thấy kết quả phù hợp'
                                        : 'Chưa có món nào được trả trong 24h qua'}
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4 font-mono text-slate-300">
                                        {formatTime(item.kitchen_ready_at || item.created_at)}
                                    </td>
                                    <td className="p-4 font-bold text-orange-300">
                                        {item.table_name || `Bàn ${item.table_number}`}
                                    </td>
                                    <td className="p-4 font-medium text-white">
                                        {item.product_name_vi || item.open_item_name}
                                        {item.note && (
                                            <div className="text-xs text-yellow-500 italic mt-1">{item.note}</div>
                                        )}
                                    </td>
                                    <td className="p-4 font-bold text-blue-300">
                                        x{item.quantity}
                                    </td>
                                    <td className="p-4">
                                        {item.kitchen_status === 'cancelled' ? (
                                            <span className="flex items-center gap-1 text-red-400 text-sm font-bold">
                                                <XCircle size={16} /> Đã hủy
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-emerald-400 text-sm font-bold">
                                                <CheckCircle2 size={16} /> Đã xong
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-400 font-mono text-sm">
                                        {getDuration(item.kitchen_started_at || item.created_at, item.kitchen_ready_at)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
