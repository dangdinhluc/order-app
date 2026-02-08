import { useState, useEffect } from 'react';
import { Upload, Image, Eye, Printer, Check, Globe, FileText, Sparkles, LayoutTemplate } from 'lucide-react';

interface ReceiptSettingsData {
    template: 'modern' | 'classic' | 'simple';
    languages: string[];
    logo_url: string;
    header_text_vi: string;
    header_text_ja: string;
    footer_text_vi: string;
    footer_text_ja: string;
    show_table_time: boolean;
    show_order_number: boolean;
    show_time_seated: boolean;
    show_staff_name: boolean;
    show_qr_code: boolean;
    print_kitchen_receipt: boolean;
    font_size: 'small' | 'medium' | 'large';
}

interface Props {
    settings?: Partial<ReceiptSettingsData>;
    onChange?: (settings: ReceiptSettingsData) => void;
}

const TEMPLATES = [
    {
        id: 'modern' as const,
        name: 'Modern Minimal',
        desc: 'Gọn gàng, hiện đại',
        icon: '✨'
    },
    {
        id: 'classic' as const,
        name: 'Classic Japanese',
        desc: 'Phong cách Izakaya',
        icon: '🏯'
    },
    {
        id: 'simple' as const,
        name: 'Simple',
        desc: 'Đơn giản, tiết kiệm giấy',
        icon: '📄'
    }
];

