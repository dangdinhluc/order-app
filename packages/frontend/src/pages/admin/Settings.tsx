import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
    Store, Receipt, Globe, CreditCard, Bell, Shield, Printer,
    Save, Loader2, Check, Upload, Image
} from 'lucide-react';
import PaymentMethodsManager from './settings/PaymentMethodsManager';

// Types
interface StoreSettings {
    store_name: string;
    store_name_ja: string;
    address: string;
    phone: string;
    tax_rate: number;
    currency: string;
    language: string;
    timezone: string;
}

interface ReceiptSettings {
    logo_url: string;
    header_text: string;
    footer_text: string;
    show_table_time: boolean;
    show_order_number: boolean;
    print_kitchen_receipt: boolean;
    font_size: 'small' | 'medium' | 'large';
}

interface PermissionSettings {
    max_discount_percent: number;
    require_pin_for_void: boolean;
    require_pin_for_discount_over: number;
    allow_open_item: boolean;
    allow_price_override: boolean;
}

interface NotificationSettings {
    telegram_bot_token: string;
    telegram_chat_id: string;
    alerts: {
        on_discount: boolean;
        on_void: boolean;
        on_sold_out: boolean;
        on_daily_report: boolean;
    };
}

interface PrinterSettings {
    printer_type: 'browser' | 'network' | 'usb';
    printer_ip: string;
    printer_port: number;
    paper_width: '58mm' | '80mm';
    opening_hours: string;
    closing_hours: string;
}

type TabType = 'store' | 'receipt' | 'permissions' | 'notifications' | 'printer' | 'payment';

