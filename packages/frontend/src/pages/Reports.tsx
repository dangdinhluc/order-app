import { useState, useEffect } from 'react';
import { api, type SalesPeriod } from '../services/api';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users,
    Download, Loader2, Package, CreditCard, LayoutGrid, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductSale {
    product_id: string;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
    order_count: number;
}

interface PaymentBreakdown {
    method: string;
    transaction_count: number;
    total_amount: number;
}

interface StaffPerformance {
    user_id: string;
    name: string;
    order_count: number;
    total_sales: number;
}

interface HourlyData {
    hour: number;
    order_count: number;
    total_sales: number;
}

interface TablePerformance {
    id: string;
    table_number: number;
    table_name: string;
    order_count: number;
    total_revenue: number;
    avg_order_value: number;
}

type DateRange = 'today' | 'week' | 'month' | 'custom';

export default function Reports() {
    const [dateRange, setDateRange] = useState<DateRange>('week');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'payments' | 'staff' | 'tables'>('overview');

    // Data state
    const [salesData, setSalesData] = useState<SalesPeriod[]>([]);
    const [productData, setProductData] = useState<ProductSale[]>([]);
    const [paymentData, setPaymentData] = useState<PaymentBreakdown[]>([]);
    const [staffData, setStaffData] = useState<StaffPerformance[]>([]);
    const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
    const [tablesData, setTablesData] = useState<TablePerformance[]>([]);
    const [totals, setTotals] = useState({
        gross_sales: 0,
        net_sales: 0,
        order_count: 0,
        total_discounts: 0,
    });

    useEffect(() => {
        // Set default dates based on range
        const now = new Date();
        switch (dateRange) {
            case 'today':
                setStartDate(now.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
                break;
            case 'week': {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setStartDate(weekAgo.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
                break;
            }
            case 'month': {
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                setStartDate(monthAgo.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
                break;
            }
        }
    }, [dateRange]);

    useEffect(() => {
        if (startDate && endDate) {
            loadData();
        }
    }, [startDate, endDate]);

    const loadData = async () => {
        setIsLoading(true);
        const authHeader = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

        try {
            // Load each report independently so one failure doesn't break all
            const results = await Promise.allSettled([
                api.getSalesReport(startDate, endDate),
                fetch(`${import.meta.env.VITE_API_URL}/api/reports/products?start_date=${startDate}&end_date=${endDate}`, {
                    headers: authHeader
                }).then(r => r.json()),
                fetch(`${import.meta.env.VITE_API_URL}/api/reports/payments?start_date=${startDate}&end_date=${endDate}`, {
                    headers: authHeader
                }).then(r => r.json()),
                fetch(`${import.meta.env.VITE_API_URL}/api/reports/staff?start_date=${startDate}&end_date=${endDate}`, {
                    headers: authHeader
                }).then(r => r.json()),
                fetch(`${import.meta.env.VITE_API_URL}/api/reports/hourly?date=${endDate}`, {
                    headers: authHeader
                }).then(r => r.json()),
                fetch(`${import.meta.env.VITE_API_URL}/api/reports/tables?start_date=${startDate}&end_date=${endDate}`, {
                    headers: authHeader
                }).then(r => r.json()),
            ]);

            // Process each result
            const [salesRes, productsRes, paymentsRes, staffRes, hourlyRes, tablesRes] = results;

            if (salesRes.status === 'fulfilled' && salesRes.value?.data) {
                console.log('Sales data loaded:', salesRes.value.data);
                setSalesData(salesRes.value.data.periods || []);
                setTotals(salesRes.value.data.totals || { gross_sales: 0, net_sales: 0, order_count: 0, total_discounts: 0 });
            }
            if (productsRes.status === 'fulfilled' && productsRes.value?.data) {
                setProductData(productsRes.value.data.products || []);
            }
            if (paymentsRes.status === 'fulfilled' && paymentsRes.value?.data) {
                setPaymentData(paymentsRes.value.data.breakdown || []);
            }
            if (staffRes.status === 'fulfilled' && staffRes.value?.data) {
                setStaffData(staffRes.value.data.staff || []);
            }
            if (hourlyRes.status === 'fulfilled' && hourlyRes.value?.data) {
                setHourlyData(hourlyRes.value.data.hourly || []);
            }
            if (tablesRes.status === 'fulfilled' && tablesRes.value?.data) {
                setTablesData(tablesRes.value.data.tables || []);
            }
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

    const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: TrendingUp },
        { id: 'products', label: 'Sản phẩm', icon: Package },
        { id: 'payments', label: 'Thanh toán', icon: CreditCard },
        { id: 'staff', label: 'Nhân viên', icon: Users },
        { id: 'tables', label: 'Bàn', icon: LayoutGrid },
    ] as const;

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
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Báo cáo</h1>
                    <p className="text-slate-500">Thống kê doanh thu và hoạt động</p>
                </div>

                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Range Selector */}
                        <div className="flex bg-slate-100 rounded-xl p-1 overflow-x-auto">
                            {(['today', 'week', 'month'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${dateRange === range
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-800'
                                        }`}
                                >
                                    {range === 'today' ? 'Hôm nay' : range === 'week' ? '7 ngày' : '30 ngày'}
                                </button>
                            ))}
                        </div>

                        {/* Custom Date */}
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setDateRange('custom'); setStartDate(e.target.value); }}
                                className="px-2 py-1 text-sm outline-none bg-transparent w-full"
                            />
                            <span className="text-slate-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setDateRange('custom'); setEndDate(e.target.value); }}
                                className="px-2 py-1 text-sm outline-none bg-transparent w-full"
                            />
                        </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                // Client-side Excel export using XLSX
                                const summaryData = salesData.map(day => ({
                                    'Ngày': day.period,
                                    'Số đơn': day.order_count,
                                    'Doanh thu': day.gross_sales,
                                    'Giảm giá': day.total_discounts,
                                    'Thu ròng': day.net_sales,
                                }));

                                const productExportData = productData.map((p, i) => ({
                                    'STT': i + 1,
                                    'Sản phẩm': p.product_name,
                                    'Số lượng': p.total_quantity,
                                    'Doanh thu': p.total_revenue,
                                }));

                                // Create workbook with multiple sheets
                                const wb = XLSX.utils.book_new();

                                // Summary sheet
                                const summaryWs = XLSX.utils.json_to_sheet(summaryData);
                                XLSX.utils.book_append_sheet(wb, summaryWs, 'Tổng kết');

                                // Products sheet
                                if (productExportData.length > 0) {
                                    const productsWs = XLSX.utils.json_to_sheet(productExportData);
                                    XLSX.utils.book_append_sheet(wb, productsWs, 'Sản phẩm');
                                }

                                // Generate filename
                                const filename = `bao_cao_${startDate}_${endDate}.xlsx`;

                                // Create Excel buffer and download via Blob
                                const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                                const blob = new Blob([excelBuffer], {
                                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
                                });

                                // Create download link
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.setAttribute('download', filename);
                                link.style.display = 'none';
                                document.body.appendChild(link);
                                link.click();

                                // Cleanup after delay
                                setTimeout(() => {
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(link.href);
                                }, 100);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition whitespace-nowrap"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Excel</span>
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const url = `${import.meta.env.VITE_API_URL}/api/export/sales?start_date=${startDate}&end_date=${endDate}&format=pdf`;
                                    const token = localStorage.getItem('token');
                                    const res = await fetch(url, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });

                                    if (!res.ok) throw new Error('Export failed');

                                    const blob = await res.blob();
                                    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                                    const link = document.createElement('a');
                                    link.href = URL.createObjectURL(pdfBlob);
                                    link.setAttribute('download', `bao_cao_${startDate}_${endDate}.pdf`);
                                    link.style.display = 'none';
                                    document.body.appendChild(link);
                                    link.click();

                                    // Cleanup after delay
                                    setTimeout(() => {
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(link.href);
                                    }, 100);
                                } catch (error) {
                                    console.error('Export error:', error);
                                    alert('Lỗi xuất file PDF. Vui lòng thử lại.');
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition whitespace-nowrap"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={<DollarSign className="text-emerald-600" />}
                    label="Doanh thu"
                    value={formatCurrency(totals.net_sales || 0)}
                    trend={12}
                    bgColor="bg-emerald-50"
                />
                <SummaryCard
                    icon={<ShoppingCart className="text-blue-600" />}
                    label="Đơn hàng"
                    value={totals.order_count?.toString() || '0'}
                    trend={8}
                    bgColor="bg-blue-50"
                />
                <SummaryCard
                    icon={<DollarSign className="text-orange-600" />}
                    label="Trung bình/đơn"
                    value={formatCurrency(totals.order_count > 0 ? Math.round(totals.net_sales / totals.order_count) : 0)}
                    trend={-2}
                    bgColor="bg-orange-50"
                />
                <SummaryCard
                    icon={<DollarSign className="text-red-600" />}
                    label="Giảm giá"
                    value={formatCurrency(totals.total_discounts || 0)}
                    trend={0}
                    bgColor="bg-red-50"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 -mb-px ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
                {activeTab === 'overview' && (
                    <OverviewTab salesData={salesData} hourlyData={hourlyData} formatCurrency={formatCurrency} />
                )}
                {activeTab === 'products' && (
                    <ProductsTab products={productData} formatCurrency={formatCurrency} />
                )}
                {activeTab === 'payments' && (
                    <PaymentsTab payments={paymentData} formatCurrency={formatCurrency} />
                )}
                {activeTab === 'staff' && (
                    <StaffTab staff={staffData} formatCurrency={formatCurrency} />
                )}
                {activeTab === 'tables' && (
                    <TablesTab tables={tablesData} formatCurrency={formatCurrency} />
                )}
            </div>
        </div>
    );
}

// Summary Card Component
function SummaryCard({ icon, label, value, trend, bgColor }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend: number;
    bgColor: string;
}) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <p className="text-sm text-slate-500">{label}</p>
            <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                {trend !== 0 && (
                    <span className={`flex items-center text-sm ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </div>
    );
}

// Overview Tab
function OverviewTab({ salesData, hourlyData, formatCurrency }: {
    salesData: SalesPeriod[];
    hourlyData: HourlyData[];
    formatCurrency: (n: number) => string;
}) {
    const maxSales = Math.max(...salesData.map(d => parseFloat(d.net_sales || '0')), 1);
    const maxHourlySales = Math.max(...hourlyData.map(h => Number(h.total_sales) || 0), 1);

    return (
        <div className="p-6 space-y-8">
            {/* Daily Bar Chart */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4">Doanh thu theo ngày</h3>
                <div className="h-64 flex items-end justify-between gap-2">
                    {salesData.map((day, idx) => {
                        const value = parseFloat(day.net_sales || '0');
                        const height = (value / maxSales) * 100;

                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 min-w-[40px]">
                                <div className="text-xs text-slate-500 font-medium">
                                    {formatCurrency(value)}
                                </div>
                                <div
                                    className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600 shadow-sm"
                                    style={{ height: `${Math.max(height, 8)}%`, minHeight: '8px' }}
                                />
                                <span className="text-xs text-slate-500">
                                    {day.period.split('-').slice(1).join('/')}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {salesData.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        Không có dữ liệu trong khoảng thời gian này
                    </div>
                )}
            </div>

            {/* Hourly Heatmap */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Clock size={18} /> Phân tích theo giờ (Peak Hours)
                </h3>
                {hourlyData.length > 0 ? (
                    <div className="grid grid-cols-12 gap-1">
                        {Array.from({ length: 24 }, (_, hour) => {
                            const data = hourlyData.find(h => Number(h.hour) === hour);
                            const sales = data ? Number(data.total_sales) : 0;
                            const intensity = maxHourlySales > 0 ? sales / maxHourlySales : 0;

                            // Color from green (low) to yellow (mid) to red (peak)
                            let bgColor = 'bg-slate-100';
                            if (sales > 0) {
                                if (intensity > 0.7) bgColor = 'bg-red-500';
                                else if (intensity > 0.4) bgColor = 'bg-orange-400';
                                else if (intensity > 0.2) bgColor = 'bg-yellow-400';
                                else bgColor = 'bg-green-300';
                            }

                            return (
                                <div key={hour} className="text-center group relative">
                                    <div
                                        className={`h-10 rounded ${bgColor} transition-all hover:ring-2 hover:ring-blue-500`}
                                        title={`${hour}:00 - ¥${sales.toLocaleString()}`}
                                    />
                                    <span className="text-[10px] text-slate-500">{hour}h</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        Chưa có dữ liệu theo giờ
                    </div>
                )}
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-300" /> Thấp</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400" /> Vừa</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-orange-400" /> Cao</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> Peak</div>
                </div>
            </div>
        </div>
    );
}

// Products Tab
function ProductsTab({ products, formatCurrency }: {
    products: ProductSale[];
    formatCurrency: (n: number) => string;
}) {
    return (
        <div className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Sản phẩm bán chạy</h3>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">#</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Sản phẩm</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Số lượng</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Doanh thu</th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Đơn hàng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((product, idx) => (
                            <tr key={product.product_id} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                                <td className="py-3 px-4 font-medium text-slate-800">{product.product_name}</td>
                                <td className="py-3 px-4 text-right text-slate-600">{product.total_quantity}</td>
                                <td className="py-3 px-4 text-right font-medium text-emerald-600">
                                    {formatCurrency(product.total_revenue)}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-600">{product.order_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {products.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        Không có dữ liệu
                    </div>
                )}
            </div>
        </div>
    );
}

// Payments Tab
function PaymentsTab({ payments, formatCurrency }: {
    payments: PaymentBreakdown[];
    formatCurrency: (n: number) => string;
}) {
    const total = payments.reduce((sum, p) => sum + p.total_amount, 0);
    const methodLabels: Record<string, string> = {
        cash: '💵 Tiền mặt',
        card: '💳 Thẻ',
        paypay: 'PayPay',
        linepay: 'LINE Pay',
        other: 'Khác',
    };

    return (
        <div className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Phương thức thanh toán</h3>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    {payments.map(payment => {
                        const percentage = total > 0 ? (payment.total_amount / total) * 100 : 0;
                        return (
                            <div key={payment.method} className="bg-slate-50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-slate-700">
                                        {methodLabels[payment.method] || payment.method}
                                    </span>
                                    <span className="font-bold text-slate-800">
                                        {formatCurrency(payment.total_amount)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 rounded-full h-2 transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {payment.transaction_count} giao dịch • {percentage.toFixed(1)}%
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Donut Chart */}
                <div className="flex items-center justify-center bg-slate-50 rounded-xl p-6">
                    <DonutChart payments={payments} total={total} methodLabels={methodLabels} />
                </div>
            </div>
        </div>
    );
}

// Staff Tab
function StaffTab({ staff, formatCurrency }: {
    staff: StaffPerformance[];
    formatCurrency: (n: number) => string;
}) {
    return (
        <div className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Hiệu suất nhân viên</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map((member, idx) => (
                    <div key={member.user_id} className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                {member.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <p className="font-medium text-slate-800">{member.name}</p>
                                <p className="text-xs text-slate-500">#{idx + 1}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <p className="text-2xl font-bold text-slate-800">{member.order_count}</p>
                                <p className="text-xs text-slate-500">Đơn hàng</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(member.total_sales)}</p>
                                <p className="text-xs text-slate-500">Doanh thu</p>
                            </div>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        Không có dữ liệu
                    </div>
                )}
            </div>
        </div>
    );
}

// Donut Chart using CSS conic-gradient
function DonutChart({ payments, total, methodLabels }: {
    payments: PaymentBreakdown[];
    total: number;
    methodLabels: Record<string, string>;
}) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Build conic-gradient stops
    let currentAngle = 0;
    const gradientStops = payments.map((p, idx) => {
        const percentage = total > 0 ? (p.total_amount / total) * 100 : 0;
        const startAngle = currentAngle;
        currentAngle += percentage * 3.6; // 360 / 100 = 3.6
        return `${colors[idx % colors.length]} ${startAngle}deg ${currentAngle}deg`;
    }).join(', ');

    if (payments.length === 0) {
        return (
            <div className="text-center text-slate-400">
                <CreditCard size={48} className="mx-auto mb-2 opacity-50" />
                <p>Không có dữ liệu</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Donut */}
            <div
                className="w-40 h-40 rounded-full relative"
                style={{
                    background: `conic-gradient(${gradientStops})`,
                }}
            >
                {/* Center hole */}
                <div className="absolute inset-4 bg-slate-50 rounded-full flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-xs text-slate-500">Tổng</p>
                        <p className="text-sm font-bold text-slate-800">{payments.length} PT</p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3">
                {payments.map((p, idx) => (
                    <div key={p.method} className="flex items-center gap-1.5">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors[idx % colors.length] }}
                        />
                        <span className="text-xs text-slate-600">
                            {methodLabels[p.method] || p.method}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Tables Tab
function TablesTab({ tables, formatCurrency }: {
    tables: TablePerformance[];
    formatCurrency: (n: number) => string;
}) {
    return (
        <div className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Hiệu suất bàn</h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tables.map((table, idx) => (
                    <div key={table.id} className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                    {table.table_number}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800">{table.table_name || `Bàn ${table.table_number}`}</p>
                                    <p className="text-xs text-slate-500">#{idx + 1} ranking</p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-lg font-bold text-emerald-600">{formatCurrency(Number(table.total_revenue) || 0)}</p>
                                <p className="text-[10px] text-slate-500">Doanh thu</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-blue-600">{table.order_count || 0}</p>
                                <p className="text-[10px] text-slate-500">Đơn hàng</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-700">{formatCurrency(Number(table.avg_order_value) || 0)}</p>
                                <p className="text-[10px] text-slate-500">TB/Đơn</p>
                            </div>
                        </div>
                    </div>
                ))}

                {tables.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        Không có dữ liệu
                    </div>
                )}
            </div>
        </div>
    );
}
