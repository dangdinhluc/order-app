import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Order } from '../services/api';
import { printReceipt, type ReceiptSettings } from '../utils/printReceipt';
import {
    Search,
    Calendar,
    Filter,
    Download,
    Printer,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Banknote,
    Smartphone
} from 'lucide-react';

export default function InvoiceHistory() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [paymentMethods, setPaymentMethods] = useState<any[]>([]); // Should type properly if available
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [orderDetails, setOrderDetails] = useState<Record<string, any>>({});

    useEffect(() => {
        loadData();
    }, [dateRange, selectedPaymentMethod]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [historyRes, methodsRes] = await Promise.all([
                api.getOrderHistory({
                    start_date: dateRange.start,
                    end_date: dateRange.end,
                    payment_method: selectedPaymentMethod
                }),
                api.getPaymentMethods()
            ]);

            if (historyRes.data) {
                setOrders(historyRes.data.orders);
            }
            if (methodsRes.data) {
                setPaymentMethods(methodsRes.data.payment_methods);
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = async (orderId: string) => {
        if (expandedOrderId === orderId) {
            setExpandedOrderId(null);
            return;
        }

        setExpandedOrderId(orderId);

        if (!orderDetails[orderId]) {
            try {
                const res = await api.getOrder(orderId);
                if (res.data?.order) {
                    setOrderDetails(prev => ({
                        ...prev,
                        [orderId]: res.data!.order
                    }));
                }
            } catch (err) {
                console.error('Failed to load order details', err);
            }
        }
    };

    const handlePrint = async (orderId: string) => {
        try {
            // Ensure we have order details
            let orderData = orderDetails[orderId];
            if (!orderData) {
                const res = await api.getOrder(orderId);
                if (res.data?.order) {
                    orderData = res.data.order;
                    setOrderDetails(prev => ({ ...prev, [orderId]: orderData }));
                }
            }
            if (!orderData || !orderData.items) {
                alert('Không thể tải chi tiết đơn hàng để in');
                return;
            }

            // Get settings
            const settingsRes = await api.getSettings();
            const settings = settingsRes.data?.settings || {};

            const storeSettings = {
                store_name: settings.store_name || 'Store',
                store_name_ja: settings.store_name_ja || '',
                address: settings.address || '',
                phone: settings.phone || '',
                tax_rate: settings.tax_rate || 10,
                currency: settings.currency || 'JPY'
            };

            const receiptSettings: ReceiptSettings = {
                template: 'modern',
                languages: ['vi', 'ja'],
                logo_url: settings.logo_url || '',
                header_text_vi: settings.header_text_vi || settings.header_text || '',
                header_text_ja: settings.header_text_ja || '',
                footer_text_vi: settings.footer_text_vi || settings.footer_text || 'Cảm ơn quý khách!',
                footer_text_ja: settings.footer_text_ja || 'ありがとうございます!',
                show_table_time: settings.show_table_time ?? true,
                show_order_number: settings.show_order_number ?? true,
                show_time_seated: true,
                show_staff_name: true,
                show_qr_code: true,
                font_size: (settings.font_size || 'medium') as 'small' | 'medium' | 'large'
            };

            const printerSettings = {
                printer_type: 'browser' as const,
                paper_width: (settings.paper_width || '80mm') as '58mm' | '80mm'
            };

            printReceipt({
                order: {
                    id: orderData.id,
                    order_number: orderData.order_number?.toString(),
                    table_number: orderData.table_number,
                    table_name: orderData.table_name,
                    subtotal: Number(orderData.subtotal) || Number(orderData.total) || 0,
                    discount_amount: Number(orderData.discount_amount) || 0,
                    discount_reason: orderData.discount_reason,
                    surcharge_amount: Number(orderData.surcharge_amount) || 0,
                    total: Number(orderData.total) || 0,
                    created_at: orderData.created_at,
                    paid_at: orderData.paid_at,
                    cashier_name: orderData.cashier_name
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: orderData.items.map((item: any) => ({
                    id: item.id,
                    product_id: item.product_id,
                    product_name_vi: item.product_name_vi,
                    product_name_ja: item.product_name_ja,
                    open_item_name: item.open_item_name,
                    quantity: item.quantity,
                    unit_price: Number(item.unit_price),
                    note: item.note
                })),
                storeSettings,
                receiptSettings,
                printerSettings
            });
        } catch (err) {
            console.error('Print error:', err);
            alert('Lỗi khi in hóa đơn');
        }
    };

    const getPaymentIcon = (methodCode: string) => {
        switch (methodCode) {
            case 'cash': return <Banknote size={16} className="text-emerald-600" />;
            case 'card': return <CreditCard size={16} className="text-blue-600" />;
            case 'paypay':
            case 'linepay': return <Smartphone size={16} className="text-purple-600" />;
            default: return <CreditCard size={16} className="text-slate-400" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Lịch sử hóa đơn</h1>
                    <p className="text-slate-500">Xem và quản lý các hóa đơn đã thanh toán</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download size={20} />
                        Xuất Excel
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end md:items-center">
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Date Range */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Từ ngày</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Đến ngày</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Phương thức thanh toán</label>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <select
                                value={selectedPaymentMethod}
                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                            >
                                <option value="all">Tất cả</option>
                                {paymentMethods.map(method => (
                                    <option key={method.id} value={method.code}>{method.name_vi}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Mã đơn, tên khách..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Mã đơn</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Thời gian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bàn / Khách</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Thanh toán</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500"></div>
                                        Đang tải dữ liệu...
                                    </div>
                                </td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    Không tìm thấy hóa đơn nào trong khoảng thời gian này
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => {
                                const isExpanded = expandedOrderId === order.id;
                                return (
                                    <React.Fragment key={order.id}>
                                        <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => toggleExpand(order.id)}
                                                    className="flex items-center gap-2 font-mono font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    #{order.order_number}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {new Date(order.created_at).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">{order.table_name || `Bàn ${order.table_number}`}</div>
                                                <div className="text-xs text-slate-500">{order.cashier_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-bold text-slate-900">¥{Math.round(order.total || 0).toLocaleString()}</div>
                                                {order.discount_amount > 0 && (
                                                    <div className="text-xs text-red-500">-¥{Math.round(order.discount_amount).toLocaleString()}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {getPaymentIcon(order.payment_method || '')}
                                                    <span className="text-sm text-slate-700 capitalize">
                                                        {paymentMethods.find(m => m.code === order.payment_method)?.name_vi || order.payment_method}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handlePrint(order.id)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="In lại hóa đơn"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <tr className="bg-slate-50">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                                                        <h4 className="font-medium text-slate-700 mb-3 text-sm">Chi tiết đơn hàng</h4>
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left font-medium text-slate-500">Tên món</th>
                                                                    <th className="px-4 py-2 text-center font-medium text-slate-500">SL</th>
                                                                    <th className="px-4 py-2 text-right font-medium text-slate-500">Đơn giá</th>
                                                                    <th className="px-4 py-2 text-right font-medium text-slate-500">Thành tiền</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {!orderDetails[order.id] ? (
                                                                    <tr>
                                                                        <td colSpan={4} className="px-4 py-8 text-center">
                                                                            <div className="flex items-center justify-center gap-2 text-slate-400">
                                                                                <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full"></div>
                                                                                Đang tải chi tiết...
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ) : orderDetails[order.id]?.items?.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                                            Không có món trong đơn này
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                    orderDetails[order.id]?.items?.map((item: any, itemIdx: number) => (
                                                                        <tr key={itemIdx} className="hover:bg-slate-50">
                                                                            <td className="px-4 py-2">
                                                                                <div className="font-medium text-slate-800">
                                                                                    {item.product_name_vi || item.open_item_name || 'N/A'}
                                                                                </div>
                                                                                {item.note && (
                                                                                    <div className="text-xs text-slate-500 mt-0.5">📝 {item.note}</div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-center text-slate-600">{item.quantity}</td>
                                                                            <td className="px-4 py-2 text-right text-slate-600">¥{Math.round(Number(item.unit_price)).toLocaleString()}</td>
                                                                            <td className="px-4 py-2 text-right font-medium text-slate-800">
                                                                                ¥{Math.round(Number(item.unit_price) * item.quantity).toLocaleString()}
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>

                                                        {/* Total Amount Section */}
                                                        {orderDetails[order.id] && (
                                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                                {Number(orderDetails[order.id].discount_amount) > 0 && (
                                                                    <div className="flex justify-between items-center mb-2 text-red-600">
                                                                        <span>Giảm giá{orderDetails[order.id].discount_reason ? ` (${orderDetails[order.id].discount_reason})` : ''}:</span>
                                                                        <span>-¥{Math.round(Number(orderDetails[order.id].discount_amount)).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                                                                    <span className="font-semibold text-lg text-slate-800">TỔNG CỘNG:</span>
                                                                    <span className="font-bold text-lg text-blue-600">¥{Math.round(Number(orderDetails[order.id].total)).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Print Button */}
                                                        <div className="mt-4 flex justify-end">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePrint(order.id);
                                                                }}
                                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                            >
                                                                <Printer size={16} />
                                                                In lại hóa đơn
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                        }
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    );
}
