import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { DashboardSummary } from '../services/api';
import { socketService } from '../services/socket';
import {
    Users, UtensilsCrossed, ShoppingCart,
    DollarSign, Bell, AlertTriangle,
    ChevronRight, Loader2, Volume2, VolumeX
} from 'lucide-react';

interface Alert {
    id: string;
    type: 'discount' | 'void' | 'service_call' | 'bill_request';
    message: string;
    table_number?: number;
    amount?: number;
    time: Date;
    read: boolean;
}

export default function Dashboard() {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);

    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        loadData();
        setupSocketListeners();

        // Auto refresh every 30 seconds
        const interval = setInterval(loadData, 30000);

        return () => {
            clearInterval(interval);
            socketService.off('alert:discount', handleDiscountAlert);
            socketService.off('service:call', handleServiceCall);
        };
    }, []);

    const loadData = async () => {
        try {
            const [summaryRes] = await Promise.all([
                api.getDashboardSummary(),
            ]);

            if (summaryRes.data) {
                setSummary(summaryRes.data);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setupSocketListeners = () => {
        socketService.on('alert:discount', handleDiscountAlert);
        socketService.on('service:call', handleServiceCall);
        socketService.on('order:paid', handleOrderPaid);
    };

    const handleDiscountAlert = (data: unknown) => {
        const { discount_amount, cashier } = data as {
            order_id: string;
            discount_amount: number;
            cashier: string;
        };

        playSound();
        addAlert({
            type: 'discount',
            message: `${cashier} đã giảm giá ¥${discount_amount.toLocaleString()}`,
            amount: discount_amount,
        });
    };

    const handleServiceCall = (data: unknown) => {
        const { table_number, type, urgent } = data as {
            table_number: number;
            type: string;
            urgent?: boolean;
        };

        if (urgent) playSound();

        const messages: Record<string, string> = {
            water: 'Khách gọi nước',
            service: 'Khách gọi nhân viên',
            bill: 'Khách yêu cầu thanh toán',
        };

        addAlert({
            type: type === 'bill' ? 'bill_request' : 'service_call',
            message: messages[type] || 'Yêu cầu phục vụ',
            table_number,
        });
    };

    const handleOrderPaid = () => {
        // Refresh summary when order is paid
        loadData();
    };

    const playSound = () => {
        if (soundEnabled) {
            const audio = new Audio('/sounds/alert.mp3');
            audio.play().catch(() => { });
        }
    };

    const addAlert = (alert: Omit<Alert, 'id' | 'time' | 'read'>) => {
        setAlerts(prev => [{
            ...alert,
            id: Date.now().toString(),
            time: new Date(),
            read: false,
        }, ...prev].slice(0, 20)); // Keep last 20 alerts
    };

    const markAlertRead = (id: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === id ? { ...a, read: true } : a
        ));
    };

    const unreadCount = alerts.filter(a => !a.read).length;

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
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Tổng quan hoạt động hôm nay</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-2 rounded-lg transition ${soundEnabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'
                            }`}
                        title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                    >
                        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>

                    <div className="relative">
                        <Bell size={24} className="text-slate-600" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<DollarSign className="text-emerald-500" />}
                    label="Doanh thu hôm nay"
                    value={`¥${summary?.today.total_sales.toLocaleString() || 0}`}
                    color="emerald"
                />
                <StatCard
                    icon={<ShoppingCart className="text-blue-500" />}
                    label="Đơn hàng"
                    value={summary?.today.order_count.toString() || '0'}
                    color="blue"
                />
                <StatCard
                    icon={<Users className="text-orange-500" />}
                    label="Bàn đang dùng"
                    value={`${summary?.occupied_tables || 0}`}
                    color="orange"
                />
                <StatCard
                    icon={<UtensilsCrossed className="text-blue-600" />}
                    label="Món chờ bếp"
                    value={summary?.kitchen_queue.toString() || '0'}
                    color="blue"
                />
            </div>

            {/* Main content - 2 columns */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Sales Chart */}
                {/* Shift & Tables Status */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Current Shift Status */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-800">Ca làm việc hiện tại</h3>
                            <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                                Đang mở
                            </span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-slate-500 text-sm">Doanh thu ca</span>
                                <span className="font-bold text-slate-800">¥{(summary?.today.total_sales || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <span className="text-slate-500 text-sm">Tiền mặt hiện có</span>
                                <span className="font-bold text-slate-800">---</span>
                            </div>
                            <button className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition text-sm">
                                Quản lý ca làm việc
                            </button>
                        </div>
                    </div>

                    {/* Table Status */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
                        <h3 className="font-semibold text-slate-800 mb-4">Trạng thái bàn</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-500">Đang sử dụng</span>
                                    <span className="font-medium">{summary?.occupied_tables || 0} bàn</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(((summary?.occupied_tables || 0) / 10) * 100, 100)}%` }} // Assuming ~10 tables for visual scale
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                                    <span className="block text-emerald-600 font-bold text-lg">
                                        {15 - (summary?.occupied_tables || 0)}
                                    </span>
                                    <span className="text-xs text-emerald-600">Bàn trống</span>
                                </div>
                                <div className="p-3 bg-orange-50 rounded-xl text-center">
                                    <span className="block text-orange-600 font-bold text-lg">
                                        {summary?.occupied_tables || 0}
                                    </span>
                                    <span className="text-xs text-orange-600">Có khách</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 h-full">
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">Thông báo</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full animate-pulse">
                                {unreadCount} mới
                            </span>
                        )}
                    </div>

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {alerts.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                <Bell size={32} className="mb-2 opacity-20" />
                                <p className="text-sm">Không có thông báo mới</p>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <button
                                    key={alert.id}
                                    onClick={() => markAlertRead(alert.id)}
                                    className={`w-full p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition relative group ${!alert.read ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg shrink-0 ${alert.type === 'discount' ? 'bg-amber-100 text-amber-600' :
                                            alert.type === 'bill_request' ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                            {alert.type === 'discount' ? <AlertTriangle size={16} /> : <Bell size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {alert.table_number && (
                                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded mb-1">
                                                    Bàn {alert.table_number}
                                                </span>
                                            )}
                                            <p className="text-sm text-slate-900 font-medium truncate">{alert.message}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {formatTime(alert.time)}
                                            </p>
                                        </div>
                                        {!alert.read && (
                                            <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-2" />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickAction
                    icon="📊"
                    title="Báo cáo doanh thu"
                    description="Xem chi tiết"
                    onClick={() => { }}
                />
                <QuickAction
                    icon="🏷️"
                    title="Quản lý sản phẩm"
                    description="Thêm/Sửa/Xóa"
                    onClick={() => { }}
                />
                <QuickAction
                    icon="👥"
                    title="Nhân viên"
                    description="Quản lý tài khoản"
                    onClick={() => { }}
                />
                <QuickAction
                    icon="⚙️"
                    title="Cài đặt"
                    description="Thiết lập hệ thống"
                    onClick={() => { }}
                />
            </div>
        </div>
    );
}

// Sub-components
function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: 'emerald' | 'blue' | 'orange' | 'purple';
}) {
    const bgColors = {
        emerald: 'bg-emerald-50',
        blue: 'bg-blue-50',
        orange: 'bg-orange-50',
        purple: 'bg-blue-50',
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-12 h-12 ${bgColors[color]} rounded-xl flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
    );
}

function QuickAction({ icon, title, description, onClick }: {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="bg-white rounded-2xl shadow-sm p-5 text-left hover:shadow-md transition flex items-center gap-4 group"
        >
            <div className="text-3xl">{icon}</div>
            <div className="flex-1">
                <p className="font-medium text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
            <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-600 transition" />
        </button>
    );
}

function formatTime(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return date.toLocaleDateString('vi-VN');
}
