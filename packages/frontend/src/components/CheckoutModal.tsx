import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Order, OrderItem, PaymentMethod } from '../services/api';
import type { LucideIcon } from 'lucide-react';
import { X, CreditCard, Banknote, Smartphone, Receipt, Tag, CheckCircle2, Printer, Wallet } from 'lucide-react';
import { printReceipt, type ReceiptSettings } from '../utils/printReceipt';
import { useToast } from './Toast';

interface CheckoutModalProps {
    order: Order;
    items?: OrderItem[];
    tableName: string;
    onClose: () => void;
    onSuccess: () => void;
}

// Icon mapping for payment methods
const ICON_MAP: Record<string, LucideIcon> = {
    'banknote': Banknote,
    'credit-card': CreditCard,
    'smartphone': Smartphone,
    'wallet': Wallet,
};

const getIcon = (iconName?: string): LucideIcon => {
    if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
    return Wallet;
};

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 200000, 500000];

export default function CheckoutModal({ order, items = [], tableName, onClose, onSuccess }: CheckoutModalProps) {
    const toast = useToast();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [receivedAmount, setReceivedAmount] = useState<number>(0);
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherDiscount, setVoucherDiscount] = useState(0);
    const [voucherError, setVoucherError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<{ method: string; amount: number; received?: number; change?: number } | null>(null);

    const finalTotal = Math.max(0, order.total - voucherDiscount);
    const changeAmount = receivedAmount > finalTotal ? receivedAmount - finalTotal : 0;

    // Load payment methods
    useEffect(() => {
        const loadPaymentMethods = async () => {
            try {
                const res = await api.getPaymentMethods();
                if (res.data?.payment_methods?.length) {
                    setPaymentMethods(res.data.payment_methods);
                    setSelectedMethod(res.data.payment_methods[0].code);
                }
            } catch (error) {
                console.error('Failed to load payment methods:', error);
                // Fallback to default
                setPaymentMethods([{ id: '1', name: 'Tiền mặt', code: 'cash', is_active: true, sort_order: 1, requires_change: true }]);
                setSelectedMethod('cash');
            }
        };
        loadPaymentMethods();
    }, []);

    useEffect(() => {
        // Pre-fill received amount with order total
        setReceivedAmount(Math.ceil(finalTotal / 1000) * 1000);
    }, [finalTotal]);

    // Get current selected payment method object
    const currentMethod = paymentMethods.find(m => m.code === selectedMethod);

    const handleValidateVoucher = async () => {
        if (!voucherCode.trim()) return;
        setVoucherError('');
        try {
            const res = await api.validateVoucher(voucherCode, order.subtotal);
            if (res.data?.valid) {
                setVoucherDiscount(res.data.discount);
            }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setVoucherError(error.message || 'Voucher không hợp lệ');
            setVoucherDiscount(0);
        }
    };

    const handlePayment = async () => {
        if (currentMethod?.requires_change && receivedAmount < finalTotal) {
            toast.warning('Tiền chưa đủ', 'Số tiền nhận chưa đủ để thanh toán');
            return;
        }

        setIsProcessing(true);
        try {
            await api.payOrder(order.id, [
                {
                    method: selectedMethod,
                    amount: finalTotal,
                    received_amount: selectedMethod === 'cash' ? receivedAmount : finalTotal,
                    change_amount: selectedMethod === 'cash' ? changeAmount : 0
                }
            ], voucherCode || undefined);

            setIsSuccess(true);
            setPaymentInfo({
                method: selectedMethod,
                amount: finalTotal,
                received: selectedMethod === 'cash' ? receivedAmount : undefined,
                change: selectedMethod === 'cash' ? changeAmount : undefined,
            });
            setTimeout(() => {
                onSuccess();
            }, 3000); // Extended to allow printing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error('Thanh toán thất bại', error.message || 'Vui lòng thử lại');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = () => {
        // Default settings (can be fetched from API later)
        const storeSettings = {
            store_name: 'Hybrid POS',
            store_name_ja: 'ハイブリッドPOS',
            address: '',
            phone: '',
            tax_rate: 10,
            currency: 'JPY',
        };
        const receiptSettings: ReceiptSettings = {
            logo_url: "",
            show_date: true,
            show_time: true,
            show_table_time: false,
            show_order_number: true,
            show_table: true,
            show_time_seated: false,
            show_staff_name: false,
            show_cashier: true,
            show_qr_code: false,
            font_size: "medium",
            template: "modern",
            languages: ["vi"],
            header_text_vi: "NHÀ HÀNG IZAKAYA",
            header_text_ja: "IZAKAYA RESTAURANT",
            footer_text_vi: "Cảm ơn quý khách!",
            footer_text_ja: "Thank you!",
            show_wifi: false,
            wifi_ssid: "",
            wifi_password: ""
        };
        const printerSettings = {
            printer_type: 'browser' as const,
            paper_width: '80mm' as const,
        };

        printReceipt({
            order: {
                ...order,
                order_number: order.order_number?.toString(),
                total: finalTotal,
            },
            items: items.map(i => ({
                id: i.id,
                product_id: i.product_id,
                product_name_vi: i.product_name_vi,
                product_name_ja: i.product_name_ja,
                open_item_name: i.open_item_name,
                quantity: i.quantity,
                unit_price: Number(i.unit_price),
                note: i.note,
            })),
            storeSettings,
            receiptSettings,
            printerSettings,
            payments: paymentInfo ? [{
                method: paymentInfo.method,
                amount: paymentInfo.amount,
                received_amount: paymentInfo.received,
                change_amount: paymentInfo.change,
            }] : undefined,
        });
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={48} className="text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán thành công!</h2>
                    <p className="text-slate-500 mb-4">Đang đóng bàn...</p>
                    <button
                        onClick={handlePrintReceipt}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition"
                    >
                        <Printer size={20} />
                        In hóa đơn
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-slate-50 rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Thanh toán</h2>
                        <p className="text-sm text-slate-500">{tableName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Order Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tạm tính</span>
                            <span>¥{Math.round(order.subtotal).toLocaleString()}</span>
                        </div>
                        {order.discount_amount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                                <span>Giảm giá</span>
                                <span>-¥{Math.round(order.discount_amount).toLocaleString()}</span>
                            </div>
                        )}
                        {voucherDiscount > 0 && (
                            <div className="flex justify-between text-sm text-orange-600">
                                <span>Voucher</span>
                                <span>-¥{Math.round(voucherDiscount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Tổng cộng</span>
                            <span className="text-blue-600">¥{Math.round(finalTotal).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Voucher Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Tag size={16} /> Mã giảm giá
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Nhập mã voucher..."
                                className="flex-1 border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                                value={voucherCode}
                                onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                            />
                            <button
                                onClick={handleValidateVoucher}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
                            >
                                Áp dụng
                            </button>
                        </div>
                        {voucherError && <p className="text-red-500 text-sm">{voucherError}</p>}
                        {voucherDiscount > 0 && <p className="text-emerald-600 text-sm">✓ Voucher áp dụng thành công!</p>}
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Phương thức thanh toán</label>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((method: PaymentMethod) => {
                                const Icon = getIcon(method.icon);
                                const isSelected = selectedMethod === method.code;
                                return (
                                    <button
                                        key={method.id}
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSelectedMethod(method.code);
                                        }}
                                        style={isSelected && method.color ? { borderColor: method.color, backgroundColor: method.color + '15' } : undefined}
                                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all touch-manipulation select-none active:scale-95
                                            ${isSelected
                                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                                                : 'border-slate-200 hover:border-slate-300 active:bg-slate-100'
                                            }`}
                                    >
                                        <Icon size={24} style={method.color ? { color: method.color } : undefined} />
                                        <span className="font-semibold text-base">{method.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Cash Input (only for methods requiring change) */}
                    {currentMethod?.requires_change && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-700">Tiền khách đưa</label>
                            <input
                                type="number"
                                className="w-full border rounded-lg px-4 py-3 text-xl font-bold text-center outline-none focus:ring-2 focus:ring-blue-500"
                                value={receivedAmount}
                                onChange={e => setReceivedAmount(Number(e.target.value))}
                            />
                            <div className="flex flex-wrap gap-2">
                                {QUICK_AMOUNTS.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setReceivedAmount(amt)}
                                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium"
                                    >
                                        {(amt / 1000)}k
                                    </button>
                                ))}
                                <button
                                    onClick={() => setReceivedAmount(finalTotal)}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium"
                                >
                                    Đúng tiền
                                </button>
                            </div>

                            {/* Change Display */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                <p className="text-sm text-amber-700 mb-1">Tiền thừa trả khách</p>
                                <p className="text-3xl font-bold text-amber-600">
                                    ¥{Math.round(changeAmount).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 rounded-b-2xl">
                    <button
                        onClick={handlePayment}
                        disabled={isProcessing || (selectedMethod === 'cash' && receivedAmount < finalTotal)}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Receipt size={20} />
                        {isProcessing ? 'Đang xử lý...' : `Xác nhận thanh toán ¥${Math.round(finalTotal).toLocaleString()}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
