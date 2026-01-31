import { useState, useEffect } from 'react';
import { api, type PaymentMethod } from '../../../services/api';
import {
    Plus, Edit2, Trash2, X, Check,
    Banknote, CreditCard, Smartphone, Wallet, QrCode, Coins, DollarSign
} from 'lucide-react';
import ConfirmModal from '../../../components/ConfirmModal';

const ICONS = [
    { name: 'banknote', icon: Banknote, label: 'Tiền mặt' },
    { name: 'credit-card', icon: CreditCard, label: 'Thẻ tín dụng' },
    { name: 'smartphone', icon: Smartphone, label: 'Điện thoại/App' },
    { name: 'wallet', icon: Wallet, label: 'Ví điện tử' },
    { name: 'qr-code', icon: QrCode, label: 'QR Code' },
    { name: 'coins', icon: Coins, label: 'Xu/Tiền lẻ' },
    { name: 'dollar-sign', icon: DollarSign, label: 'Tiền tệ' },
];

const COLORS = [
    { name: 'emerald', hex: '#10B981', bg: 'bg-emerald-500' },
    { name: 'blue', hex: '#3B82F6', bg: 'bg-blue-500' },
    { name: 'red', hex: '#EF4444', bg: 'bg-red-500' },
    { name: 'orange', hex: '#F97316', bg: 'bg-orange-500' },
    { name: 'purple', hex: '#8B5CF6', bg: 'bg-purple-500' },
    { name: 'pink', hex: '#EC4899', bg: 'bg-pink-500' },
    { name: 'slate', hex: '#64748B', bg: 'bg-slate-500' },
];

export default function PaymentMethodsManager() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<PaymentMethod>>({
        name: '',
        code: '',
        icon: 'banknote',
        color: '#10B981',
        is_active: true,
        requires_change: false,
        sort_order: 0,
    });
    const [deleteMethodId, setDeleteMethodId] = useState<string | null>(null);

    useEffect(() => {
        loadMethods();
    }, []);

    const loadMethods = async () => {
        try {
            setIsLoading(true);
            const res = await api.getAllPaymentMethods();
            if (res.data?.payment_methods) {
                setMethods(res.data.payment_methods);
            }
        } catch (error) {
            console.error('Failed to load payment methods:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = () => {
        setFormData({
            name: '',
            code: '',
            icon: 'banknote',
            color: '#10B981',
            is_active: true,
            requires_change: false,
            sort_order: methods.length + 1,
        });
        setEditingId(null);
        setIsEditing(true);
    };

    const handleEdit = (method: PaymentMethod) => {
        setFormData({ ...method });
        setEditingId(method.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        setDeleteMethodId(id);
    };

    const confirmDeleteMethod = async () => {
        if (!deleteMethodId) return;
        try {
            await api.deletePaymentMethod(deleteMethodId);
            loadMethods();
        } catch (error) {
            console.error('Failed to delete payment method:', error);
            alert('Không thể xóa phương thức thanh toán này.');
        } finally {
            setDeleteMethodId(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.updatePaymentMethod(editingId, formData);
            } else {
                await api.createPaymentMethod(formData);
            }
            setIsEditing(false);
            loadMethods();
        } catch (error) {
            console.error('Failed to save payment method:', error);
            alert('Lỗi khi lưu phương thức thanh toán. Mã code phải là duy nhất.');
        }
    };

    const getIconComponent = (name?: string) => {
        const iconDef = ICONS.find(i => i.name === name);
        return iconDef ? iconDef.icon : Banknote;
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <CreditCard size={20} className="text-blue-600" />
                    Phương thức thanh toán
                </h3>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Thêm mới
                </button>
            </div>

            <div className="grid gap-4">
                {methods.map((method) => {
                    const Icon = getIconComponent(method.icon);
                    return (
                        <div
                            key={method.id}
                            className={`flex items-center justify-between p-4 bg-white border rounded-xl transition-all ${!method.is_active ? 'opacity-60 bg-slate-50' : 'hover:shadow-md border-slate-200'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                                    style={{ backgroundColor: method.color || '#64748B' }}
                                >
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        {method.name}
                                        {!method.is_active && (
                                            <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full">
                                                Đã ẩn
                                            </span>
                                        )}
                                    </h4>
                                    <p className="text-sm text-slate-500 font-mono">Code: {method.code}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {method.requires_change && (
                                    <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium border border-amber-100">
                                        Tính tiền thừa
                                    </div>
                                )}
                                <div className="text-sm text-slate-400">
                                    Thứ tự: {method.sort_order}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(method)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(method.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {methods.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                        Chưa có phương thức thanh toán nào
                    </div>
                )}
            </div>

            {/* Edit/Add Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingId ? 'Chỉnh sửa phương thức' : 'Thêm phương thức mới'}
                            </h3>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên hiển thị</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Ví dụ: Tiền mặt"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã (Code)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        placeholder="cash, visa..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Chọn màu sắc</label>
                                <div className="flex flex-wrap gap-3">
                                    {COLORS.map(c => (
                                        <button
                                            type="button"
                                            key={c.name}
                                            onClick={() => setFormData({ ...formData, color: c.hex })}
                                            className={`w-8 h-8 rounded-full ${c.bg} shadow-sm transition-transform hover:scale-110 flex items-center justify-center ${formData.color === c.hex ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                                                }`}
                                        >
                                            {formData.color === c.hex && <Check size={14} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Chọn biểu tượng</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {ICONS.map(icon => (
                                        <button
                                            type="button"
                                            key={icon.name}
                                            onClick={() => setFormData({ ...formData, icon: icon.name })}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition ${formData.icon === icon.name
                                                ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                                }`}
                                        >
                                            <icon.icon size={20} />
                                            <span className="text-[10px]">{icon.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự hiển thị</label>
                                    <input
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Kích hoạt</span>
                                    </label>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.requires_change}
                                        onChange={e => setFormData({ ...formData, requires_change: e.target.checked })}
                                        className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-slate-800">Yêu cầu tính tiền thừa</span>
                                        <p className="text-xs text-slate-500">Bật tùy chọn này nếu cần nhập số tiền khách đưa (VD: Tiền mặt)</p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200"
                                >
                                    {editingId ? 'Cập nhật' : 'Tạo mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Payment Method Confirmation */}
            <ConfirmModal
                isOpen={!!deleteMethodId}
                title="Xóa phương thức thanh toán"
                message="Bạn có chắc chắn muốn xóa phương thức thanh toán này?"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDeleteMethod}
                onCancel={() => setDeleteMethodId(null)}
            />
        </div>
    );
}
