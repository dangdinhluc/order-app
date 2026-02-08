import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
    Shield, Search, Filter, Calendar, User, Eye,
    AlertTriangle, Check, X, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
    id: string;
    user_id: string;
    user_name: string;
    user_role: string;
    action: string;
    target_type: string;
    target_id: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    old_value: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
    new_value: any;
    reason: string;
    ip_address: string;
    created_at: string;
}

export default function AuditLog() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [actions, setActions] = useState<string[]>([]);
    const [selectedAction, setSelectedAction] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Details Modal
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchActions();
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [page, selectedAction, selectedUser, dateRange]);

    const fetchActions = async () => {
        try {
            const res = await api.getAuditActions();
            setActions(res.data?.actions || []);
        } catch (error) {
            console.error('Failed to fetch actions:', error);
        }
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const res = await api.getAuditLogs({
                page,
                limit: 50,
                action: selectedAction,
                user_name: selectedUser,
                from_date: dateRange.start,
                to_date: dateRange.end,
            });
            setLogs(res.data?.logs || []);
            setTotal(res.data?.total || 0);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to format action name nicely
    const formatAction = (action: string) => {
        return action
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Helper to determine badge color for action
    const getActionColor = (action: string) => {
        if (action.includes('delete') || action.includes('void') || action.includes('cancel')) return 'bg-red-100 text-red-700';
        if (action.includes('update') || action.includes('edit')) return 'bg-amber-100 text-amber-700';
        if (action.includes('create') || action.includes('add')) return 'bg-emerald-100 text-emerald-700';
        if (action.includes('login') || action.includes('logout')) return 'bg-blue-100 text-blue-700';
        return 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-blue-600" />
                        Nhật ký hoạt động
                    </h1>
                    <p className="text-slate-500">Theo dõi các thay đổi và hành động quan trọng trong hệ thống</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại hành động</label>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={selectedAction}
                            onChange={(e) => setSelectedAction(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                        >
                            <option value="">Tất cả hành động</option>
                            {actions.map(action => (
                                <option key={action} value={action}>{formatAction(action)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <button
                    onClick={() => { setSelectedAction(''); setDateRange({ start: '', end: '' }); }}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                    Xóa lọc
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-semibold text-slate-700">Thời gian</th>
                                <th className="p-4 font-semibold text-slate-700">Người thực hiện</th>
                                <th className="p-4 font-semibold text-slate-700">Hành động</th>
                                <th className="p-4 font-semibold text-slate-700">Chi tiết / Lý do</th>
                                <th className="p-4 font-semibold text-slate-700 w-24">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                        <td className="p-4"><div className="h-4 bg-slate-100 rounded w-48"></div></td>
                                        <td className="p-4"><div className="h-8 w-8 bg-slate-100 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        Không tìm thấy nhật ký nào
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition">
                                        <td className="p-4 text-slate-600 whitespace-nowrap">
                                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-slate-800">{log.user_name || 'System'}</div>
                                            <div className="text-xs text-slate-500 capitalize">{log.user_role}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                                                {formatAction(log.action)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600 max-w-md truncate">
                                            {log.reason || '-'}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-sm text-slate-500">
                        Hiển thị {logs.length} / {total} kết quả
                    </p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            disabled={logs.length < 50}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold text-slate-800">Chi tiết nhật ký</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Thời gian</label>
                                    <p className="font-medium text-slate-800 mt-1">
                                        {format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss')}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">IP Address</label>
                                    <p className="font-medium text-slate-800 mt-1">{selectedLog.ip_address || 'Unknown'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Người thực hiện</label>
                                    <p className="font-medium text-slate-800 mt-1">{selectedLog.user_name}</p>
                                    <p className="text-sm text-slate-500 capitalize">{selectedLog.user_role}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hành động</label>
                                    <p className="font-medium text-slate-800 mt-1">{formatAction(selectedLog.action)}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lý do / Notes</label>
                                    <p className="font-medium text-slate-800 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        {selectedLog.reason || 'Không có ghi chú'}
                                    </p>
                                </div>
                            </div>

                            <hr />

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1">
                                        <FileText size={14} /> Dữ liệu cũ
                                    </label>
                                    <pre className="mt-2 text-xs bg-red-50 text-red-900 p-3 rounded-lg overflow-x-auto border border-red-100">
                                        {selectedLog.old_value ? JSON.stringify(selectedLog.old_value, null, 2) : 'null'}
                                    </pre>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-1">
                                        <FileText size={14} /> Dữ liệu mới
                                    </label>
                                    <pre className="mt-2 text-xs bg-green-50 text-green-900 p-3 rounded-lg overflow-x-auto border border-green-100">
                                        {selectedLog.new_value ? JSON.stringify(selectedLog.new_value, null, 2) : 'null'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
