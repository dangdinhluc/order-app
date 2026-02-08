import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useToast } from '../../components/Toast';
import {
    TrendingUp, TrendingDown, Calendar, DollarSign, ShoppingCart,
    Users, Package, CreditCard, Loader2, RefreshCw
} from 'lucide-react';

type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface RevenueData {
    date: string;
    revenue: number;
    orders: number;
}

interface ProductData {
    name: string;
    quantity: number;
    revenue: number;
}

interface PaymentData {
    method: string;
    amount: number;
    count: number;
}

interface HourlyData {
    hour: string;
    orders: number;
    revenue: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function AnalyticsDashboard() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>('week');
    const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
    const [topProducts, setTopProducts] = useState<ProductData[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentData[]>([]);
    const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        newCustomers: 0,
        revenueChange: 0,
        ordersChange: 0
    });

    const getDateRange = (range: DateRange): { start: Date; end: Date } => {
        const now = new Date();
        switch (range) {
            case 'today':
                return { start: startOfDay(now), end: endOfDay(now) };
            case 'yesterday':
                const yesterday = subDays(now, 1);
                return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
            case 'week':
                return { start: startOfWeek(now, { locale: vi }), end: endOfWeek(now, { locale: vi }) };
            case 'month':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            default:
                return { start: subDays(now, 7), end: now };
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        setIsLoading(true);
        const { start, end } = getDateRange(dateRange);
        const startDate = format(start, 'yyyy-MM-dd');
        const endDate = format(end, 'yyyy-MM-dd');

        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');

            // Fetch reports data
            const res = await fetch(
                `${baseUrl}/api/reports/summary?start_date=${startDate}&end_date=${endDate}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await res.json();

            if (data.success && data.data) {
                // Process summary
                const summary = data.data.summary || {};
                const previousSummary = data.data.previous_summary || {};

                const revenue = Number(summary.total_revenue || 0);
                const orders = Number(summary.total_orders || 0);
                const prevRevenue = Number(previousSummary.total_revenue || 0);
                const prevOrders = Number(previousSummary.total_orders || 0);

                setSummary({
                    totalRevenue: revenue,
                    totalOrders: orders,
                    avgOrderValue: orders > 0 ? revenue / orders : 0,
                    newCustomers: Number(summary.new_customers || 0),
                    revenueChange: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
                    ordersChange: prevOrders > 0 ? ((orders - prevOrders) / prevOrders) * 100 : 0
                });

                // Generate revenue chart data
                const days = eachDayOfInterval({ start, end });
                const dailyData = data.data.daily || [];
                const revData = days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const dayData = dailyData.find((d: any) => d.date === dateStr) || {};
                    return {
                        date: format(day, 'dd/MM'),
                        revenue: Number(dayData.revenue || 0),
                        orders: Number(dayData.orders || 0)
                    };
                });
                setRevenueData(revData);

                // Top products
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                setTopProducts((data.data.top_products || []).slice(0, 8).map((p: any) => ({
                    name: p.name?.substring(0, 20) || 'N/A',
                    quantity: Number(p.quantity || 0),
                    revenue: Number(p.revenue || 0)
                })));

                // Payment methods
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                setPaymentMethods((data.data.payment_methods || []).map((pm: any) => ({
                    method: pm.method || 'Khác',
                    amount: Number(pm.amount || 0),
                    count: Number(pm.count || 0)
                })));

                // Hourly breakdown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                setHourlyData((data.data.hourly || []).map((h: any) => ({
                    hour: `${h.hour}:00`,
                    orders: Number(h.orders || 0),
                    revenue: Number(h.revenue || 0)
                })));
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            toast.error('Lỗi', 'Không thể tải dữ liệu phân tích');
        }
        setIsLoading(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-slate-50 min-h-screen">
            {/* Header - Mobile Optimized */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp className="text-blue-500 flex-shrink-0" size={22} />
                            <span className="truncate">Phân tích doanh thu</span>
                        </h1>
                        <p className="text-slate-500 text-xs md:text-sm mt-1 hidden sm:block">Thống kê chi tiết hoạt động kinh doanh</p>
                    </div>
                    <button
                        onClick={loadAnalytics}
                        className="p-2.5 bg-white hover:bg-slate-100 rounded-xl transition border shadow-sm flex-shrink-0"
                    >
                        <RefreshCw size={18} className="text-slate-500" />
                    </button>
                </div>

                {/* Date Range Picker - Scrollable on Mobile */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    {(['today', 'yesterday', 'week', 'month'] as DateRange[]).map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-3 md:px-4 py-2 text-sm font-medium rounded-xl transition whitespace-nowrap border ${dateRange === range
                                ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {range === 'today' && 'Hôm nay'}
                            {range === 'yesterday' && 'Hôm qua'}
                            {range === 'week' && 'Tuần này'}
                            {range === 'month' && 'Tháng này'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards - 2x2 grid on mobile */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                <SummaryCard
                    icon={<DollarSign className="text-green-500" />}
                    label="Doanh thu"
                    value={formatCurrency(summary.totalRevenue)}
                    change={summary.revenueChange}
                    color="green"
                />
                <SummaryCard
                    icon={<ShoppingCart className="text-blue-500" />}
                    label="Số đơn hàng"
                    value={formatNumber(summary.totalOrders)}
                    change={summary.ordersChange}
                    color="blue"
                />
                <SummaryCard
                    icon={<CreditCard className="text-purple-500" />}
                    label="Giá trị TB/đơn"
                    value={formatCurrency(summary.avgOrderValue)}
                    color="purple"
                />
                <SummaryCard
                    icon={<Users className="text-orange-500" />}
                    label="Khách mới"
                    value={formatNumber(summary.newCustomers)}
                    color="orange"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Revenue Trend */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border">
                    <h3 className="font-semibold text-slate-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                        <TrendingUp size={16} className="text-blue-500" />
                        Xu hướng doanh thu
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload[0]) {
                                        return (
                                            <div className="bg-white p-2 border rounded-xl shadow">
                                                <p>{formatCurrency(payload[0].value as number)}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Orders by Hour */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border">
                    <h3 className="font-semibold text-slate-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                        <Calendar size={16} className="text-orange-500" />
                        Đơn hàng theo giờ
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload[0]) {
                                        return (
                                            <div className="bg-white p-2 border rounded-xl shadow">
                                                <p>{payload[0].value} đơn</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="orders" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Top Products */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-6 shadow-sm border">
                    <h3 className="font-semibold text-slate-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                        <Package size={16} className="text-green-500" />
                        Top sản phẩm bán chạy
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topProducts} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#94A3B8" width={100} />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload[0]) {
                                        return (
                                            <div className="bg-white p-2 border rounded-xl shadow">
                                                <p>{payload[0].value} sản phẩm</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Bar dataKey="quantity" fill="#10B981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Methods */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border">
                    <h3 className="font-semibold text-slate-800 mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                        <CreditCard size={16} className="text-purple-500" />
                        Phương thức thanh toán
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={paymentMethods}
                                dataKey="amount"
                                nameKey="method"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                innerRadius={40}
                                paddingAngle={2}
                                label={false}
                            >
                                {paymentMethods.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload[0]) {
                                        return (
                                            <div className="bg-white p-2 border rounded-xl shadow">
                                                <p>{formatCurrency(payload[0].value as number)}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

// Summary Card Component
function SummaryCard({ icon, label, value, change, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    change?: number;
    color: 'green' | 'blue' | 'purple' | 'orange';
}) {
    const colors = {
        green: 'bg-green-50 border-green-100',
        blue: 'bg-blue-50 border-blue-100',
        purple: 'bg-purple-50 border-purple-100',
        orange: 'bg-orange-50 border-orange-100'
    };

    return (
        <div className={`p-3 md:p-5 rounded-xl md:rounded-2xl border ${colors[color]} transition hover:shadow-md`}>
            <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="p-1.5 md:p-2 bg-white rounded-lg md:rounded-xl shadow-sm">
                    {icon}
                </div>
                {change !== undefined && change !== 0 && (
                    <div className={`flex items-center gap-0.5 text-[10px] md:text-xs font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(change).toFixed(1)}%
                    </div>
                )}
            </div>
            <div className="text-base md:text-2xl font-bold text-slate-800 truncate">{value}</div>
            <div className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1">{label}</div>
        </div>
    );
}
