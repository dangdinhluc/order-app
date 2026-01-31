import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
    DollarSign, Lock, Unlock, TrendingUp, TrendingDown,
    Plus, Minus
} from 'lucide-react';
import { format } from 'date-fns';

interface Shift {
    id: string;
    user_id: string;
    user_name?: string;
    start_amount: number;
    end_amount?: number;
    expected_end_amount?: number;
    difference_amount?: number;
    started_at: string;
    ended_at?: string;
    status: 'open' | 'closed';
    note?: string;
}

interface CashStatus {
    shift: Shift | null;
    pay_in: number;
    pay_out: number;
    cash_sales: number;
    current_balance: number;
}

export default function CashManagement() {
    const [status, setStatus] = useState<CashStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState<Shift[]>([]);

    // Modals
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showTransactionModal, setShowTransactionModal] = useState<'pay_in' | 'pay_out' | null>(null);

    useEffect(() => {
        fetchStatus();
        fetchHistory();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.getCashStatus();
            if (res && res.data) {
                setStatus(res.data);
            } else {
                // No shift data, set empty state
                setStatus({ shift: null, pay_in: 0, pay_out: 0, cash_sales: 0, current_balance: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch cash status:', error);
            // Set empty state on error
            setStatus({ shift: null, pay_in: 0, pay_out: 0, cash_sales: 0, current_balance: 0 });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await api.getCashHistory();
            if (res && res.data && res.data.shifts) {
                setHistory(res.data.shifts);
            } else {
                setHistory([]);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            setHistory([]);
        }
    };

    const handleOpenShift = async (amount: number, note: string) => {
        try {
            await api.openCashShift(amount, note);
            setShowOpenModal(false);
            fetchStatus();
            fetchHistory();
        } catch (error) {
            alert('Failed to open shift');
        }
    };

    const handleCloseShift = async (amount: number, note: string) => {
        try {
            await api.closeCashShift(amount, note);
            setShowCloseModal(false);
            fetchStatus();
            fetchHistory();
        } catch (error) {
            alert('Failed to close shift');
        }
    };

    const handleTransaction = async (amount: number, reason: string) => {
        if (!showTransactionModal) return;
        try {
            await api.createCashTransaction(showTransactionModal, amount, reason);
            setShowTransactionModal(null);
            fetchStatus();
        } catch (error) {
            alert('Failed to create transaction');
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;

    const currentShift = status?.shift;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <DollarSign className="text-blue-600" />
                    Quản lý Tiền mặt
                </h1>
                <p className="text-slate-500">Quản lý phiên làm việc và dòng tiền tại quầy</p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <div className={`p-6 rounded-2xl border ${currentShift ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Trạng thái</span>
                        {currentShift ? <Unlock size={20} className="text-green-600" /> : <Lock size={20} className="text-slate-400" />}
                    </div>
                    <div className={`text-2xl font-bold ${currentShift ? 'text-green-700' : 'text-slate-700'}`}>
                        {currentShift ? 'Đang mở' : 'Đã đóng'}
                    </div>
                    {currentShift && (
                        <div className="text-xs text-green-600 mt-1">
                            Bắt đầu: {format(new Date(currentShift.started_at), 'HH:mm dd/MM')}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Số dư hiện tại</span>
                        <DollarSign size={20} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                        ¥{(status?.current_balance || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                        Vốn đầu ca: ¥{Number(currentShift?.start_amount || 0).toLocaleString()}
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Doanh thu tiền mặt</span>
                        <TrendingUp size={20} className="text-emerald-600" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">
                        +¥{(status?.cash_sales || 0).toLocaleString()}
                    </div>
                </div>

                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Chi phí (Pay Out)</span>
                        <TrendingDown size={20} className="text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-500">
                        -¥{(status?.pay_out || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                {!currentShift ? (
                    <button
                        onClick={() => setShowOpenModal(true)}
                        className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-lg shadow-green-200"
                    >
                        <Unlock size={20} />
                        Mở Ca Làm Việc
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => setShowCloseModal(true)}
                            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-lg shadow-red-200"
                        >
                            <Lock size={20} />
                            <span className="hidden sm:inline">Đóng Ca & Chốt Tiền</span>
                            <span className="sm:hidden">Đóng Ca</span>
                        </button>
                        <button
                            onClick={() => setShowTransactionModal('pay_in')}
                            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium"
                        >
                            <Plus size={20} className="text-green-600" />
                            <span className="hidden sm:inline">Nạp Tiền (Pay In)</span>
                            <span className="sm:hidden">Nạp Tiền</span>
                        </button>
                        <button
                            onClick={() => setShowTransactionModal('pay_out')}
                            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium"
                        >
                            <Minus size={20} className="text-red-500" />
                            <span className="hidden sm:inline">Rút Tiền (Pay Out)</span>
                            <span className="sm:hidden">Rút Tiền</span>
                        </button>
                    </>
                )}
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">Lịch sử phiên làm việc</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="p-4 font-medium text-slate-500 whitespace-nowrap">Bắt đầu</th>
                                <th className="p-4 font-medium text-slate-500 whitespace-nowrap">Kết thúc</th>
                                <th className="p-4 font-medium text-slate-500 whitespace-nowrap hidden md:table-cell">Nhân viên</th>
                                <th className="p-4 font-medium text-slate-500 text-right whitespace-nowrap">Vốn đầu ca</th>
                                <th className="p-4 font-medium text-slate-500 text-right whitespace-nowrap hidden sm:table-cell">Thực tế</th>
                                <th className="p-4 font-medium text-slate-500 text-right whitespace-nowrap">Chênh lệch</th>
                                <th className="p-4 font-medium text-slate-500 whitespace-nowrap">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.map(shift => (
                                <tr key={shift.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-slate-700 whitespace-nowrap">
                                        {format(new Date(shift.started_at), 'dd/MM HH:mm')}
                                    </td>
                                    <td className="p-4 text-slate-700 whitespace-nowrap">
                                        {shift.ended_at ? format(new Date(shift.ended_at), 'dd/MM HH:mm') : '-'}
                                    </td>
                                    <td className="p-4 text-slate-700 hidden md:table-cell">{shift.user_name || 'Unknown'}</td>
                                    <td className="p-4 text-right font-medium whitespace-nowrap">¥{Number(shift.start_amount).toLocaleString()}</td>
                                    <td className="p-4 text-right font-medium whitespace-nowrap hidden sm:table-cell">
                                        {shift.end_amount ? `¥${Number(shift.end_amount).toLocaleString()}` : '-'}
                                    </td>
                                    <td className={`p-4 text-right font-bold whitespace-nowrap ${Number(shift.difference_amount) < 0 ? 'text-red-500' :
                                        Number(shift.difference_amount) > 0 ? 'text-green-500' : 'text-slate-400'
                                        }`}>
                                        {shift.difference_amount ? `¥${Number(shift.difference_amount).toLocaleString()}` : '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${shift.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {shift.status === 'open' ? 'Opening' : 'Closed'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {(showOpenModal || showCloseModal) && (
                <ShiftModal
                    type={showOpenModal ? 'open' : 'close'}
                    onSubmit={showOpenModal ? handleOpenShift : handleCloseShift}
                    onClose={() => { setShowOpenModal(false); setShowCloseModal(false); }}
                    expectedAmount={status?.current_balance}
                />
            )}

            {showTransactionModal && (
                <TransactionModal
                    type={showTransactionModal}
                    onSubmit={handleTransaction}
                    onClose={() => setShowTransactionModal(null)}
                />
            )}
        </div>
    );
}

function ShiftModal({ type, onSubmit, onClose, expectedAmount }: {
    type: 'open' | 'close';
    onSubmit: (amount: number, note: string) => void;
    onClose: () => void;
    expectedAmount?: number;
}) {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">
                    {type === 'open' ? 'Mở Ca Làm Việc' : 'Chốt Ca & Đóng Quầy'}
                </h3>

                {type === 'close' && expectedAmount !== undefined && (
                    <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-xl">
                        <div className="text-xs font-bold uppercase tracking-wider opacity-70">Số dư dự kiến hệ thống</div>
                        <div className="text-2xl font-bold">¥{expectedAmount.toLocaleString()}</div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {type === 'open' ? 'Số tiền đầu ca' : 'Số tiền thực tế trong két'}
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl"
                            rows={3}
                            placeholder={type === 'open' ? "Ghi chú đầu ca..." : "Lý do chênh lệch (nếu có)..."}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium">Hủy</button>
                    <button
                        onClick={() => onSubmit(Number(amount), note)}
                        className={`px-6 py-2 rounded-xl text-white font-medium ${type === 'open' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {type === 'open' ? 'Bắt đầu' : 'Chốt sổ'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TransactionModal({ type, onSubmit, onClose }: {
    type: 'pay_in' | 'pay_out';
    onSubmit: (amount: number, reason: string) => void;
    onClose: () => void;
}) {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    {type === 'pay_in' ? <Plus className="text-green-600" /> : <Minus className="text-red-600" />}
                    {type === 'pay_in' ? 'Nạp Tiền (Pay In)' : 'Rút Tiền (Pay Out)'}
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                                placeholder="0"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Lý do</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl"
                            placeholder={type === 'pay_in' ? "Tiền lẻ, tiền thối..." : "Mua đá, mua rau, ứng lương..."}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium">Hủy</button>
                    <button
                        onClick={() => onSubmit(Number(amount), reason)}
                        className={`px-6 py-2 rounded-xl text-white font-medium ${type === 'pay_in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}
