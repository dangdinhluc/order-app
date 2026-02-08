import { useState, useEffect } from 'react';
import { api, type Language } from '../../../../services/api';
import { Plus, Globe, Check, X, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LanguageSettings() {
    const [languages, setLanguages] = useState<Language[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newLang, setNewLang] = useState({ code: '', name: '', flag_icon: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadLanguages();
    }, []);

    const loadLanguages = async () => {
        try {
            const res = await api.getLanguages();
            if (res.data) setLanguages(res.data.languages);
        } catch (error) {
            console.error('Failed to load languages', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (lang: Language) => {
        if (lang.is_default) return; // Cannot disable default
        try {
            await api.updateLanguage(lang.code, { is_active: !lang.is_active });
            loadLanguages();
        } catch (error) {
            console.error('Failed to toggle language', error);
            alert('Lỗi cập nhật ngôn ngữ');
        }
    };

    const handleAddLanguage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createLanguage(newLang);
            setNewLang({ code: '', name: '', flag_icon: '' });
            setIsAdding(false);
            loadLanguages();
        } catch (error) {
            console.error('Failed to add language', error);
            alert('Lỗi thêm ngôn ngữ');
        } finally {
            setSaving(false);
        }
    };

    const predefinedLanguages = [
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'ko', name: '한국어', flag: '🇰🇷' },
        { code: 'zh', name: '中文', flag: '🇨🇳' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' },
        { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    ];

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Globe className="text-blue-600" size={20} />
                        Quản lý Ngôn ngữ
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Cấu hình các ngôn ngữ hiển thị trên Menu khách hàng
                    </p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Thêm Ngôn ngữ
                    </button>
                )}
            </div>

            {/* Add New Language Form */}
            {isAdding && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100"
                >
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-slate-800">Thêm ngôn ngữ mới</h3>
                        <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Predefined Suggestions */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {predefinedLanguages.map(l => {
                            const exists = languages.some(existing => existing.code === l.code);
                            if (exists) return null;
                            return (
                                <button
                                    key={l.code}
                                    onClick={() => setNewLang({ code: l.code, name: l.name, flag_icon: l.flag })}
                                    className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-50 transition flex items-center gap-2 text-slate-700"
                                >
                                    <span>{l.flag}</span>
                                    <span>{l.name}</span>
                                </button>
                            );
                        })}
                    </div>

                    <form onSubmit={handleAddLanguage} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Mã (ISO)</label>
                            <input
                                required
                                placeholder="vi, en, ja..."
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newLang.code}
                                onChange={e => setNewLang({ ...newLang, code: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Tên hiển thị</label>
                            <input
                                required
                                placeholder="Tiếng Việt, English..."
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newLang.name}
                                onChange={e => setNewLang({ ...newLang, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Icon cờ</label>
                            <input
                                placeholder="🇻🇳"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newLang.flag_icon}
                                onChange={e => setNewLang({ ...newLang, flag_icon: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-4 flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                            >
                                {saving ? 'Đang lưu...' : 'Thêm mới'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            {/* Language List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-slate-600 w-16">Icon</th>
                            <th className="p-4 font-semibold text-slate-600">Tên ngôn ngữ</th>
                            <th className="p-4 font-semibold text-slate-600 w-24 text-center">Mã</th>
                            <th className="p-4 font-semibold text-slate-600 w-32 text-center">Trạng thái</th>
                            <th className="p-4 font-semibold text-slate-600 w-24 text-right">Mặc định</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {languages.map(lang => (
                            <tr key={lang.code} className="hover:bg-slate-50">
                                <td className="p-4 text-2xl">{lang.flag_icon}</td>
                                <td className="p-4 font-medium text-slate-800">{lang.name}</td>
                                <td className="p-4 text-center text-slate-500 font-mono text-sm uppercase bg-slate-100 rounded mx-auto w-fit px-2 py-0.5 mt-2 md:mt-0 inline-block">{lang.code}</td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => handleToggleActive(lang)}
                                        disabled={lang.is_default}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${lang.is_active ? 'bg-blue-600' : 'bg-slate-200'} ${lang.is_default ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                    >
                                        <span
                                            className={`${lang.is_active ? 'translate-x-6' : 'translate-x-1'
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                                        />
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    {lang.is_default ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                            <Check size={12} /> Default
                                        </span>
                                    ) : (
                                        <button className="text-slate-300 hover:text-slate-400" title="Đặt làm mặc định (Chưa hỗ trợ)">
                                            <span className="w-4 h-4 rounded-full border-2 border-slate-300 block"></span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-start gap-3">
                <ShieldAlert className="text-orange-500 shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="font-bold text-orange-800 text-sm">Lưu ý quan trọng</h4>
                    <p className="text-sm text-orange-700 mt-1">
                        Ngôn ngữ mặc định (Tiếng Việt) không thể tắt. Khi thêm ngôn ngữ mới, bạn cần nhập bản dịch cho tên và mô tả món ăn trong trang "Quản lý Thực đơn".
                    </p>
                </div>
            </div>
        </div>
    );
}
