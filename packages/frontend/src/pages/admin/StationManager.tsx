import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChefHat, Wine, X, GripVertical, Check } from 'lucide-react';
import { api, type Station } from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

// Predefined colors for quick selection
const STATION_COLORS = [
    '#EF4444', // Red - Hot Kitchen
    '#F97316', // Orange
    '#EAB308', // Yellow
    '#22C55E', // Green
    '#3B82F6', // Blue - Bar
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
];

// Predefined icons
const STATION_ICONS = [
    { id: 'chef-hat', icon: ChefHat, label: 'Bếp' },
    { id: 'wine', icon: Wine, label: 'Bar' },
];

interface StationFormData {
    name: string;
    code: string;
    color: string;
    icon: string;
    is_active: boolean;
    sort_order: number;
}

const defaultFormData: StationFormData = {
    name: '',
    code: '',
    color: '#EF4444',
    icon: 'chef-hat',
    is_active: true,
    sort_order: 0,
};

export default function StationManager() {
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<Station | null>(null);
    const [formData, setFormData] = useState<StationFormData>(defaultFormData);
    const [deleteStationId, setDeleteStationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStations();
    }, []);

    const loadStations = async () => {
        try {
            setLoading(true);
            const response = await api.getStations();
            setStations(response.data?.stations || []);
        } catch (err) {
            console.error('Failed to load stations:', err);
            setError('Không thể tải danh sách bếp/bar');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingStation(null);
        setFormData({
            ...defaultFormData,
            sort_order: stations.length + 1,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (station: Station) => {
        setEditingStation(station);
        setFormData({
            name: station.name,
            code: station.code,
            color: station.color,
            icon: station.icon,
            is_active: station.is_active,
            sort_order: station.sort_order,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            if (editingStation) {
                await api.updateStation(editingStation.id, formData);
            } else {
                await api.createStation(formData);
            }
            setIsModalOpen(false);
            loadStations();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra');
        }
    };

    const handleDelete = (id: string) => {
        setDeleteStationId(id);
    };

    const confirmDelete = async () => {
        if (!deleteStationId) return;
        try {
            await api.deleteStation(deleteStationId);
            loadStations();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message || 'Không thể xóa station');
        } finally {
            setDeleteStationId(null);
        }
    };

    // Generate code from name
    const generateCode = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
            .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
            .replace(/[ìíịỉĩ]/g, 'i')
            .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
            .replace(/[ùúụủũưừứựửữ]/g, 'u')
            .replace(/[ỳýỵỷỹ]/g, 'y')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Quản lý Bếp/Bar</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Tạo các trạm chế biến (bếp, bar) để phân loại món khi gửi vào KDS
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={20} />
                    <span>Thêm Station</span>
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Stations List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {stations.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <ChefHat size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Chưa có station nào</p>
                        <p className="text-sm mt-1">Tạo station đầu tiên để bắt đầu</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {stations.map((station) => (
                            <div
                                key={station.id}
                                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition"
                            >
                                {/* Drag Handle */}
                                <div className="text-slate-300 cursor-grab">
                                    <GripVertical size={20} />
                                </div>

                                {/* Color & Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: station.color + '20' }}
                                >
                                    {station.icon === 'wine' ? (
                                        <Wine size={24} style={{ color: station.color }} />
                                    ) : (
                                        <ChefHat size={24} style={{ color: station.color }} />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800">{station.name}</span>
                                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                                            {station.code}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded ${station.is_active
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-500'
                                                }`}
                                        >
                                            {station.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => openEditModal(station)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(station.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold">
                                {editingStation ? 'Sửa Station' : 'Thêm Station'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Tên Station
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setFormData({
                                            ...formData,
                                            name,
                                            code: editingStation ? formData.code : generateCode(name),
                                        });
                                    }}
                                    placeholder="Ví dụ: Bếp Nóng, Bar, Bếp Lạnh..."
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Code */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Mã Station (URL)
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="bep_nong"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Dùng cho URL: /kitchen/{formData.code || 'code'}
                                </p>
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Màu sắc
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {STATION_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-8 h-8 rounded-lg transition ${formData.color === color
                                                ? 'ring-2 ring-offset-2 ring-slate-400'
                                                : ''
                                                }`}
                                            style={{ backgroundColor: color }}
                                        >
                                            {formData.color === color && (
                                                <Check size={16} className="text-white mx-auto" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Icon */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Icon
                                </label>
                                <div className="flex gap-2">
                                    {STATION_ICONS.map(({ id, icon: Icon, label }) => (
                                        <button
                                            key={id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, icon: id })}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${formData.icon === id
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <Icon size={20} />
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Active */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded text-blue-600"
                                />
                                <label htmlFor="is_active" className="text-sm text-slate-700">
                                    Đang hoạt động
                                </label>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    {editingStation ? 'Lưu thay đổi' : 'Thêm Station'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteStationId}
                title="Xóa Station"
                message="Bạn có chắc muốn xóa station này? Các sản phẩm đang gán vào station này cần được gỡ trước."
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteStationId(null)}
            />
        </div>
    );
}
