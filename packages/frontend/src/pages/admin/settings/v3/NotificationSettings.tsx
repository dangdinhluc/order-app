import { Bell, Send } from 'lucide-react';

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

interface Props {
    settings?: NotificationSettings;
    onChange?: (settings: NotificationSettings) => void;
}

export default function NotificationSettings({ settings, onChange }: Props) {
    const data = settings || {
        telegram_bot_token: '',
        telegram_chat_id: '',
        alerts: {
            on_discount: true,
            on_void: true,
            on_sold_out: true,
            on_daily_report: false,
        },
    };

    const handleChange = (key: keyof NotificationSettings, value: any) => {
        if (onChange) onChange({ ...data, [key]: value });
    };

    const handleAlertChange = (key: keyof NotificationSettings['alerts'], value: boolean) => {
        if (onChange) onChange({ ...data, alerts: { ...data.alerts, [key]: value } });
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Bell className="text-blue-600" size={24} />
                    Thông báo & Cảnh báo
                </h3>
                <p className="text-slate-500">Cấu hình nhận thông báo qua Telegram khi có sự kiện quan trọng</p>
            </div>

            <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    <h4 className="font-bold text-blue-900">Cấu hình Telegram Bot</h4>
                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Bot Token</label>
                        <input
                            type="text"
                            value={data.telegram_bot_token}
                            onChange={(e) => handleChange('telegram_bot_token', e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Chat ID</label>
                        <input
                            type="text"
                            value={data.telegram_chat_id}
                            onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                            placeholder="-100123456789"
                        />
                    </div>
                </div>
                <div className="flex items-end">
                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                        <Send size={18} />
                        Gửi tin nhắn test
                    </button>
                </div>
            </div>

            <hr className="border-slate-100" />

            <div>
                <h4 className="font-bold text-slate-800 mb-4">Mục nhận thông báo</h4>
                <div className="grid md:grid-cols-2 gap-4">
                    <Toggle
                        label="Giảm giá lớn"
                        desc="Khi nhân viên áp dụng mã giảm giá > 20%"
                        checked={data.alerts.on_discount}
                        onChange={(v) => handleAlertChange('on_discount', v)}
                    />
                    <Toggle
                        label="Hủy đơn hàng (Void)"
                        desc="Khi có đơn hàng bị hủy sau khi đã in bill"
                        checked={data.alerts.on_void}
                        onChange={(v) => handleAlertChange('on_void', v)}
                    />
                    <Toggle
                        label="Hết hàng (Sold Out)"
                        desc="Khi một món được đánh dấu hết hàng"
                        checked={data.alerts.on_sold_out}
                        onChange={(v) => handleAlertChange('on_sold_out', v)}
                    />
                    <Toggle
                        label="Báo cáo cuối ngày"
                        desc="Tự động gửi báo cáo doanh thu lúc 23:00"
                        checked={data.alerts.on_daily_report}
                        onChange={(v) => handleAlertChange('on_daily_report', v)}
                    />
                </div>
            </div>
        </div>
    );
}

function Toggle({ label, desc, checked, onChange }: { label: string, desc: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer" onClick={() => onChange(!checked)}>
            <div>
                <p className="font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
            </div>
            <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-green-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
        </div>
    );
}
