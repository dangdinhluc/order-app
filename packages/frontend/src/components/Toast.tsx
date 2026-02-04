import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

// Types
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextValue {
    toasts: Toast[];
    success: (title: string, message?: string, duration?: number) => string;
    error: (title: string, message?: string, duration?: number) => string;
    warning: (title: string, message?: string, duration?: number) => string;
    info: (title: string, message?: string, duration?: number) => string;
    loading: (title: string, message?: string) => string;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    update: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
}

// Context
const ToastContext = createContext<ToastContextValue | null>(null);

// Custom hook
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Generate unique ID
const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Toast Item Component
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (toast.duration && toast.type !== 'loading') {
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(onDismiss, 300);
            }, toast.duration);
            return () => clearTimeout(timer);
        }
    }, [toast.duration, toast.type, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };

    const config = {
        success: {
            icon: CheckCircle,
            bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
            border: 'border-emerald-400/30',
            iconBg: 'bg-white/20',
            iconColor: 'text-white',
        },
        error: {
            icon: AlertCircle,
            bg: 'bg-gradient-to-r from-red-500 to-rose-600',
            border: 'border-red-400/30',
            iconBg: 'bg-white/20',
            iconColor: 'text-white',
        },
        warning: {
            icon: AlertTriangle,
            bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
            border: 'border-amber-400/30',
            iconBg: 'bg-white/20',
            iconColor: 'text-white',
        },
        info: {
            icon: Info,
            bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
            border: 'border-blue-400/30',
            iconBg: 'bg-white/20',
            iconColor: 'text-white',
        },
        loading: {
            icon: Loader2,
            bg: 'bg-gradient-to-r from-slate-600 to-slate-700',
            border: 'border-slate-500/30',
            iconBg: 'bg-white/20',
            iconColor: 'text-white',
        },
    };

    const { icon: Icon, bg, border, iconBg, iconColor } = config[toast.type];

    return (
        <div
            className={`
                relative overflow-hidden rounded-2xl shadow-2xl border backdrop-blur-xl
                transform transition-all duration-300 ease-out
                ${bg} ${border}
                ${isExiting
                    ? 'translate-x-full opacity-0 scale-95'
                    : 'translate-x-0 opacity-100 scale-100'
                }
            `}
            role="alert"
        >
            {/* Progress bar for timed toasts */}
            {toast.duration && toast.type !== 'loading' && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                    <div
                        className="h-full bg-white/40 origin-left"
                        style={{
                            animation: `shrink ${toast.duration}ms linear forwards`,
                        }}
                    />
                </div>
            )}

            <div className="flex items-start gap-4 p-4 pr-12">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <Icon
                        size={22}
                        className={`${iconColor} ${toast.type === 'loading' ? 'animate-spin' : ''}`}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-white font-bold text-base leading-tight">
                        {toast.title}
                    </p>
                    {toast.message && (
                        <p className="text-white/80 text-sm mt-1 leading-snug">
                            {toast.message}
                        </p>
                    )}
                    {toast.action && (
                        <button
                            onClick={toast.action.onClick}
                            className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>

                {/* Close button */}
                {toast.type !== 'loading' && (
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}

// Toast Container Component
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            <style>
                {`
                    @keyframes shrink {
                        from { transform: scaleX(1); }
                        to { transform: scaleX(0); }
                    }
                `}
            </style>
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <ToastItem toast={toast} onDismiss={() => onDismiss(toast.id)} />
                </div>
            ))}
        </div>
    );
}

// Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
        const id = generateId();
        const toast: Toast = {
            id,
            type,
            title,
            message,
            duration: duration ?? (type === 'loading' ? undefined : 4000),
        };
        setToasts((prev) => [...prev, toast]);
        return id;
    }, []);

    const success = useCallback(
        (title: string, message?: string, duration?: number) => addToast('success', title, message, duration),
        [addToast]
    );

    const error = useCallback(
        (title: string, message?: string, duration?: number) => addToast('error', title, message, duration ?? 6000),
        [addToast]
    );

    const warning = useCallback(
        (title: string, message?: string, duration?: number) => addToast('warning', title, message, duration),
        [addToast]
    );

    const info = useCallback(
        (title: string, message?: string, duration?: number) => addToast('info', title, message, duration),
        [addToast]
    );

    const loading = useCallback(
        (title: string, message?: string) => addToast('loading', title, message),
        [addToast]
    );

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    const update = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
    }, []);

    const value: ToastContextValue = {
        toasts,
        success,
        error,
        warning,
        info,
        loading,
        dismiss,
        dismissAll,
        update,
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

// Export default for convenience
export default ToastProvider;
