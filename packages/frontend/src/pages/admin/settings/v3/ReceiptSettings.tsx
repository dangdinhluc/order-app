import { Receipt, Upload, Image } from 'lucide-react';

interface ReceiptSettings {
    logo_url: string;
    header_text: string;
    footer_text: string;
    show_table_time: boolean;
    show_order_number: boolean;
    print_kitchen_receipt: boolean;
    font_size: 'small' | 'medium' | 'large';
}

interface Props {
    settings?: ReceiptSettings;
    onChange?: (settings: ReceiptSettings) => void;
}

export default function ReceiptSettings({ settings, onChange }: Props) {
    const data = settings || {
        logo_url: '',
        header_text: 'Cảm ơn quý khách!',
        footer_text: 'Hẹn gặp lại!',
        show_table_time: true,
        show_order_number: true,
        print_kitchen_receipt: true,
        font_size: 'medium',
    };

    const handleChange = (key: keyof ReceiptSettings, value: any) => {
        if (onChange) onChange({ ...data, [key]: value });
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Receipt className="text-blue-600" size={24} />
                    Thiết kế hóa đơn
                </h3>
                <p className="text-slate-500">Tùy chỉnh nội dung và bố cục hóa đơn in ra</p>
            </div>

            {/* Logo Upload */}
            <div className="flex items-start gap-6">
                <div className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                    {data.logo_url ? (
                        <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain rounded-2xl" />
                    ) : (
                        <Image className="text-slate-300" size={40} />
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Logo hóa đơn</label>
                    <p className="text-sm text-slate-500 mb-4">Logo đen trắng sẽ hiển thị tốt nhất trên máy in nhiệt.</p>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition">
                        <Upload size={18} />
                        Tải ảnh lên
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Header (Đầu trang)</label>
                    <textarea
                        rows={3}
                        value={data.header_text}
                        onChange={(e) => handleChange('header_text', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Footer (Chân trang)</label>
                    <textarea
                        rows={3}
                        value={data.footer_text}
                        onChange={(e) => handleChange('footer_text', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Cỡ chữ</label>
                <div className="flex gap-4">
                    {['small', 'medium', 'large'].map((size) => (
                        <button
                            key={size}
                            onClick={() => handleChange('font_size', size)}
                            className={`px-6 py-3 rounded-xl border-2 font-medium transition ${data.font_size === size
                                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                                }`}
                        >
                            {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
                <Toggle label="Hiển thị thời gian bàn" desc="In thời gian khách ngồi tại bàn" checked={data.show_table_time} onChange={(v) => handleChange('show_table_time', v)} />
                <Toggle label="Hiển thị số thứ tự đơn" desc="In số thứ tự đơn trong ngày" checked={data.show_order_number} onChange={(v) => handleChange('show_order_number', v)} />
                <Toggle label="In phiếu bếp tự động" desc="Tự động in phiếu chế biến khi gửi đơn" checked={data.print_kitchen_receipt} onChange={(v) => handleChange('print_kitchen_receipt', v)} />
            </div>
        </div>
    );
}

function Toggle({ label, desc, checked, onChange }: { label: string, desc: string, checked: boolean, onChange: (v: boolean) => void }) {
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
