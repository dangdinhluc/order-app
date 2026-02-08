import { Store, Globe, Sparkles } from 'lucide-react';

interface StoreSettings {
    store_name: string;
    store_name_ja: string;
    address: string;
    phone: string;
    tax_rate: number;
    currency: string;
    language: string;
    timezone: string;
    // Branding settings for Customer Menu
    brand_name: string;
    brand_slogan: string;
    brand_icon: string;
}

interface Props {
    settings?: StoreSettings;
    onChange?: (settings: StoreSettings) => void;
}

export default function GeneralSettings({ settings, onChange }: Props) {
    // Mock default data if not provided (for standalone testing)
    const data = settings || {
        store_name: 'Hybrid POS',
        store_name_ja: 'ハイブリッドPOS',
        address: '',
        phone: '',
        tax_rate: 10,
        currency: 'JPY',
        language: 'vi',
        timezone: 'Asia/Tokyo',
        // Branding defaults
        brand_name: 'GIA VỊ',
        brand_slogan: 'Hương vị Việt',
        brand_icon: '🍜',
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (key: keyof StoreSettings, value: any) => {
        if (onChange) {
            onChange({ ...data, [key]: value });
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Store className="text-blue-600" size={24} />
                    Thông tin cửa hàng
                </h3>
                <p className="text-slate-500">Thông tin cơ bản hiển thị trên hóa đơn và hệ thống</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tên cửa hàng (Tiếng Việt)</label>
                    <input
                        type="text"
                        value={data.store_name}
                        onChange={(e) => handleChange('store_name', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tên cửa hàng (日本語)</label>
                    <input
                        type="text"
                        value={data.store_name_ja}
                        onChange={(e) => handleChange('store_name_ja', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Địa chỉ</label>
                    <input
                        type="text"
                        value={data.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Số điện thoại</label>
                    <input
                        type="text"
                        value={data.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Thuế VAT (%)</label>
                    <input
                        type="number"
                        value={data.tax_rate}
                        onChange={(e) => handleChange('tax_rate', Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Branding Section for Customer Menu */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Sparkles className="text-amber-500" size={24} />
                    Thương hiệu (Customer Menu)
                </h3>
                <p className="text-slate-500 mb-6">Tên quán, khẩu hiệu và icon hiển thị trên menu khách hàng</p>

                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tên quán</label>
                        <input
                            type="text"
                            value={data.brand_name}
                            onChange={(e) => handleChange('brand_name', e.target.value)}
                            placeholder="GIA VỊ"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Khẩu hiệu</label>
                        <input
                            type="text"
                            value={data.brand_slogan}
                            onChange={(e) => handleChange('brand_slogan', e.target.value)}
                            placeholder="Hương vị Việt"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Icon (Emoji)</label>
                        <input
                            type="text"
                            value={data.brand_icon}
                            onChange={(e) => handleChange('brand_icon', e.target.value)}
                            placeholder="🍜"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-2xl text-center"
                        />
                        <p className="text-xs text-slate-400 mt-1">Nhập 1 emoji (🍜, 🍛, 🍕...)</p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100" />

            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Globe className="text-blue-600" size={24} />
                    Ngôn ngữ & Vùng
                </h3>
                <p className="text-slate-500 mb-6">Cấu hình ngôn ngữ mặc định và tiền tệ</p>

                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ngôn ngữ</label>
                        <select
                            value={data.language}
                            onChange={(e) => handleChange('language', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="vi">Tiếng Việt</option>
                            <option value="ja">日本語</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Tiền tệ</label>
                        <select
                            value={data.currency}
                            onChange={(e) => handleChange('currency', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="JPY">JPY (¥)</option>
                            <option value="VND">VND (₫)</option>
                            <option value="USD">USD ($)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Múi giờ</label>
                        <select
                            value={data.timezone}
                            onChange={(e) => handleChange('timezone', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
                            <option value="Asia/Ho_Chi_Minh">Hanoi (GMT+7)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
