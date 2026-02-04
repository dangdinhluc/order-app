import { useCallback } from 'react';
import { Delete } from 'lucide-react';

interface NumpadProps {
    value: number;
    onChange: (value: number) => void;
    size?: 'normal' | 'large';
    className?: string;
}

export default function Numpad({ value, onChange, size = 'normal', className = '' }: NumpadProps) {
    const buttonSize = size === 'large' ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-xl';
    const containerGap = size === 'large' ? 'gap-3' : 'gap-2';

    const handleNumber = useCallback((num: number) => {
        // Append number to current value
        const newValue = value * 10 + num;
        // Limit to reasonable amount (999,999,999)
        if (newValue <= 999999999) {
            onChange(newValue);
        }
    }, [value, onChange]);

    const handleClear = useCallback(() => {
        onChange(0);
    }, [onChange]);

    const handleBackspace = useCallback(() => {
        onChange(Math.floor(value / 10));
    }, [value, onChange]);

    const buttons = [
        { label: '7', action: () => handleNumber(7), type: 'number' },
        { label: '8', action: () => handleNumber(8), type: 'number' },
        { label: '9', action: () => handleNumber(9), type: 'number' },
        { label: '4', action: () => handleNumber(4), type: 'number' },
        { label: '5', action: () => handleNumber(5), type: 'number' },
        { label: '6', action: () => handleNumber(6), type: 'number' },
        { label: '1', action: () => handleNumber(1), type: 'number' },
        { label: '2', action: () => handleNumber(2), type: 'number' },
        { label: '3', action: () => handleNumber(3), type: 'number' },
        { label: 'C', action: handleClear, type: 'clear' },
        { label: '0', action: () => handleNumber(0), type: 'number' },
        { label: '←', action: handleBackspace, type: 'backspace' },
    ];

    const getButtonClass = (type: string) => {
        const base = `${buttonSize} rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center select-none touch-manipulation`;
        switch (type) {
            case 'clear':
                return `${base} bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300`;
            case 'backspace':
                return `${base} bg-amber-100 text-amber-600 hover:bg-amber-200 active:bg-amber-300`;
            default:
                return `${base} bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300`;
        }
    };

    return (
        <div className={`grid grid-cols-3 ${containerGap} ${className}`}>
            {buttons.map((btn, idx) => (
                <button
                    key={idx}
                    type="button"
                    onClick={btn.action}
                    className={getButtonClass(btn.type)}
                >
                    {btn.label === '←' ? <Delete size={size === 'large' ? 28 : 24} /> : btn.label}
                </button>
            ))}
        </div>
    );
}
