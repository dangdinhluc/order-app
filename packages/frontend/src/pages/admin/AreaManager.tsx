import { useState, useEffect } from 'react';
import { api, type Area } from '../../services/api';
import {
    Plus, Edit2, Trash2, X, Check,
    Map, Layers, ArrowUp, ArrowDown
} from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

const COLORS = [
    { name: 'blue', hex: '#3B82F6', bg: 'bg-blue-500', label: 'Xanh dương' },
    { name: 'purple', hex: '#8B5CF6', bg: 'bg-purple-500', label: 'Tím' },
    { name: 'green', hex: '#10B981', bg: 'bg-emerald-500', label: 'Xanh lá' },
    { name: 'orange', hex: '#F97316', bg: 'bg-orange-500', label: 'Cam' },
    { name: 'red', hex: '#EF4444', bg: 'bg-red-500', label: 'Đỏ' },
    { name: 'slate', hex: '#64748B', bg: 'bg-slate-500', label: 'Xám' },
];

export default function AreaManager() {
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Area>>({
        name: '',
        name_vi: '',
        name_ja: '',
        color: 'blue',
        sort_order: 0,
        is_active: true,
    });
    const [deleteAreaId, setDeleteAreaId] = useState<string | null>(null);

    useEffect(() => {
        loadAreas();
    }, []);

    const loadAreas = async () => {
        try {
            setIsLoading(true);
            const res = await api.getAreas();
            if (res.data?.areas) {
                setAreas(res.data.areas);
            }
        } catch (error) {
            console.error('Failed to load areas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = () => {
        setFormData({
            name: '',
            name_vi: '',
            name_ja: '',
            color: 'blue',
            sort_order: areas.length + 1,
            is_active: true,
        });
        setEditingId(null);
        setIsEditing(true);
    };

    const handleEdit = (area: Area) => {
        setFormData({ ...area });
        setEditingId(area.id);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        setDeleteAreaId(id);
    };

    const confirmDeleteArea = async () => {
        if (!deleteAreaId) return;
        try {
            await api.deleteArea(deleteAreaId);
            loadAreas();
        } catch (error) {
            console.error('Failed to delete area:', error);
            alert('Không thể xóa khu vực này.');
        } finally {
            setDeleteAreaId(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Default internal name to name_vi if empty, ensure string
            const dataToSave = {
                ...formData,
                name: formData.name || formData.name_vi || 'Khu vực'
            };

            if (editingId) {
                await api.updateArea(editingId, dataToSave);
            } else {
                await api.createArea(dataToSave as any);
            }
            setIsEditing(false);
            loadAreas();
        } catch (error) {
            console.error('Failed to save area:', error);
            alert('Lỗi khi lưu khu vực.');
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Đang tải...</div>;
    }

    return (
        <div className="space-y-6 p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Map size={24} className="text-blue-600" />
                        Quản lý khu vực
                    </h3>
                    <p className="text-slate-500">Phân chia khu vực bàn ăn (Tầng 1, Tầng 2, Sân vườn...)</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200"
                >
                    <Plus size={20} />
                    Thêm khu vực
                </button>
            </div>

            <div className="grid gap-4">
                {areas.map((area) => (
                    <div
                        key={area.id}
                        className={`flex items-center justify-between p-4 bg-white border rounded-xl transition-all ${!area.is_active ? 'opacity-60 bg-slate-50' : 'hover:shadow-md border-slate-200'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm bg-${area.color}-500`}>
                                <Layers size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    {area.name_vi || area.name}
                                    {!area.is_active && (
                                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-500 rounded-full font-normal">
                                            Đã ẩn
                                        </span>
                                    )}
                                </h4>
                                {area.name_ja && <p className="text-sm text-slate-500">{area.name_ja}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1 rounded-lg">
                                <span>Thứ tự:</span>
                                <span className="font-bold text-slate-700">{area.sort_order}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(area)}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(area.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {areas.length === 0 && (
                    <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                        <Map size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="font-medium">Chưa có khu vực nào</p>
                        <p className="text-sm mt-1">Hãy tạo khu vực đầu tiên để bắt đầu quản lý bàn</p>
                    </div>
                )}
            </div>

            {/* Edit/Add Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingId ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}
                            </h3>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Tên khu vực (Tiếng Việt)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name_vi}
                                    onChange={e => setFormData({ ...formData, name_vi: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    placeholder="VD: Tầng 1, Sân vườn..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên tiếng Nhật (Tùy chọn)</label>
                                <input
                                    type="text"
                                    value={formData.name_ja}
                                    onChange={e => setFormData({ ...formData, name_ja: e.target.value })}
                                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="VD: 1階, 庭..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Màu đại diện</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {COLORS.map(c => (
                                        <button
                                            type="button"
                                            key={c.name}
                                            onClick={() => setFormData({ ...formData, color: c.name })}
                                            className={`h-10 rounded-lg ${c.bg} shadow-sm transition-all hover:scale-105 flex items-center justify-center ${formData.color === c.name ? 'ring-2 ring-offset-2 ring-slate-400 ring-offset-white scale-105' : 'opacity-80 hover:opacity-100'
                                                }`}
                                            title={c.label}
                                        >
                                            {formData.color === c.name && <Check size={16} className="text-white font-bold" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Thứ tự hiển thị</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.sort_order}
                                            onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                                            <ArrowUp size={12} className="text-slate-400 cursor-pointer hover:text-blue-600" onClick={() => setFormData(p => ({ ...p, sort_order: (p.sort_order || 0) + 1 }))} />
                                            <ArrowDown size={12} className="text-slate-400 cursor-pointer hover:text-blue-600" onClick={() => setFormData(p => ({ ...p, sort_order: (p.sort_order || 0) - 1 }))} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Đang hoạt động</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-medium"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200"
                                >
                                    {editingId ? 'Cập nhật' : 'Tạo khu vực'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Area Confirmation */}
            <ConfirmModal
                isOpen={!!deleteAreaId}
                title="Xóa khu vực"
                message="Bạn có chắc chắn muốn xóa khu vực này?"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDeleteArea}
                onCancel={() => setDeleteAreaId(null)}
            />
        </div>
    );
}
