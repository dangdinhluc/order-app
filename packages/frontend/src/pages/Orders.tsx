import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Order } from '../services/api';
import { socketService } from '../services/socket';
import { Search, Loader2, Eye } from 'lucide-react';

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [, setSelectedOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadOrders();
        setupSocketListeners();

        return () => {
            socketService.off('order:paid', loadOrders);
            socketService.off('order:created', loadOrders);
        };
    }, [statusFilter]);

    const loadOrders = async () => {
        try {
            const params: { status?: string } = {};
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }

            const response = await api.getOrders(params);
            if (response.data) {
                setOrders(response.data.orders);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setupSocketListeners = () => {
        socketService.on('order:paid', loadOrders);
        socketService.on('order:created', loadOrders);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; text: string; label: string }> = {
            open: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang mở' },
            pending_payment: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Chờ thanh toán' },
            paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đã thanh toán' },
            cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy' },
        };

        const style = styles[status] || styles.open;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                {style.label}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
        });
    };

    const filteredOrders = orders.filter(order => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                order.order_number?.toString().includes(query) ||
                order.table_name?.toLowerCase().includes(query) ||
                order.table_number?.toString().includes(query)
            );
        }
        return true;
    });

    const statusCounts = {
        all: orders.length,
        open: orders.filter(o => o.status === 'open').length,
        pending_payment: orders.filter(o => o.status === 'pending_payment').length,
        paid: orders.filter(o => o.status === 'paid').length,
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Đơn hàng</h1>
                    <p className="text-slate-500">Quản lý tất cả đơn hàng</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm theo số bàn, mã đơn..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                </div>

                {/* Status tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { value: 'all', label: 'Tất cả' },
                        { value: 'open', label: 'Đang mở' },
                        { value: 'pending_payment', label: 'Chờ TT' },
                        { value: 'paid', label: 'Đã TT' },
                    ].map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setStatusFilter(tab.value)}
                            className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${statusFilter === tab.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {tab.label}
                            <span className="ml-2 text-xs opacity-75">
                                ({statusCounts[tab.value as keyof typeof statusCounts]})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl">
                    <p className="text-slate-400">Không có đơn hàng nào</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Mã đơn</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Bàn</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Thời gian</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Tổng tiền</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Trạng thái</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(order => (
                                <tr
                                    key={order.id}
                                    className="border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <td className="px-4 py-4">
                                        <span className="font-mono font-medium text-slate-900">
                                            #{order.order_number}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="font-medium text-slate-900">
                                            {order.table_name || `Bàn ${order.table_number}`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-slate-500 text-sm">
                                        {formatDate(order.created_at)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="font-bold text-slate-900">
                                            ¥{order.total?.toLocaleString() || 0}
                                        </span>
                                        {order.discount_amount > 0 && (
                                            <span className="ml-2 text-xs text-green-600">
                                                -¥{order.discount_amount}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4">
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg">
                                            <Eye size={18} className="text-slate-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
