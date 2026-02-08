import { Zap, Printer, Percent, ChefHat, DollarSign, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

interface QuickActionBarProps {
    onQuickPay?: () => void;
    onPrintPreview?: () => void;
    onSendToKitchen?: () => void;
    onDiscount?: (percent: number) => void;
    disabled?: boolean;
    hasItems?: boolean;
}

export default function QuickActionBar({
    onQuickPay,
    onPrintPreview,
    onSendToKitchen,
    onDiscount,
    disabled = false,
    hasItems = false,
}: QuickActionBarProps) {
    const [showDiscounts, setShowDiscounts] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(() => {
        return localStorage.getItem('pos-sound-enabled') !== 'false';
    });

    const toggleSound = () => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        localStorage.setItem('pos-sound-enabled', String(newValue));
    };

    const discountOptions = [5, 10, 15, 20];

    return (
        <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-xl border">
            {/* Quick Pay Button */}
            <button
                onClick={onQuickPay}
                disabled={disabled || !hasItems}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3
                           bg-green-500 hover:bg-green-600 disabled:bg-gray-300
                           text-white rounded-lg font-medium text-sm transition
                           disabled:cursor-not-allowed"
            >
                <Zap size={18} />
                <span className="hidden sm:inline">Thanh toán</span>
                <span className="text-xs opacity-80 hidden md:inline">(F8)</span>
            </button>

            {/* Send to Kitchen */}
            <button
                onClick={onSendToKitchen}
                disabled={disabled || !hasItems}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3
                           bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300
                           text-white rounded-lg font-medium text-sm transition
                           disabled:cursor-not-allowed"
            >
                <ChefHat size={18} />
                <span className="hidden sm:inline">Gửi bếp</span>
            </button>

            {/* Print Preview */}
            <button
                onClick={onPrintPreview}
                disabled={disabled || !hasItems}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3
                           bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300
                           text-white rounded-lg font-medium text-sm transition
                           disabled:cursor-not-allowed"
            >
                <Printer size={18} />
                <span className="hidden lg:inline">In tạm</span>
            </button>

            {/* Discount Button with Dropdown */}
            <div className="relative">
                <button
                    onClick={() => setShowDiscounts(!showDiscounts)}
                    disabled={disabled || !hasItems}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3
                               bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300
                               text-white rounded-lg font-medium text-sm transition
                               disabled:cursor-not-allowed"
                >
                    <Percent size={18} />
                    <span className="hidden lg:inline">Giảm</span>
                </button>

                {showDiscounts && !disabled && hasItems && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg
                                    border overflow-hidden z-10 min-w-[120px]">
                        {discountOptions.map((percent) => (
                            <button
                                key={percent}
                                onClick={() => {
                                    onDiscount?.(percent);
                                    setShowDiscounts(false);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-purple-50
                                           text-sm font-medium flex items-center gap-2"
                            >
                                <DollarSign size={14} className="text-purple-500" />
                                Giảm {percent}%
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Sound Toggle */}
            <button
                onClick={toggleSound}
                className={`p-2.5 rounded-lg transition ${soundEnabled
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                        : 'bg-slate-300 text-slate-400'
                    }`}
                title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
        </div>
    );
}
