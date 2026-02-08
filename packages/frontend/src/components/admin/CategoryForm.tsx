import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Category, Language } from '../../services/api';
import { X } from 'lucide-react';

interface CategoryFormProps {
    initialData?: Category;
    onSubmit: (data: Partial<Category>) => Promise<void>;
    onCancel: () => void;
}

export default function CategoryForm({ initialData, onSubmit, onCancel }: CategoryFormProps) {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [activeLang, setActiveLang] = useState('vi');
    const [formData, setFormData] = useState<Partial<Category>>({
        name_vi: '',
        name_ja: '',
        name_en: '',
        sort_order: 0,
        name_translations: {},
        ...initialData
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadLanguages();
    }, []);

    const loadLanguages = async () => {
        try {
            const res = await api.getLanguages();
            if (res.data) setLanguages(res.data.languages.filter(l => l.is_active));
        } catch (error) {
            console.error('Failed to load languages', error);
        }
    };

    const handleNameChange = (value: string) => {
        const translations = { ...formData.name_translations };
        translations[activeLang] = value;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {
            name_translations: translations
        };

        if (activeLang === 'vi') updates.name_vi = value;
        if (activeLang === 'en') updates.name_en = value;
        if (activeLang === 'ja') updates.name_ja = value;

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const getNameValue = () => {
        return formData.name_translations?.[activeLang] || (activeLang === 'vi' ? formData.name_vi : '') || '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                    {initialData ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục Mới'}
                </h2>
                <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Language Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            type="button"
                            onClick={() => setActiveLang(lang.code)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg font-medium transition-colors text-sm relative top-[1px] ${activeLang === lang.code
                                ? 'bg-white text-blue-600 border border-b-white border-slate-200'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-transparent'
                                }`}
                        >
                            <span className="text-base">{lang.flag_icon}</span>
                            {lang.name}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Tên danh mục ({languages.find(l => l.code === activeLang)?.name}) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={getNameValue()}
                            onChange={e => handleNameChange(e.target.value)}
                            placeholder="Ví dụ: Món Chính"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Thứ tự</label>
                        <input
                            type="number"
                            className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.sort_order}
                            onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm border bg-white rounded-lg hover:bg-slate-50 font-medium text-slate-600"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {initialData ? 'Lưu thay đổi' : 'Thêm mới'}
                    </button>
                </div>
            </form>
        </div>
    );
}
