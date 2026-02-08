import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Category } from '../../services/api';
import { X, Pencil, Trash2, Plus } from 'lucide-react';
import CategoryForm from './CategoryForm';
import ConfirmModal from '../ConfirmModal';

interface CategoryManagerProps {
    onClose: () => void;
}

export default function CategoryManager({ onClose }: CategoryManagerProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await api.getCategories();
            if (res.data) setCategories(res.data.categories);
        } catch (error) {
            console.error('Failed to load categories', error);
        }
    };

    const handleSave = async (data: Partial<Category>) => {
        try {
            if (editingCategory) {
                await api.updateCategory(editingCategory.id, data);
            } else {
                await api.createCategory(data);
            }
            await loadCategories();
            setView('list');
            setEditingCategory(null);
        } catch (error) {
            console.error('Failed to save category', error);
            alert('Lỗi lưu danh mục');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteCategory(deleteId);
            await loadCategories();
        } catch (error) {
            alert('Lỗi xóa danh mục');
        } finally {
            setDeleteId(null);
        }
    };

    if (view === 'form') {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="w-full max-w-2xl text-left">
                    {/* Reuse the CategoryForm component which is now just a block */}
                    <CategoryForm
                        initialData={editingCategory || undefined}
                        onSubmit={handleSave}
                        onCancel={() => {
                            setView('list');
                            setEditingCategory(null);
                        }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-none">
                    <h2 className="text-xl font-bold text-slate-800">Quản lý Danh mục</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex justify-between items-center mb-4 flex-none">
                    <p className="text-sm text-slate-500">Quản lý các danh mục món ăn</p>
                    <button
                        onClick={() => {
                            setEditingCategory(null);
                            setView('form');
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                        <Plus size={16} />
                        Thêm danh mục
                    </button>
                </div>

                <div className="border rounded-lg overflow-hidden flex-1 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-semibold sticky top-0">
                            <tr>
                                <th className="p-3">Tên danh mục</th>
                                <th className="p-3 w-20 text-center">Thứ tự</th>
                                <th className="p-3 w-24 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-700">{cat.name_vi}</td>
                                    <td className="p-3 text-center text-slate-500">{cat.sort_order}</td>
                                    <td className="p-3 text-right space-x-2">
                                        <button
                                            onClick={() => {
                                                setEditingCategory(cat);
                                                setView('form');
                                            }}
                                            className="text-blue-600 hover:text-blue-800 p-1"
                                            title="Sửa"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => setDeleteId(cat.id)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                            title="Xóa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-400">
                                        Chưa có danh mục nào
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!deleteId}
                title="Xóa danh mục"
                message="Bạn có chắc muốn xóa danh mục này?"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