export default function Settings() {
    const [activeTab, setActiveTab] = useState<TabType>('store');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Settings state
    const [storeSettings, setStoreSettings] = useState<StoreSettings>({
        store_name: 'Hybrid POS',
        store_name_ja: 'ハイブリッドPOS',
        address: '',
        phone: '',
        tax_rate: 10,
        currency: 'JPY',
        language: 'vi',
        timezone: 'Asia/Tokyo',
    });

    const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
        logo_url: '',
        header_text: 'Cảm ơn quý khách!',
        footer_text: 'Hẹn gặp lại!',
        show_table_time: true,
        show_order_number: true,
        print_kitchen_receipt: true,
        font_size: 'medium',
    });

    const [permissionSettings, setPermissionSettings] = useState<PermissionSettings>({
        max_discount_percent: 10,
        require_pin_for_void: true,
        require_pin_for_discount_over: 20,
        allow_open_item: true,
        allow_price_override: false,
    });

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        telegram_bot_token: '',
        telegram_chat_id: '',
        alerts: {
            on_discount: true,
            on_void: true,
            on_sold_out: true,
            on_daily_report: false,
        },
    });

    const [printerSettings, setPrinterSettings] = useState<PrinterSettings>({
        printer_type: 'browser',
        printer_ip: '192.168.1.100',
        printer_port: 9100,
        paper_width: '80mm',
        opening_hours: '11:00',
        closing_hours: '23:00',
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await api.getSettings();
            if (res.data) {
                if (res.data.store_settings) setStoreSettings(res.data.store_settings);
                if (res.data.receipt_settings) setReceiptSettings(res.data.receipt_settings);
                if (res.data.permission_settings) setPermissionSettings(res.data.permission_settings);
                if (res.data.notification_settings) setNotificationSettings(res.data.notification_settings);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: 'store' as TabType, label: 'Cửa hàng', icon: Store },
        { id: 'receipt' as TabType, label: 'Hóa đơn', icon: Receipt },
        { id: 'printer' as TabType, label: 'Máy in', icon: Printer },
        { id: 'payment' as TabType, label: 'Thanh toán', icon: CreditCard },
        { id: 'permissions' as TabType, label: 'Phân quyền', icon: Shield },
        { id: 'notifications' as TabType, label: 'Thông báo', icon: Bell },
    ];

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateSettings({
                store_settings: storeSettings,
                receipt_settings: receiptSettings,
                permission_settings: permissionSettings,
                notification_settings: notificationSettings,
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cài đặt</h1>
                    <p className="text-slate-500">Quản lý cấu hình hệ thống</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : saveSuccess ? (
                        <Check size={18} />
                    ) : (
                        <Save size={18} />
                    )}
                    {saveSuccess ? 'Đã lưu!' : 'Lưu thay đổi'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 font-medium transition border-b-2 -mb-px ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                {activeTab === 'store' && (
                    <StoreSettingsPanel
                        settings={storeSettings}
                        onChange={setStoreSettings}
                    />
                )}
                {activeTab === 'receipt' && (
                    <ReceiptSettingsPanel
                        settings={receiptSettings}
                        onChange={setReceiptSettings}
                    />
                )}
                {activeTab === 'printer' && (
                    <PrinterSettingsPanel
                        settings={printerSettings}
                        onChange={setPrinterSettings}
                    />
                )}
                {activeTab === 'permissions' && (
                    <PermissionSettingsPanel
                        settings={permissionSettings}
                        onChange={setPermissionSettings}
                    />
                )}
                {activeTab === 'notifications' && (
                    <NotificationSettingsPanel
                        settings={notificationSettings}
                        onChange={setNotificationSettings}
                    />
                )}
                {activeTab === 'payment' && (
                    <PaymentMethodsManager />
                )}
            </div>
        </div>
    );
}

// Store Settings Panel
function StoreSettingsPanel({ settings, onChange }: {
    settings: StoreSettings;
    onChange: (s: StoreSettings) => void;
}) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Store size={20} className="text-blue-600" />
                Thông tin cửa hàng
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tên cửa hàng (Tiếng Việt)
                    </label>
                    <input
                        type="text"
                        value={settings.store_name}
                        onChange={(e) => onChange({ ...settings, store_name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Tên cửa hàng"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tên cửa hàng (日本語)
                    </label>
                    <input
                        type="text"
                        value={settings.store_name_ja}
                        onChange={(e) => onChange({ ...settings, store_name_ja: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="店舗名"
                    />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Địa chỉ
                    </label>
                    <input
                        type="text"
                        value={settings.address}
                        onChange={(e) => onChange({ ...settings, address: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="〒xxx-xxxx 東京都..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Số điện thoại
                    </label>
                    <input
                        type="tel"
                        value={settings.phone}
                        onChange={(e) => onChange({ ...settings, phone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="03-xxxx-xxxx"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Thuế VAT (%)
                    </label>
                    <input
                        type="number"
                        value={settings.tax_rate}
                        onChange={(e) => onChange({ ...settings, tax_rate: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        max="100"
                    />
                </div>
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Globe size={20} className="text-blue-600" />
                Ngôn ngữ & Tiền tệ
            </h3>

            <div className="grid md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Ngôn ngữ mặc định
                    </label>
                    <select
                        value={settings.language}
                        onChange={(e) => onChange({ ...settings, language: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="vi">🇻🇳 Tiếng Việt</option>
                        <option value="ja">🇯🇵 日本語</option>
                        <option value="en">🇬🇧 English</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Tiền tệ
                    </label>
                    <select
                        value={settings.currency}
                        onChange={(e) => onChange({ ...settings, currency: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="JPY">¥ Yên Nhật (JPY)</option>
                        <option value="VND">₫ Việt Nam Đồng (VND)</option>
                        <option value="USD">$ US Dollar (USD)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Múi giờ
                    </label>
                    <select
                        value={settings.timezone}
                        onChange={(e) => onChange({ ...settings, timezone: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="Asia/Tokyo">Tokyo (JST +9)</option>
                        <option value="Asia/Ho_Chi_Minh">TP. Hồ Chí Minh (ICT +7)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

// Receipt Settings Panel
function ReceiptSettingsPanel({ settings, onChange }: {
    settings: ReceiptSettings;
    onChange: (s: ReceiptSettings) => void;
}) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Receipt size={20} className="text-blue-600" />
                Thiết kế hóa đơn
            </h3>

            {/* Logo Upload */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Logo cửa hàng
                </label>
                <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                        {settings.logo_url ? (
                            <img src={settings.logo_url} alt="Logo" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <Image size={32} className="text-slate-400" />
                        )}
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
                        <Upload size={18} />
                        Tải lên
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Dòng chữ trên hóa đơn (Header)
                    </label>
                    <textarea
                        value={settings.header_text}
                        onChange={(e) => onChange({ ...settings, header_text: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Cảm ơn quý khách!"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Dòng chữ cuối hóa đơn (Footer)
                    </label>
                    <textarea
                        value={settings.footer_text}
                        onChange={(e) => onChange({ ...settings, footer_text: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Hẹn gặp lại!"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cỡ chữ
                </label>
                <div className="flex gap-3">
                    {(['small', 'medium', 'large'] as const).map(size => (
                        <button
                            key={size}
                            onClick={() => onChange({ ...settings, font_size: size })}
                            className={`px-4 py-2 rounded-xl border-2 transition ${settings.font_size === size
                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn'}
                        </button>
                    ))}
                </div>
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Printer size={20} className="text-blue-600" />
                Tùy chọn in
            </h3>

            <div className="space-y-4">
                <ToggleOption
                    label="Hiển thị thời gian ngồi bàn"
                    description="In thời gian khách ngồi trên hóa đơn"
                    checked={settings.show_table_time}
                    onChange={(v) => onChange({ ...settings, show_table_time: v })}
                />
                <ToggleOption
                    label="Hiển thị số thứ tự đơn"
                    description="In số thứ tự đơn hàng trong ngày"
                    checked={settings.show_order_number}
                    onChange={(v) => onChange({ ...settings, show_order_number: v })}
                />
                <ToggleOption
                    label="In phiếu bếp"
                    description="Tự động in phiếu khi có món mới cho bếp"
                    checked={settings.print_kitchen_receipt}
                    onChange={(v) => onChange({ ...settings, print_kitchen_receipt: v })}
                />
            </div>
        </div>
    );
}

// Permission Settings Panel
function PermissionSettingsPanel({ settings, onChange }: {
    settings: PermissionSettings;
    onChange: (s: PermissionSettings) => void;
}) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Phân quyền & Bảo mật
            </h3>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                <strong>⚠️ Lưu ý:</strong> Các cài đặt này ảnh hưởng đến quyền của nhân viên. Hành động vượt quyền sẽ yêu cầu PIN của Chủ quán.
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Giảm giá tối đa cho Thu ngân (%)
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="50"
                            value={settings.max_discount_percent}
                            onChange={(e) => onChange({ ...settings, max_discount_percent: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="w-16 text-center font-bold text-blue-600 text-lg">
                            {settings.max_discount_percent}%
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Giảm giá trên {settings.max_discount_percent}% sẽ yêu cầu PIN Chủ quán
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Yêu cầu PIN khi giảm hơn (%)
                    </label>
                    <input
                        type="number"
                        value={settings.require_pin_for_discount_over}
                        onChange={(e) => onChange({ ...settings, require_pin_for_discount_over: parseInt(e.target.value) })}
                        className="w-32 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        max="100"
                    />
                </div>

                <hr className="my-4" />

                <ToggleOption
                    label="Yêu cầu PIN khi hủy đơn"
                    description="Bắt buộc nhập PIN của Chủ quán khi hủy/void đơn hàng"
                    checked={settings.require_pin_for_void}
                    onChange={(v) => onChange({ ...settings, require_pin_for_void: v })}
                />

                <ToggleOption
                    label="Cho phép tạo món mở (Open Item)"
                    description="Nhân viên có thể tạo món với tên và giá tự do"
                    checked={settings.allow_open_item}
                    onChange={(v) => onChange({ ...settings, allow_open_item: v })}
                />

                <ToggleOption
                    label="Cho phép sửa giá món"
                    description="Nhân viên có thể thay đổi giá của món trong đơn"
                    checked={settings.allow_price_override}
                    onChange={(v) => onChange({ ...settings, allow_price_override: v })}
                />
            </div>
        </div>
    );
}

// Notification Settings Panel
function NotificationSettingsPanel({ settings, onChange }: {
    settings: NotificationSettings;
    onChange: (s: NotificationSettings) => void;
}) {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Bell size={20} className="text-blue-600" />
                Thông báo cho Chủ quán
            </h3>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm">
                💡 Nhận thông báo quan trọng qua Telegram khi có hoạt động bất thường
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Telegram Bot Token
                    </label>
                    <input
                        type="text"
                        value={settings.telegram_bot_token}
                        onChange={(e) => onChange({ ...settings, telegram_bot_token: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="123456789:ABC..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Telegram Chat ID
                    </label>
                    <input
                        type="text"
                        value={settings.telegram_chat_id}
                        onChange={(e) => onChange({ ...settings, telegram_chat_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="-100123456789"
                    />
                </div>
            </div>

            <hr className="my-6" />

            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Nhận thông báo khi:
            </h4>

            <div className="space-y-4">
                <ToggleOption
                    label="Có giảm giá lớn"
                    description="Thông báo khi nhân viên áp dụng giảm giá vượt mức cho phép"
                    checked={settings.alerts.on_discount}
                    onChange={(v) => onChange({ ...settings, alerts: { ...settings.alerts, on_discount: v } })}
                />
                <ToggleOption
                    label="Hủy đơn hàng"
                    description="Thông báo khi có đơn hàng bị hủy/void"
                    checked={settings.alerts.on_void}
                    onChange={(v) => onChange({ ...settings, alerts: { ...settings.alerts, on_void: v } })}
                />
                <ToggleOption
                    label="Món hết hàng"
                    description="Thông báo khi món best-seller được đánh dấu Sold Out"
                    checked={settings.alerts.on_sold_out}
                    onChange={(v) => onChange({ ...settings, alerts: { ...settings.alerts, on_sold_out: v } })}
                />
                <ToggleOption
                    label="Báo cáo cuối ngày"
                    description="Tự động gửi tổng kết doanh thu lúc 23:00"
                    checked={settings.alerts.on_daily_report}
                    onChange={(v) => onChange({ ...settings, alerts: { ...settings.alerts, on_daily_report: v } })}
                />
            </div>

            <button
                onClick={async () => {
                    // First, save the config to backend
                    try {
                        const token = localStorage.getItem('token');
                        // Configure
                        await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/telegram/config`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                botToken: settings.telegram_bot_token,
                                chatId: settings.telegram_chat_id,
                                enabled: true,
                            }),
                        });
                        // Then send test
                        const testRes = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/telegram/test`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                            },
                        });
                        const testData = await testRes.json();
                        if (testData.success) {
                            alert('✅ Tin nhắn test đã được gửi thành công!');
                        } else {
                            alert('❌ Không gửi được. Kiểm tra lại Bot Token và Chat ID.');
                        }
                    } catch (error) {
                        console.error('Test telegram error:', error);
                        alert('❌ Lỗi kết nối. Vui lòng thử lại.');
                    }
                }}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition"
            >
                🔔 Gửi thông báo test
            </button>
        </div>
    );
}

// Toggle Option Component
function ToggleOption({ label, description, checked, onChange }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
                <p className="font-medium text-slate-800">{label}</p>
                <p className="text-sm text-slate-500">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-6 rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
            >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'
                    }`} />
            </button>
        </div>
    );
}

// Printer Settings Panel
function PrinterSettingsPanel({ settings, onChange }: {
    settings: PrinterSettings;
    onChange: (s: PrinterSettings) => void;
}) {
    const handleTestPrint = () => {
        const testContent = `
=============================
        *** TEST PRINT ***
=============================
Printer: ${settings.printer_type}
${settings.printer_type === 'network' ? `IP: ${settings.printer_ip}:${settings.printer_port}` : ''}
Paper: ${settings.paper_width}
Time: ${new Date().toLocaleString('ja-JP')}
=============================
      If you see this,
    printing works! ✓
=============================
`;
        const printWindow = window.open('', '_blank', 'width=300,height=400');
        if (printWindow) {
            printWindow.document.write(`<pre style="font-family: monospace; font-size: 12px;">${testContent}</pre>`);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    };

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Printer size={20} className="text-blue-600" />
                Cấu hình máy in
            </h3>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800 text-sm">
                🖨️ Chọn phương thức in phù hợp với thiết bị của bạn
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Loại máy in
                </label>
                <div className="flex gap-3">
                    {(['browser', 'network', 'usb'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => onChange({ ...settings, printer_type: type })}
                            className={`px-4 py-2 rounded-xl border-2 transition ${settings.printer_type === type
                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {type === 'browser' ? '🌐 Trình duyệt' : type === 'network' ? '📡 Mạng LAN' : '🔌 USB'}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    {settings.printer_type === 'browser' && 'Sử dụng hộp thoại in của trình duyệt (phổ biến nhất)'}
                    {settings.printer_type === 'network' && 'Kết nối trực tiếp đến máy in qua IP (dành cho máy in nhiệt)'}
                    {settings.printer_type === 'usb' && 'Máy in kết nối USB (cần driver)'}
                </p>
            </div>

            {settings.printer_type === 'network' && (
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Địa chỉ IP máy in
                        </label>
                        <input
                            type="text"
                            value={settings.printer_ip}
                            onChange={(e) => onChange({ ...settings, printer_ip: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            placeholder="192.168.1.100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Cổng (Port)
                        </label>
                        <input
                            type="number"
                            value={settings.printer_port}
                            onChange={(e) => onChange({ ...settings, printer_port: parseInt(e.target.value) })}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                            placeholder="9100"
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Khổ giấy
                </label>
                <div className="flex gap-3">
                    {(['58mm', '80mm'] as const).map(width => (
                        <button
                            key={width}
                            onClick={() => onChange({ ...settings, paper_width: width })}
                            className={`px-4 py-2 rounded-xl border-2 transition ${settings.paper_width === width
                                ? 'border-blue-600 bg-blue-50 text-blue-600'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {width}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    58mm: Máy in cầm tay nhỏ | 80mm: Máy in để bàn tiêu chuẩn
                </p>
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Store size={20} className="text-blue-600" />
                Giờ hoạt động
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Giờ mở cửa
                    </label>
                    <input
                        type="time"
                        value={settings.opening_hours}
                        onChange={(e) => onChange({ ...settings, opening_hours: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Giờ đóng cửa
                    </label>
                    <input
                        type="time"
                        value={settings.closing_hours}
                        onChange={(e) => onChange({ ...settings, closing_hours: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <hr className="my-6" />

            <button
                onClick={handleTestPrint}
                className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"
            >
                <Printer size={18} />
                🖨️ In thử (Test Print)
            </button>
        </div>
    );
}
