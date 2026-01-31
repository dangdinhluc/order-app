import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import type { Order } from '../services/api';
import {
    Package, Store, UtensilsCrossed, Clock, Loader2,
    Search, RotateCcw, Trash2, X, Lock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface OrderListPanelProps {
    onSelectOrder: (orderId: string, orderType: 'dine_in' | 'takeaway' | 'retail') => void;
}

type StatusFilter = 'open' | 'paid' | 'cancelled';
type TypeFilter = 'all' | 'dine_in' | 'takeaway' | 'retail';
type SortBy = 'newest' | 'oldest';

export default function OrderListPanel({ onSelectOrder }: OrderListPanelProps) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('newest');

    // Stats from API
    const [stats, setStats] = useState({ open: 0, paid: 0, cancelled: 0 });

    // Cancel order modal
    const [cancelModal, setCancelModal] = useState<{ orderId: string; orderNumber: string } | null>(null);
    const [cancelPin, setCancelPin] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // PIN verification for paid orders
    const [pinModal, setPinModal] = useState<{ orderId: string; orderType: 'dine_in' | 'takeaway' | 'retail'; orderNumber: string } | null>(null);
    const [accessPin, setAccessPin] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Delete empty order confirmation
    const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);

    useEffect(() => {
        loadOrders();
        loadStats();
        const interval = setInterval(() => {
            loadOrders();
            loadStats();
        }, 30000);
        return () => clearInterval(interval);
    }, [statusFilter]);

    const loadOrders = async () => {
        try {
            setIsLoading(true);
            const response = await api.getOrders({ status: statusFilter });
            if (response.data) {
                setOrders(response.data.orders);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await api.getOrderStats();
            if (response.data) {
                setStats({
                    open: response.data.open,
                    paid: response.data.paid,
                    cancelled: response.data.cancelled
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleCancelOrder = async () => {
        if (!cancelModal || !cancelPin) return;

        setIsCancelling(true);
        try {
            await api.cancelOrder(cancelModal.orderId, cancelPin, cancelReason || undefined);
            setCancelModal(null);
            setCancelPin('');
            setCancelReason('');
            loadOrders();
            loadStats();
        } catch (error: any) {
            alert(error.message || 'Không thể hủy đơn hàng');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleDeleteEmptyOrder = async (orderId: string) => {
        setDeleteOrderId(orderId);
    };

    const confirmDeleteEmptyOrder = async () => {
        if (!deleteOrderId) return;
        try {
            await api.deleteEmptyOrder(deleteOrderId);
            loadOrders();
            loadStats();
        } catch (error: any) {
            alert(error.message || 'Không thể xóa đơn hàng');
        } finally {
            setDeleteOrderId(null);
        }
    };

    // Handle order click - always allow viewing (PIN check moved to edit actions)
    const handleOrderClick = (order: Order) => {
        onSelectOrder(order.id, (order.order_type || 'dine_in') as 'dine_in' | 'takeaway' | 'retail');
    };

    // Verify PIN and grant access
    const handleVerifyPin = async () => {
        if (!pinModal || !accessPin) return;

        setIsVerifying(true);
        try {
            // Use the same PIN verification as cancel order
            const response = await api.verifyPin(accessPin);
            if (response.data?.verified) {
                onSelectOrder(pinModal.orderId, pinModal.orderType);
                setPinModal(null);
                setAccessPin('');
            } else {
                alert('PIN không đúng');
            }
        } catch (error: any) {
            alert(error.message || 'PIN không đúng');
        } finally {
            setIsVerifying(false);
        }
    };

    // Filter and search logic
    const filteredOrders = useMemo(() => {
        let result = orders;

        if (typeFilter !== 'all') {
            result = result.filter(o => o.order_type === typeFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(o =>
                (o.order_number?.toString() || '').includes(query) ||
                (o.id.slice(0, 8)).includes(query)
            );
        }

        result = [...result].sort((a, b) => {
            if (sortBy === 'oldest') {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return result;
    }, [orders, typeFilter, searchQuery, sortBy]);

    // Count by type
    const typeCounts = useMemo(() => ({
        all: orders.length,
        dine_in: orders.filter(o => o.order_type === 'dine_in').length,
        takeaway: orders.filter(o => o.order_type === 'takeaway').length,
        retail: orders.filter(o => o.order_type === 'retail').length,
    }), [orders]);

    const getOrderTypeStyle = (type: string) => {
        switch (type) {
            case 'takeaway':
                return {
                    border: 'border-l-orange-500',
                    bg: 'bg-orange-50',
                    iconBg: 'bg-orange-100',
                    iconColor: 'text-orange-600',
                    icon: Package,
                    label: 'Mang về'
                };
            case 'retail':
                return {
                    border: 'border-l-emerald-500',
                    bg: 'bg-emerald-50',
                    iconBg: 'bg-emerald-100',
                    iconColor: 'text-emerald-600',
                    icon: Store,
                    label: 'Tạp hóa'
                };
            default:
                return {
                    border: 'border-l-blue-500',
                    bg: 'bg-blue-50',
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600',
                    icon: UtensilsCrossed,
                    label: 'Tại bàn'
                };
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'paid':
                return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Đã thanh toán', icon: CheckCircle };
            case 'cancelled':
                return { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy', icon: XCircle };
            default:
                return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Đang mở', icon: AlertCircle };
        }
    };

    const getTimeSince = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diff = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
        if (diff < 1) return 'Vừa tạo';
        if (diff < 60) return `${diff} phút`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ${diff % 60}p`;
        return `${Math.floor(diff / 1440)} ngày`;
    };

    if (isLoading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white px-3 sm:px-4 py-3 sm:py-4 border-b border-slate-200">
                {/* Title + Stats Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-800">Quản lý đơn hàng</h2>
                        <button
                            onClick={loadOrders}
                            disabled={isLoading}
                            className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition"
                        >
                            <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {/* Status Filter Badges (clickable) */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setStatusFilter('open')}
                            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition ${statusFilter === 'open'
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                }`}
                        >
                            <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${statusFilter === 'open' ? 'bg-white animate-pulse' : 'bg-amber-500'}`}></span>
                            <span className="hidden sm:inline">Đang mở:</span> {stats.open}
                        </button>
                        <button
                            onClick={() => setStatusFilter('paid')}
                            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition ${statusFilter === 'paid'
                                ? 'bg-emerald-500 text-white shadow-lg'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                }`}
                        >
                            <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${statusFilter === 'paid' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                            <span className="hidden sm:inline">Đã TT:</span> {stats.paid}
                        </button>
                        <button
                            onClick={() => setStatusFilter('cancelled')}
                            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition ${statusFilter === 'cancelled'
                                ? 'bg-red-500 text-white shadow-lg'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                        >
                            <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${statusFilter === 'cancelled' ? 'bg-white' : 'bg-red-500'}`}></span>
                            <span className="hidden sm:inline">Đã hủy:</span> {stats.cancelled}
                        </button>
                    </div>
                </div>

                {/* Search + Sort Row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm đơn hàng..."
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-slate-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="px-3 sm:px-4 py-2 bg-slate-100 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="newest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                    </select>
                </div>

                {/* Type Filter Tabs */}
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
                    {[
                        { id: 'all' as TypeFilter, label: 'Tất cả', count: typeCounts.all },
                        { id: 'dine_in' as TypeFilter, label: 'Tại bàn', count: typeCounts.dine_in, color: 'blue' },
                        { id: 'takeaway' as TypeFilter, label: 'Mang về', count: typeCounts.takeaway, color: 'orange' },
                        { id: 'retail' as TypeFilter, label: 'Tạp hóa', count: typeCounts.retail, color: 'emerald' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTypeFilter(tab.id)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${typeFilter === tab.id
                                ? tab.color === 'blue' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : tab.color === 'orange' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                                        : tab.color === 'emerald' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                            : 'bg-slate-800 text-white shadow-lg'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Grid */}
            <div className="flex-1 overflow-auto p-3 sm:p-4">
                {filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Package size={48} className="mb-3 sm:mb-4 text-slate-300" />
                        <p className="text-base sm:text-lg font-medium">Không có đơn hàng</p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-2 text-sm text-blue-600 hover:underline"
                            >
                                Xóa tìm kiếm
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {filteredOrders.map(order => {
                            const style = getOrderTypeStyle(order.order_type || 'dine_in');
                            const statusStyle = getStatusStyle(order.status || 'open');
                            const TypeIcon = style.icon;
                            const StatusIcon = statusStyle.icon;
                            const isEmpty = Number(order.total) === 0;
                            const isOpen = order.status === 'open';

                            return (
                                <div
                                    key={order.id}
                                    onClick={() => handleOrderClick(order)}
                                    className={`bg-white rounded-xl sm:rounded-2xl border-l-4 ${style.border} shadow-sm hover:shadow-lg active:scale-[0.98] sm:hover:scale-[1.02] cursor-pointer transition-all p-3 sm:p-4 relative ${!isOpen ? 'opacity-90' : ''
                                        }`}
                                >
                                    {/* Lock icon for non-open orders */}
                                    {!isOpen && (
                                        <div className="absolute top-2 right-2">
                                            <Lock size={14} className="text-slate-400" />
                                        </div>
                                    )}

                                    {/* Order Number + Type (compact on mobile) */}
                                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                                        <div className="text-xl sm:text-2xl font-bold text-slate-800">
                                            #{order.order_number || order.id.slice(0, 6)}
                                        </div>
                                        <span className={`ml-auto px-1.5 sm:px-2 py-0.5 ${statusStyle.bg} ${statusStyle.text} text-[10px] sm:text-xs font-medium rounded-full flex items-center gap-0.5 sm:gap-1`}>
                                            <StatusIcon size={10} className="sm:w-3 sm:h-3" />
                                            <span className="hidden sm:inline">{statusStyle.label}</span>
                                        </span>
                                    </div>

                                    {/* Type Badge */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg ${style.iconBg} flex items-center justify-center`}>
                                            <TypeIcon size={14} className={`sm:w-4 sm:h-4 ${style.iconColor}`} />
                                        </div>
                                        <span className="text-xs sm:text-sm text-slate-600">{style.label}</span>
                                        <span className="text-xs text-slate-400 ml-auto flex items-center gap-1">
                                            <Clock size={12} />
                                            {getTimeSince(order.created_at)}
                                        </span>
                                    </div>

                                    {/* Footer: Actions + Total */}
                                    <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-slate-100">
                                        <div className="flex gap-0.5 sm:gap-1">
                                            {isOpen && isEmpty && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteEmptyOrder(order.id);
                                                    }}
                                                    className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                                                    title="Xóa đơn trống"
                                                >
                                                    <X size={14} className="sm:w-4 sm:h-4" />
                                                </button>
                                            )}
                                            {isOpen && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCancelModal({ orderId: order.id, orderNumber: order.order_number?.toString() || order.id.slice(0, 6) });
                                                    }}
                                                    className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition"
                                                    title="Hủy đơn hàng"
                                                >
                                                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <span className={`text-lg sm:text-xl font-bold ${order.status === 'paid' ? 'text-emerald-600'
                                            : order.status === 'cancelled' ? 'text-red-400 line-through'
                                                : isEmpty ? 'text-slate-400' : 'text-blue-600'
                                            }`}>
                                            ¥{Math.round(Number(order.total)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cancel Order Modal */}
            {cancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Hủy đơn #{cancelModal.orderNumber}</h3>
                            <button
                                onClick={() => setCancelModal(null)}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Lý do hủy (tùy chọn)</label>
                                <input
                                    type="text"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="VD: Khách đổi ý, hết hàng..."
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">Nhập PIN để xác nhận *</label>
                                <input
                                    type="password"
                                    value={cancelPin}
                                    onChange={(e) => setCancelPin(e.target.value)}
                                    placeholder="Nhập PIN 6 số"
                                    maxLength={6}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setCancelModal(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                            >
                                Không hủy
                            </button>
                            <button
                                onClick={handleCancelOrder}
                                disabled={!cancelPin || cancelPin.length !== 6 || isCancelling}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PIN Verification Modal for Paid/Cancelled Orders */}
            {pinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Lock size={20} className="text-amber-500" />
                                Xác thực để xem đơn #{pinModal.orderNumber}
                            </h3>
                            <button
                                onClick={() => { setPinModal(null); setAccessPin(''); }}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 mb-4">
                            Đơn hàng đã hoàn thành. Nhập PIN quản lý để xem chi tiết.
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Nhập PIN quản lý *</label>
                            <input
                                type="password"
                                value={accessPin}
                                onChange={(e) => setAccessPin(e.target.value)}
                                placeholder="Nhập PIN 6 số"
                                maxLength={6}
                                autoFocus
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && accessPin.length === 6) {
                                        handleVerifyPin();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setPinModal(null); setAccessPin(''); }}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleVerifyPin}
                                disabled={accessPin.length !== 6 || isVerifying}
                                className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isVerifying ? 'Đang xác thực...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Empty Order Confirmation */}
            <ConfirmModal
                isOpen={!!deleteOrderId}
                title="Xóa đơn hàng"
                message="Xóa đơn hàng trống này?"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDeleteEmptyOrder}
                onCancel={() => setDeleteOrderId(null)}
            />
        </div>
    );
}
