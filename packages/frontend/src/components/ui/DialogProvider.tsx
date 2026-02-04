import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info, HelpCircle } from 'lucide-react';

// ============================================
// TYPES
// ============================================

type DialogVariant = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface DialogOptions {
    title?: string;
    message: string;
    variant?: DialogVariant;
    okText?: string;
    cancelText?: string;
    danger?: boolean;
}

interface DialogState extends DialogOptions {
    id: string;
    type: 'alert' | 'confirm';
    resolve: (value: boolean) => void;
}

interface DialogContextValue {
    alert: (options: Omit<DialogOptions, 'cancelText'>) => Promise<void>;
    confirm: (options: DialogOptions) => Promise<boolean>;
}

// ============================================
// CONTEXT
// ============================================

const DialogContext = createContext<DialogContextValue | null>(null);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

// ============================================
// VARIANT CONFIG
// ============================================

const variantConfig: Record<DialogVariant, {
    icon: typeof CheckCircle;
    iconColor: string;
    buttonColor: string;
    buttonHover: string;
}> = {
    success: {
        icon: CheckCircle,
        iconColor: 'text-green-400',
        buttonColor: 'bg-green-600',
        buttonHover: 'hover:bg-green-500',
    },
    error: {
        icon: AlertCircle,
        iconColor: 'text-red-400',
        buttonColor: 'bg-red-600',
        buttonHover: 'hover:bg-red-500',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        buttonColor: 'bg-amber-600',
        buttonHover: 'hover:bg-amber-500',
    },
    info: {
        icon: Info,
        iconColor: 'text-blue-400',
        buttonColor: 'bg-blue-600',
        buttonHover: 'hover:bg-blue-500',
    },
    confirm: {
        icon: HelpCircle,
        iconColor: 'text-amber-400',
        buttonColor: 'bg-amber-600',
        buttonHover: 'hover:bg-amber-500',
    },
};

// ============================================
// DIALOG COMPONENT
// ============================================

const AppDialog = ({
    dialog,
    onClose,
}: {
    dialog: DialogState;
    onClose: (result: boolean) => void;
}) => {
    const variant = dialog.variant || (dialog.type === 'confirm' ? 'confirm' : 'info');
    const config = variantConfig[variant];
    const Icon = config.icon;

    const handleConfirm = () => onClose(true);
    const handleCancel = () => onClose(false);

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Backdrop */}
            <motion.div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleCancel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />

            {/* Modal Card */}
            <motion.div
                className="relative w-full max-w-md bg-stone-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
                    <div className={`p-2 rounded-xl bg-white/5 ${config.iconColor}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white flex-1">
                        {dialog.title || (dialog.type === 'confirm' ? 'Xác nhận' : 'Thông báo')}
                    </h3>
                    <button
                        onClick={handleCancel}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-white/60" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    <p className="text-white/80 text-sm leading-relaxed">{dialog.message}</p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-5 py-4 bg-stone-900/50 border-t border-white/5">
                    {dialog.type === 'confirm' && (
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-white/80 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 transition-colors font-medium text-sm"
                        >
                            {dialog.cancelText || 'Hủy'}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`px-4 py-2 text-white rounded-xl transition-colors font-medium text-sm ${dialog.danger
                                ? 'bg-red-600 hover:bg-red-500'
                                : `${config.buttonColor} ${config.buttonHover}`
                            }`}
                    >
                        {dialog.okText || 'OK'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================
// PROVIDER
// ============================================

export const DialogProvider = ({ children }: { children: ReactNode }) => {
    const [dialogs, setDialogs] = useState<DialogState[]>([]);

    const generateId = () => Math.random().toString(36).substring(2, 11);

    const alert = useCallback((options: Omit<DialogOptions, 'cancelText'>): Promise<void> => {
        return new Promise((resolve) => {
            const id = generateId();
            setDialogs((prev) => [
                ...prev,
                {
                    ...options,
                    id,
                    type: 'alert',
                    resolve: () => resolve(),
                },
            ]);
        });
    }, []);

    const confirm = useCallback((options: DialogOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            const id = generateId();
            setDialogs((prev) => [
                ...prev,
                {
                    ...options,
                    id,
                    type: 'confirm',
                    resolve,
                },
            ]);
        });
    }, []);

    const closeDialog = useCallback((id: string, result: boolean) => {
        setDialogs((prev) => {
            const dialog = prev.find((d) => d.id === id);
            if (dialog) {
                dialog.resolve(result);
            }
            return prev.filter((d) => d.id !== id);
        });
    }, []);

    return (
        <DialogContext.Provider value={{ alert, confirm }}>
            {children}
            <AnimatePresence>
                {dialogs.map((dialog) => (
                    <AppDialog
                        key={dialog.id}
                        dialog={dialog}
                        onClose={(result) => closeDialog(dialog.id, result)}
                    />
                ))}
            </AnimatePresence>
        </DialogContext.Provider>
    );
};

export default DialogProvider;
