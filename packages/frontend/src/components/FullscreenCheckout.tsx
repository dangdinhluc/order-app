import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Order, OrderItem, PaymentMethod } from '../services/api';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, CreditCard, Banknote, Smartphone, Receipt, Tag, CheckCircle2, Printer, Wallet, QrCode, X, Delete, Percent } from 'lucide-react';
import { printReceipt } from '../utils/printReceipt';
import { useToast } from './Toast';
import { useLanguage } from '../context/LanguageContext';
import { getTranslatedField } from '../utils/languageUtils';

interface FullscreenCheckoutProps {
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
    'qr': QrCode,
};

const getIcon = (iconName?: string): LucideIcon => {
    if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
    return Wallet;
};

const DISCOUNT_REASONS = [
    { id: 'regular', label: 'Khách quen' },
    { id: 'complaint', label: 'Đền bù/Khiếu nại' },
    { id: 'promo', label: 'Khuyến mãi đặc biệt' },
    { id: 'staff', label: 'Nhân viên' },
    { id: 'other', label: 'Khác' },
];

const MAX_DISCOUNT_PERCENT = 10; // Thu ngân chỉ được giảm tối đa 10%

export default function FullscreenCheckout({ order, items = [], tableName, onClose, onSuccess }: FullscreenCheckoutProps) {
    const toast = useToast();
    const { currentLanguage } = useLanguage();
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethod, setSelectedMethod] = useState('');
    const [receivedAmount, setReceivedAmount] = useState<number>(0);
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherDiscount, setVoucherDiscount] = useState(0);
    const [voucherError, setVoucherError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showVoucher, setShowVoucher] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<{ method: string; amount: number; received?: number; change?: number } | null>(null);

    // Discount state
    const [showDiscount, setShowDiscount] = useState(false);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [discountValue, setDiscountValue] = useState(0);
    const [discountReason, setDiscountReason] = useState('');
    const [discountOtherReason, setDiscountOtherReason] = useState('');
    // Calculate manual discount amount
    const manualDiscount = discountType === 'percent'
        ? Math.round(order.subtotal * discountValue / 100)
        : discountValue;

    const finalTotal = Math.max(0, order.total - voucherDiscount - manualDiscount);

    // Amount to pay is the full order total
    const amountToPay = finalTotal;
    const changeAmount = receivedAmount > amountToPay ? receivedAmount - amountToPay : 0;
    const isShortAmount = selectedMethod === 'cash' && receivedAmount < amountToPay;

    // Loyalty state
    const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
    const [pointsPerYen, setPointsPerYen] = useState(1);
    const [earnedPoints, setEarnedPoints] = useState(0);

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
                setPaymentMethods([{ id: '1', name: 'Tiền mặt', code: 'cash', is_active: true, sort_order: 1, requires_change: true }]);
                setSelectedMethod('cash');
            }
        };
        loadPaymentMethods();
    }, []);

    // Load loyalty settings
    useEffect(() => {
        const loadLoyaltySettings = async () => {
            try {
                const res = await api.getSettings();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                const settings = (res as any).data || {};
                setLoyaltyEnabled(settings.loyalty_enabled === 'true');
                setPointsPerYen(parseInt(settings.loyalty_points_per_yen) || 1);
            } catch (e) {
                console.error('Failed to load loyalty settings:', e);
            }
        };
        loadLoyaltySettings();
    }, []);

    // Calculate points to earn
    useEffect(() => {
        if (loyaltyEnabled && order.customer_id) {
            const points = Math.floor((finalTotal / 100) * pointsPerYen);
            setEarnedPoints(points);
        } else {
            setEarnedPoints(0);
        }
    }, [finalTotal, loyaltyEnabled, pointsPerYen, order.customer_id]);

    useEffect(() => {
        setReceivedAmount(Math.ceil(finalTotal / 1000) * 1000);
    }, [finalTotal]);

    const currentMethod = paymentMethods.find(m => m.code === selectedMethod);

    const handleValidateVoucher = async () => {
        if (!voucherCode.trim()) return;
        setVoucherError('');
        try {
            const res = await api.validateVoucher(voucherCode, order.subtotal);
            if (res.data?.valid) {
                setVoucherDiscount(res.data.discount);
                setShowVoucher(false);
            }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setVoucherError(error.message || 'Voucher không hợp lệ');
            setVoucherDiscount(0);
        }
    };

    const handlePayment = async () => {
        if (currentMethod?.requires_change && receivedAmount < amountToPay) {
            toast.warning('Tiền chưa đủ', 'Số tiền nhận chưa đủ để thanh toán');
            return;
        }

        setIsProcessing(true);
        try {
            // Pay the entire current order
            await api.payOrder(
                order.id,
                [
                    {
                        method: selectedMethod,
                        amount: amountToPay,
                        received_amount: selectedMethod === 'cash' ? receivedAmount : amountToPay,
                        change_amount: selectedMethod === 'cash' ? changeAmount : 0
                    }
                ],
                voucherCode || undefined
            );

            // Full payment - show success screen
            setIsSuccess(true);
            setPaymentInfo({
                method: selectedMethod,
                amount: amountToPay,
                received: selectedMethod === 'cash' ? receivedAmount : undefined,
                change: selectedMethod === 'cash' ? changeAmount : undefined,
            });

            // Award loyalty points if customer is linked
            if (loyaltyEnabled && order.customer_id && earnedPoints > 0) {
                try {
                    await api.earnLoyaltyPoints(order.customer_id, order.id, amountToPay);
                    toast.success(`+${earnedPoints} điểm`, 'Đã tích điểm cho khách hàng');
                } catch (e) {
                    console.error('Failed to award loyalty points:', e);
                }
            }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error('Thanh toán thất bại', error.message || 'Vui lòng thử lại');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = () => {
        const storeSettings = {
            store_name: 'Hybrid POS',
            store_name_ja: 'ハイブリッドPOS',
            address: '',
            phone: '',
            tax_rate: 10,
            currency: 'JPY',
        };
        const receiptSettings = {
            template: 'modern' as const,
            languages: ['vi', 'ja'],
            logo_url: '',
            header_text_vi: 'Cảm ơn quý khách!',
            header_text_ja: 'ご来店ありがとうございます',
            footer_text_vi: 'Hẹn gặp lại!',
            footer_text_ja: 'またのお越しを！',
            show_date: true,
            show_time: true,
            show_table: true,
            show_table_time: true,
            show_order_number: true,
            show_time_seated: false,
            show_staff_name: true,
            show_cashier: true,
            show_qr_code: false,
            show_wifi: false,
            wifi_ssid: '',
            wifi_password: '',
            font_size: 'medium' as const,
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

    // Inline Numpad handlers
    const handleNumpadPress = useCallback((num: number) => {
        const newValue = receivedAmount * 10 + num;
        if (newValue <= 999999999) {
            setReceivedAmount(newValue);
        }
    }, [receivedAmount]);

    const handleNumpadClear = useCallback(() => {
        setReceivedAmount(0);
    }, []);

    const handleNumpadBackspace = useCallback(() => {
        setReceivedAmount(Math.floor(receivedAmount / 10));
    }, [receivedAmount]);

    const [isClosing, setIsClosing] = useState(false);

    // Close handler - calls onSuccess which handles closeTable and navigation
    const handleCloseTable = useCallback(async () => {
        if (isClosing) return;
        setIsClosing(true);
        try {
            await onSuccess();
        } catch (error) {
            console.error('Error closing table:', error);
            setIsClosing(false);
        }
    }, [onSuccess, isClosing]);

    // Success screen - WHITE THEME
    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center z-50 p-4">
                <div className="text-center text-white max-w-lg w-full">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <CheckCircle2 size={60} className="text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Thanh toán thành công!</h1>
                    <p className="text-xl opacity-80 mb-4">¥{Math.round(finalTotal).toLocaleString()}</p>

                    {(paymentInfo?.change ?? 0) > 0 && (
                        <div className="bg-white/20 rounded-2xl px-6 py-3 mb-4 inline-block">
                            <p className="text-base">Tiền thừa trả khách</p>
                            <p className="text-3xl font-bold">¥{Math.round(paymentInfo!.change!).toLocaleString()}</p>
                        </div>
                    )}

                    <div className="flex gap-3 justify-center mt-6">
                        <button
                            onClick={() => {
                                handlePrintReceipt();
                                handleCloseTable();
                            }}
                            disabled={isClosing}
                            className={`px-6 py-3 font-bold rounded-xl flex items-center gap-2 text-lg transition active:scale-95 shadow-lg ${isClosing ? 'bg-white/70 text-emerald-600 cursor-wait' : 'bg-white text-emerald-600 hover:bg-emerald-50'}`}
                        >
                            {isClosing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <Printer size={24} />
                                    In & Đóng bàn
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleCloseTable}
                            disabled={isClosing}
                            className={`px-6 py-3 font-bold rounded-xl flex items-center gap-2 text-lg transition active:scale-95 shadow-lg ${isClosing ? 'bg-emerald-800 opacity-70 cursor-wait' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}
                        >
                            {isClosing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Đang đóng...
                                </>
                            ) : (
                                <>
                                    <X size={24} />
                                    Không in
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main checkout - WHITE THEME matching POS
    return (
        <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col">
            {/* Header - White with Party Size */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600">
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Thanh toán - {tableName}</h1>
                        </div>
                    </div>

                    {/* Total Amount */}
                    <div className="text-right">
                        <p className="text-4xl font-bold text-blue-600">¥{Math.round(amountToPay).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Main Content - Horizontal Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Order Details + Fixed Bottom */}
                <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
                    {/* Scrollable Order Items */}
                    <div className="flex-1 overflow-y-auto p-3">
                        <h2 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-2">
                            <Receipt size={14} /> Chi tiết ({items.length})
                        </h2>

                        {/* Items List - Display Only */}
                        <div className="space-y-1 mb-3">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 py-2 px-2 rounded-lg bg-slate-50 border border-slate-100"
                                >
                                    {/* Item Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate text-slate-900">
                                            <span className="text-blue-600 font-semibold">{item.quantity}x</span> {item.product_id ? getTranslatedField(item, 'product_name', currentLanguage) : item.open_item_name}
                                        </p>
                                        {item.note && <p className="text-xs text-orange-500 truncate">📝 {item.note}</p>}
                                    </div>

                                    {/* Price */}
                                    <p className="text-sm font-medium text-slate-700">
                                        ¥{Math.round(Number(item.unit_price) * item.quantity).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary - Compact */}
                        <div className="bg-slate-50 rounded-lg p-2 text-sm space-y-1">
                            <div className="flex justify-between text-slate-500">
                                <span>Tạm tính</span>
                                <span>¥{Math.round(order.subtotal).toLocaleString()}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Giảm giá</span>
                                    <span>-¥{Math.round(order.discount_amount).toLocaleString()}</span>
                                </div>
                            )}
                            {voucherDiscount > 0 && (
                                <div className="flex justify-between text-orange-600">
                                    <span>Voucher</span>
                                    <span>-¥{Math.round(voucherDiscount).toLocaleString()}</span>
                                </div>
                            )}
                            {manualDiscount > 0 && (
                                <div className="flex justify-between text-purple-600">
                                    <span>Giảm giá ({discountType === 'percent' ? discountValue + '%' : 'cố định'})</span>
                                    <span>-¥{Math.round(manualDiscount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-1 text-slate-900">
                                <span>Tổng</span>
                                <span className="text-blue-600">¥{Math.round(finalTotal).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Fixed Bottom Section - Discount + Voucher + Confirm */}
                    <div className="border-t border-slate-200 p-3 bg-white">
                        {/* Discount Button */}
                        <button
                            onClick={() => setShowDiscount(true)}
                            className={`w-full py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition border mb-2 ${manualDiscount > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'text-purple-600 hover:bg-purple-50 border-purple-200'
                                }`}
                        >
                            <Percent size={14} />
                            {manualDiscount > 0
                                ? `Đã giảm ¥${manualDiscount.toLocaleString()} (${discountType === 'percent' ? discountValue + '%' : 'cố định'})`
                                : '💰 Giảm giá'
                            }
                        </button>

                        {/* Voucher Toggle */}
                        <button
                            onClick={() => setShowVoucher(!showVoucher)}
                            className="w-full py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg flex items-center justify-center gap-2 transition border border-orange-200 mb-2"
                        >
                            <Tag size={14} /> {showVoucher ? 'Đóng' : 'Có mã giảm giá?'}
                        </button>

                        {showVoucher && (
                            <div className="mb-2 space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nhập mã..."
                                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm uppercase focus:border-blue-500 outline-none"
                                        value={voucherCode}
                                        onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                                    />
                                    <button onClick={handleValidateVoucher} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600">
                                        OK
                                    </button>
                                </div>
                                {voucherError && <p className="text-red-500 text-xs">{voucherError}</p>}
                            </div>
                        )}

                        {/* Loyalty Points Preview */}
                        {loyaltyEnabled && earnedPoints > 0 && (
                            <div className="mb-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <span className="text-lg">⭐</span>
                                    <span className="text-sm font-medium">
                                        Khách sẽ nhận <span className="font-bold text-amber-800">+{earnedPoints} điểm</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Confirm Button */}
                        <button
                            onClick={handlePayment}
                            disabled={isProcessing || isShortAmount}
                            className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 text-lg transition-all active:scale-[0.98] ${isProcessing || isShortAmount
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                                }`}
                        >
                            <Receipt size={20} />
                            {isProcessing ? 'Đang xử lý...' : 'Thanh toán'}
                        </button>
                    </div>
                </div>

                {/* Right Panel - Payment (NO SCROLL - Fixed Layout) */}
                <div className="flex-1 bg-slate-50 p-4 flex flex-col">
                    {/* Payment Methods - Horizontal Row */}
                    <div className="flex gap-2 mb-3">
                        {paymentMethods.map((method) => {
                            const Icon = getIcon(method.icon);
                            const isSelected = selectedMethod === method.code;
                            return (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setSelectedMethod(method.code)}
                                    className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all active:scale-95 bg-white
                                        ${isSelected
                                            ? 'border-blue-500 text-blue-600 shadow-md'
                                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                >
                                    <Icon size={24} />
                                    <span className="font-bold text-sm">{method.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Cash Input Section - Compact Vertical Layout */}
                    {currentMethod?.requires_change ? (
                        <div className="flex-1 flex flex-col">
                            {/* Combined Amount Display Box */}
                            <div
                                onClick={() => setReceivedAmount(0)}
                                className={`rounded-2xl p-4 mb-3 border-2 bg-white cursor-pointer transition hover:shadow-md ${isShortAmount ? 'border-red-400' : changeAmount > 0 ? 'border-green-400' : 'border-blue-400'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Khách đưa (tap để xóa)</p>
                                        <p className={`text-4xl font-bold tabular-nums ${isShortAmount ? 'text-red-500' : 'text-blue-600'
                                            }`}>
                                            ¥{receivedAmount.toLocaleString()}
                                            <span className="text-slate-300 animate-pulse">|</span>
                                        </p>
                                        {isShortAmount && (
                                            <p className="text-red-500 text-sm mt-1">⚠️ Thiếu ¥{(amountToPay - receivedAmount).toLocaleString()}</p>
                                        )}
                                    </div>

                                    {/* Inline Change Display */}
                                    <div className={`text-right px-4 py-2 rounded-xl ${changeAmount > 0 ? 'bg-amber-50' : 'bg-slate-50'
                                        }`}>
                                        <p className="text-xs text-slate-500">💵 Trả lại</p>
                                        <p className={`text-3xl font-bold ${changeAmount > 0 ? 'text-amber-600' : 'text-slate-300'
                                            }`}>
                                            ¥{Math.round(changeAmount).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Amounts Row - Simple 4 buttons */}
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {[1000, 5000, 10000].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setReceivedAmount(amt)}
                                        className={`py-3 rounded-xl font-bold text-base transition active:scale-95 ${receivedAmount === amt
                                            ? 'bg-blue-500 text-white border-2 border-blue-600'
                                            : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-400'
                                            }`}
                                    >
                                        ¥{amt >= 1000 ? amt / 1000 + 'k' : amt}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setReceivedAmount(amountToPay)}
                                    className={`py-3 rounded-xl font-bold text-sm transition active:scale-95 ${receivedAmount === amountToPay
                                        ? 'bg-green-500 text-white border-2 border-green-600'
                                        : 'bg-green-50 border-2 border-green-400 text-green-700 hover:bg-green-100'
                                        }`}
                                >
                                    ✓ Đúng tiền
                                </button>
                            </div>

                            {/* Numpad Grid - 3 columns only */}
                            <div className="flex-1 grid grid-cols-3 gap-2">
                                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleNumpadPress(num)}
                                        className="bg-white border border-slate-200 rounded-xl font-bold text-2xl text-slate-800 hover:bg-slate-50 active:scale-95 transition"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button onClick={handleNumpadClear} className="bg-red-50 border border-red-200 rounded-xl font-bold text-lg text-red-600 hover:bg-red-100 active:scale-95 transition">C</button>
                                <button onClick={() => handleNumpadPress(0)} className="bg-white border border-slate-200 rounded-xl font-bold text-2xl text-slate-800 hover:bg-slate-50 active:scale-95 transition">0</button>
                                <button onClick={handleNumpadBackspace} className="bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-600 hover:bg-amber-100 active:scale-95 transition flex items-center justify-center">
                                    <Delete size={22} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Non-cash payment */
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    {(() => {
                                        const Icon = getIcon(currentMethod?.icon);
                                        return <Icon size={48} className="text-blue-600" />;
                                    })()}
                                </div>
                                <p className="text-xl text-slate-500 mb-1">Thanh toán bằng</p>
                                <p className="text-3xl font-bold text-blue-600">{currentMethod?.name}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-3">¥{Math.round(finalTotal).toLocaleString()}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Discount Modal */}
            {showDiscount && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowDiscount(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-900">💰 Giảm giá</h3>
                            <button onClick={() => setShowDiscount(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">
                            {/* Type Toggle */}
                            <div>
                                <p className="text-sm text-slate-500 mb-2">Chọn kiểu:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setDiscountType('percent'); setDiscountValue(0); }}
                                        className={`py-3 rounded-xl font-bold text-base transition ${discountType === 'percent'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        % Phần trăm
                                    </button>
                                    <button
                                        onClick={() => { setDiscountType('fixed'); setDiscountValue(0); }}
                                        className={`py-3 rounded-xl font-bold text-base transition ${discountType === 'fixed'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        ¥ Số tiền
                                    </button>
                                </div>
                            </div>

                            {/* Value Input */}
                            <div>
                                <p className="text-sm text-slate-500 mb-2">
                                    Nhập giá trị {discountType === 'percent' ? '(%)' : '(¥)'}:
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        max={discountType === 'percent' ? 100 : order.subtotal}
                                        value={discountValue || ''}
                                        onChange={e => setDiscountValue(Number(e.target.value))}
                                        className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:border-purple-500 outline-none"
                                        placeholder="0"
                                    />
                                    <div className="text-right">
                                        <p className="text-sm text-slate-500">Giảm:</p>
                                        <p className="text-xl font-bold text-emerald-600">
                                            -¥{(discountType === 'percent'
                                                ? Math.round(order.subtotal * discountValue / 100)
                                                : discountValue
                                            ).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Max Discount Warning */}
                                {discountType === 'percent' && discountValue > MAX_DISCOUNT_PERCENT && (
                                    <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
                                        ⚠️ Giới hạn thu ngân: Tối đa {MAX_DISCOUNT_PERCENT}% (¥{Math.round(order.subtotal * MAX_DISCOUNT_PERCENT / 100).toLocaleString()})
                                    </p>
                                )}
                            </div>

                            {/* Reason Selection */}
                            <div>
                                <p className="text-sm text-slate-500 mb-2">📝 Lý do giảm <span className="text-red-500">*</span>:</p>
                                <div className="space-y-2">
                                    {DISCOUNT_REASONS.map(reason => (
                                        <label
                                            key={reason.id}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${discountReason === reason.id
                                                ? 'bg-purple-50 border-2 border-purple-400'
                                                : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="discountReason"
                                                checked={discountReason === reason.id}
                                                onChange={() => setDiscountReason(reason.id)}
                                                className="w-4 h-4 text-purple-600"
                                            />
                                            <span className="font-medium text-slate-700">{reason.label}</span>
                                        </label>
                                    ))}

                                    {/* Other Reason Input */}
                                    {discountReason === 'other' && (
                                        <input
                                            type="text"
                                            placeholder="Nhập lý do khác..."
                                            value={discountOtherReason}
                                            onChange={e => setDiscountOtherReason(e.target.value)}
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none mt-2"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2 p-4 border-t border-slate-200">
                            {/* Hủy button - always visible */}
                            <button
                                onClick={() => setShowDiscount(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition"
                            >
                                Hủy
                            </button>

                            {/* Clear Discount - only if already has discount applied */}
                            {manualDiscount > 0 && (
                                <button
                                    onClick={() => {
                                        setDiscountValue(0);
                                        setDiscountReason('');
                                        setDiscountOtherReason('');
                                        setShowDiscount(false);
                                        toast.success('Đã xóa giảm giá');
                                    }}
                                    className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl border border-red-200 hover:bg-red-100 transition"
                                >
                                    Xóa giảm
                                </button>
                            )}

                            {/* Apply - only show when has value */}
                            {discountValue > 0 && (
                                <button
                                    onClick={() => {
                                        if (!discountReason) {
                                            toast.error('Vui lòng chọn lý do giảm giá');
                                            return;
                                        }
                                        if (discountReason === 'other' && !discountOtherReason.trim()) {
                                            toast.error('Vui lòng nhập lý do');
                                            return;
                                        }
                                        setShowDiscount(false);
                                        toast.success(`Đã áp dụng giảm ¥${manualDiscount.toLocaleString()}`);
                                    }}
                                    className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-500 transition"
                                >
                                    ✓ Áp dụng
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
