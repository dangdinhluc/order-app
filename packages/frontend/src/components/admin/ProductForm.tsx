import { useState, useEffect } from 'react';
import type { Product, Category, Badge, Station, Language } from '../../services/api';
import { api } from '../../services/api';
import { X, Tag, ChefHat } from 'lucide-react';

interface ProductFormProps {
    initialData?: Product;
    categories: Category[];
    badges: Badge[];
    stations: Station[];
    onSubmit: (data: Partial<Product>) => Promise<void>;
    onCancel: () => void;
}

export default function ProductForm({ initialData, categories, badges, stations, onSubmit, onCancel }: ProductFormProps) {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [activeLang, setActiveLang] = useState('vi');
    const [formData, setFormData] = useState<Partial<Product>>({
        name_vi: '',
        name_ja: '',
        name_en: '',
        price: 0,
        category_id: '',
        is_available: true,
        display_in_kitchen: true,
        display_in_menu: true,
        display_in_pos: true,
        display_in_kiosk: true,
        is_best_seller: false,
        is_chef_choice: false,
        is_combo: false,
        badge_ids: [],
        station_ids: [],
        name_translations: {},
        description_translations: {},
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

    const handleTranslationChange = (field: 'name' | 'description', value: string) => {
        const translations = field === 'name' ? { ...formData.name_translations } : { ...formData.description_translations };
        translations[activeLang] = value;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {
            [`${field}_translations`]: translations
        };

        // If editing in default/legacy languages, also update the specific fields
        if (field === 'name') {
            if (activeLang === 'vi') updates.name_vi = value;
            if (activeLang === 'en') updates.name_en = value;
            if (activeLang === 'ja') updates.name_ja = value;
        }

        setFormData(prev => ({ ...prev, ...updates }));
    };

    const getValue = (field: 'name' | 'description') => {
        const translations = field === 'name' ? formData.name_translations : formData.description_translations;
        return translations?.[activeLang] || (field === 'name' && activeLang === 'vi' ? formData.name_vi : '') || '';
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="flex-none px-6 py-4 bg-white border-b flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {initialData ? 'Chỉnh sửa món' : 'Thêm món mới'}
                    </h2>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Language Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                            {languages.map(lang => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => setActiveLang(lang.code)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors relative top-[1px] ${activeLang === lang.code
                                        ? 'bg-white text-blue-600 border border-b-white border-slate-200'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-transparent'
                                        }`}
                                >
                                    <span className="text-lg">{lang.flag_icon}</span>
                                    {lang.name}
                                </button>
                            ))}
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Tên món ({languages.find(l => l.code === activeLang)?.name}) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={getValue('name')}
                                        onChange={e => handleTranslationChange('name', e.target.value)}
                                        placeholder={`Nhập tên món (${activeLang})`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                                        Mô tả ({languages.find(l => l.code === activeLang)?.name})
                                    </label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        value={getValue('description')}
                                        onChange={e => handleTranslationChange('description', e.target.value)}
                                        placeholder={`Nhập mô tả món ăn (${activeLang})`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Price & Category - Shared across languages */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Giá bán <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        className="w-full pl-4 pr-12 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                    <span className="absolute right-4 top-2.5 text-slate-400 font-medium">đ</span>
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Danh mục <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    value={formData.category_id}
                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name_vi}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Settings Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Badges */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 font-bold text-slate-700">
                                    <Tag size={18} className="text-rose-500" />
                                    <h3>Nhãn (Badges)</h3>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {badges.map(badge => {
                                        const isSelected = formData.badge_ids?.includes(badge.id);
                                        return (
                                            <button
                                                key={badge.id}
                                                type="button"
                                                onClick={() => {
                                                    const currentIds = formData.badge_ids || [];
                                                    const newIds = isSelected
                                                        ? currentIds.filter(id => id !== badge.id)
                                                        : [...currentIds, badge.id];
                                                    setFormData({ ...formData, badge_ids: newIds });
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${isSelected
                                                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                    }`}
                                            >
                                                {badge.name_vi}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Kitchen Stations */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold text-slate-700">
                                        <ChefHat size={18} className="text-orange-500" />
                                        <h3>Bếp (KDS)</h3>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <span className="text-xs text-slate-500">In bếp?</span>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-sm toggle-success"
                                            checked={formData.display_in_kitchen}
                                            onChange={e => setFormData({ ...formData, display_in_kitchen: e.target.checked })}
                                        />
                                    </label>
                                </div>

                                {formData.display_in_kitchen && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {stations.map(station => {
                                            const isSelected = formData.station_ids?.includes(station.id);
                                            return (
                                                <button
                                                    key={station.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const currentIds = formData.station_ids || [];
                                                        const newIds = isSelected
                                                            ? currentIds.filter(id => id !== station.id)
                                                            : [...currentIds, station.id];
                                                        setFormData({ ...formData, station_ids: newIds });
                                                    }}
                                                    className={`p-2 rounded-lg text-xs font-bold border text-left transition-all ${isSelected
                                                        ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {station.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Special Flags */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm md:col-span-2 flex flex-wrap gap-4">
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_available}
                                        onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Đang bán (Available)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_best_seller}
                                        onChange={e => setFormData({ ...formData, is_best_seller: e.target.checked })}
                                        className="w-5 h-5 rounded text-yellow-500 focus:ring-yellow-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Best Seller</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_chef_choice}
                                        onChange={e => setFormData({ ...formData, is_chef_choice: e.target.checked })}
                                        className="w-5 h-5 rounded text-rose-500 focus:ring-rose-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Chef Choice</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_combo}
                                        onChange={e => setFormData({ ...formData, is_combo: e.target.checked })}
                                        className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Là Combo/Set</span>
                                </label>
                                <div className="w-full h-px bg-slate-100 my-2 md:col-span-2"></div>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.display_in_menu !== false}
                                        onChange={e => setFormData({ ...formData, display_in_menu: e.target.checked })}
                                        className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Hiện Menu Khách</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.display_in_pos !== false}
                                        onChange={e => setFormData({ ...formData, display_in_pos: e.target.checked })}
                                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Hiện trên POS</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer p-2 border rounded-lg hover:bg-slate-50 transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.display_in_kiosk !== false}
                                        onChange={e => setFormData({ ...formData, display_in_kiosk: e.target.checked })}
                                        className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">Hiện Kiosk</span>
                                </label>
                            </div>

                        </div>
                    </form>
                </div>

                <div className="flex-none bg-white border-t px-6 py-4 flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition flex justify-center items-center"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2"
                    >
                        {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {initialData ? 'Lưu thay đổi' : 'Xác nhận tạo món'}
                    </button>
                </div>
            </div>
        </div>
    );
}