const LANGUAGES = [
    { id: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { id: 'ja', name: '日本語', flag: '🇯🇵' },
    { id: 'en', name: 'English', flag: '🇺🇸' }
];

// Sample data for preview
const SAMPLE_ORDER = {
    order_number: '0042',
    table_name: 'VIP-1',
    items: [
        { name_vi: 'Phở bò', name_ja: '牛肉フォー', qty: 2, price: 900 },
        { name_vi: 'Bánh mì', name_ja: 'バインミー', qty: 1, price: 500, note: 'Không hành' }
    ],
    subtotal: 2300,
    discount: 200,
    total: 2100,
    date: new Date().toLocaleString('ja-JP')
};

export default function ReceiptSettings({ settings, onChange }: Props) {
    const [data, setData] = useState<ReceiptSettingsData>({
        template: settings?.template || 'modern',
        languages: settings?.languages || ['vi', 'ja'],
        logo_url: settings?.logo_url || '',
        header_text_vi: settings?.header_text_vi || 'Cảm ơn quý khách!',
        header_text_ja: settings?.header_text_ja || 'ご来店ありがとうございます',
        footer_text_vi: settings?.footer_text_vi || 'Hẹn gặp lại!',
        footer_text_ja: settings?.footer_text_ja || 'またのお越しを！',
        show_table_time: settings?.show_table_time ?? true,
        show_order_number: settings?.show_order_number ?? true,
        show_time_seated: settings?.show_time_seated ?? false,
        show_staff_name: settings?.show_staff_name ?? true,
        show_qr_code: settings?.show_qr_code ?? false,
        print_kitchen_receipt: settings?.print_kitchen_receipt ?? true,
        font_size: settings?.font_size || 'medium'
    });

    useEffect(() => {
        if (onChange) onChange(data);
    }, [data]);

    const handleChange = <K extends keyof ReceiptSettingsData>(key: K, value: ReceiptSettingsData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    };

    const toggleLanguage = (langId: string) => {
        const current = data.languages;
        if (current.includes(langId)) {
            if (current.length > 1) { // Keep at least one language
                handleChange('languages', current.filter(l => l !== langId));
            }
        } else {
            handleChange('languages', [...current, langId]);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-6 md:p-8">
            {/* Settings Panel */}
            <div className="flex-1 space-y-8">
                {/* Template Selector */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <LayoutTemplate className="text-blue-600" size={24} />
                        Chọn mẫu hóa đơn
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {TEMPLATES.map(tpl => (
                            <button
                                key={tpl.id}
                                onClick={() => handleChange('template', tpl.id)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${data.template === tpl.id
                                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                            >
                                <div className="text-2xl mb-2">{tpl.icon}</div>
                                <div className="font-bold text-slate-800 text-sm">{tpl.name}</div>
                                <div className="text-xs text-slate-500">{tpl.desc}</div>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Language Selector */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Globe className="text-purple-600" size={24} />
                        Ngôn ngữ hiển thị
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {LANGUAGES.map(lang => (
                            <button
                                key={lang.id}
                                onClick={() => toggleLanguage(lang.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${data.languages.includes(lang.id)
                                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span className="font-medium">{lang.name}</span>
                                {data.languages.includes(lang.id) && <Check size={16} className="text-purple-600" />}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Logo Upload */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Image className="text-amber-600" size={24} />
                        Logo hóa đơn
                    </h3>
                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                            {data.logo_url ? (
                                <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
                            ) : (
                                <Image className="text-slate-300" size={32} />
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 mb-3">Logo đen trắng hiển thị tốt nhất trên máy in nhiệt</p>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition">
                                <Upload size={18} />
                                Tải ảnh lên
                            </button>
                        </div>
                    </div>
                </section>

                {/* Header/Footer Text */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <FileText className="text-green-600" size={24} />
                        Nội dung Header / Footer
                    </h3>
                    <div className="grid gap-4">
                        {data.languages.includes('vi') && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        🇻🇳 Header (Tiếng Việt)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.header_text_vi}
                                        onChange={e => handleChange('header_text_vi', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        🇻🇳 Footer (Tiếng Việt)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.footer_text_vi}
                                        onChange={e => handleChange('footer_text_vi', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                        {data.languages.includes('ja') && (
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        🇯🇵 Header (日本語)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.header_text_ja}
                                        onChange={e => handleChange('header_text_ja', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        🇯🇵 Footer (日本語)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.footer_text_ja}
                                        onChange={e => handleChange('footer_text_ja', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Display Options */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Sparkles className="text-pink-600" size={24} />
                        Tùy chọn hiển thị
                    </h3>
                    <div className="space-y-3">
                        <Toggle label="Số thứ tự đơn" desc="Hiển thị #Order No" checked={data.show_order_number} onChange={v => handleChange('show_order_number', v)} />
                        <Toggle label="Thời gian ngồi" desc="In thời gian khách tại bàn" checked={data.show_time_seated} onChange={v => handleChange('show_time_seated', v)} />
                        <Toggle label="Tên nhân viên" desc="In tên cashier" checked={data.show_staff_name} onChange={v => handleChange('show_staff_name', v)} />
                        <Toggle label="QR Code" desc="Link Google Review" checked={data.show_qr_code} onChange={v => handleChange('show_qr_code', v)} />
                        <Toggle label="In phiếu bếp tự động" desc="Tự động in khi gửi đơn" checked={data.print_kitchen_receipt} onChange={v => handleChange('print_kitchen_receipt', v)} />
                    </div>
                </section>

                {/* Font Size */}
                <section>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Cỡ chữ</label>
                    <div className="flex gap-3">
                        {(['small', 'medium', 'large'] as const).map(size => (
                            <button
                                key={size}
                                onClick={() => handleChange('font_size', size)}
                                className={`px-5 py-2.5 rounded-xl border-2 font-medium transition ${data.font_size === size
                                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                    }`}
                            >
                                {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn'}
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Live Preview Panel */}
            <div className="lg:w-80 flex-shrink-0">
                <div className="sticky top-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Eye className="text-blue-600" size={24} />
                        Xem trước
                    </h3>
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                        <ReceiptPreview data={data} />
                    </div>
                    <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition">
                        <Printer size={18} />
                        In thử
                    </button>
                </div>
            </div>
        </div>
    );
}

// Toggle Component
function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
                <p className="font-medium text-slate-800">{label}</p>
                <p className="text-sm text-slate-500">{desc}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}

// Receipt Preview Component
function ReceiptPreview({ data }: { data: ReceiptSettingsData }) {
    const showVi = data.languages.includes('vi');
    const showJa = data.languages.includes('ja');

    const fontSizeClass = {
        small: 'text-[10px]',
        medium: 'text-xs',
        large: 'text-sm'
    }[data.font_size];

    return (
        <div className={`p-4 font-mono ${fontSizeClass} bg-white`} style={{ width: '100%', minHeight: '300px' }}>
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
                {data.logo_url && (
                    <img src={data.logo_url} alt="Logo" className="h-8 mx-auto mb-2" />
                )}
                <div className="font-bold text-base">★ GIA VỊ ★</div>
                {showJa && <div className="text-slate-600">ジャビ Vietnamese</div>}
                {data.header_text_vi && showVi && <div className="mt-1 text-slate-600">{data.header_text_vi}</div>}
                {data.header_text_ja && showJa && <div className="text-slate-600">{data.header_text_ja}</div>}
            </div>

            {/* Order Info */}
            <div className="text-slate-600 mb-3 space-y-1">
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{SAMPLE_ORDER.date}</span>
                </div>
                {data.show_order_number && (
                    <div className="flex justify-between">
                        <span>Order:</span>
                        <span>#{SAMPLE_ORDER.order_number}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Table:</span>
                    <span>{SAMPLE_ORDER.table_name}</span>
                </div>
                {data.show_time_seated && (
                    <div className="flex justify-between">
                        <span>Time:</span>
                        <span>2h 15min</span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="border-t border-b border-dashed border-slate-300 py-3 my-3 space-y-2">
                {SAMPLE_ORDER.items.map((item, i) => (
                    <div key={i}>
                        <div className="flex justify-between">
                            <span>
                                {item.qty}x {showVi ? item.name_vi : ''} {showJa ? item.name_ja : ''}
                            </span>
                            <span>¥{(item.qty * item.price).toLocaleString()}</span>
                        </div>
                        {item.note && (
                            <div className="text-slate-400 text-[9px] pl-4">※ {item.note}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                    <span>{showJa ? '小計 Subtotal' : 'Subtotal'}:</span>
                    <span>¥{SAMPLE_ORDER.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                    <span>{showJa ? '割引 Discount' : 'Discount'}:</span>
                    <span>-¥{SAMPLE_ORDER.discount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t-2 border-b-2 border-slate-800 py-2 my-2">
                    <span>TOTAL {showJa && '合計'}:</span>
                    <span>¥{SAMPLE_ORDER.total.toLocaleString()}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-4 text-slate-500">
                {data.footer_text_vi && showVi && <div>{data.footer_text_vi}</div>}
                {data.footer_text_ja && showJa && <div>{data.footer_text_ja}</div>}
                {data.show_qr_code && (
                    <div className="mt-3 flex justify-center">
                        <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[8px] text-slate-400">
                            QR CODE
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
