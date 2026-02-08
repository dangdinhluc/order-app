import { useState } from 'react';
import { AlertCircle, ArrowRight, Merge, Trash2, CheckCircle2 } from 'lucide-react';

export interface ConflictItem {
    id: string;
    product_name: string;
    quantity: number;
    source: 'cloud' | 'local';
}

interface ConflictResolverProps {
    tableNumber: string;
    cloudOrder: { id: string; items: ConflictItem[] };
    localOrder: { id: string; items: ConflictItem[] };
    onResolve: (decision: 'merge' | 'keep_cloud' | 'keep_local' | 'cancel_all') => void;
    onClose: () => void;
}

export default function ConflictResolver({
    tableNumber, cloudOrder, localOrder, onResolve, onClose
}: ConflictResolverProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAction = async (decision: any) => {
        setIsProcessing(true);
        await onResolve(decision);
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-orange-500 p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="w-8 h-8" />
                        <h2 className="text-2xl font-bold">Phát hiện đơn hàng trùng lặp!</h2>
                    </div>
                    <p className="opacity-90">Bàn {tableNumber} vừa có đơn từ khách (QR) và đơn từ nhân viên (Local) trong lúc mất mạng.</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        {/* Cloud Order (QR) */}
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <h3 className="text-indigo-700 font-bold mb-3 flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] rounded uppercase">Từ Khách QR</span>
                                Đơn Cloud
                            </h3>
                            <ul className="space-y-2">
                                {cloudOrder.items.map((item, idx) => (
                                    <li key={idx} className="text-sm flex justify-between text-slate-600">
                                        <span>{item.product_name}</span>
                                        <span className="font-bold text-slate-900">x{item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Local Order (Staff) */}
                        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <h3 className="text-blue-700 font-bold mb-3 flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] rounded uppercase">Từ Nhân viên</span>
                                Đơn Local
                            </h3>
                            <ul className="space-y-2">
                                {localOrder.items.map((item, idx) => (
                                    <li key={idx} className="text-sm flex justify-between text-slate-600">
                                        <span>{item.product_name}</span>
                                        <span className="font-bold text-slate-900">x{item.quantity}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={() => handleAction('merge')}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold group"
                        >
                            <div className="flex items-center gap-3">
                                <Merge className="text-orange-400" />
                                <span>GỘP CẢ HAI ĐƠN (Khách lấy hết)</span>
                            </div>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleAction('keep_cloud')}
                                disabled={isProcessing}
                                className="flex items-center justify-center gap-2 p-3 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all text-sm font-bold"
                            >
                                <CheckCircle2 size={18} />
                                CHỈ GIỮ ĐƠN QR
                            </button>
                            <button
                                onClick={() => handleAction('keep_local')}
                                disabled={isProcessing}
                                className="flex items-center justify-center gap-2 p-3 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all text-sm font-bold"
                            >
                                <CheckCircle2 size={18} />
                                CHỈ GIỮ ĐƠN LOCAL
                            </button>
                        </div>

                        <button
                            onClick={() => handleAction('cancel_all')}
                            disabled={isProcessing}
                            className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all text-sm font-bold"
                        >
                            <Trash2 size={18} />
                            HỦY CẢ HAI ĐƠN (Khách bấm nhầm + Nhân viên ghi sai)
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={onClose}
                        className="text-slate-400 text-sm hover:text-slate-600"
                    >
                        Để sau (Tiếp tục Offline)
                    </button>
                </div>
            </div>
        </div>
    );
}
