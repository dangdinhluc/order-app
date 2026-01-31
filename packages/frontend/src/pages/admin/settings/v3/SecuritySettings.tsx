import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface PermissionSettings {
    max_discount_percent: number;
    require_pin_for_void: boolean;
    require_pin_for_discount_over: number;
    allow_open_item: boolean;
    allow_price_override: boolean;
}

interface Props {
    settings?: PermissionSettings;
    onChange?: (settings: PermissionSettings) => void;
}

export default function SecuritySettings({ settings, onChange }: Props) {
    const data = settings || {
        max_discount_percent: 10,
        require_pin_for_void: true,
        require_pin_for_discount_over: 20,
        allow_open_item: true,
        allow_price_override: false,
    };

    const handleChange = (key: keyof PermissionSettings, value: any) => {
        if (onChange) onChange({ ...data, [key]: value });
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Shield className="text-blue-600" size={24} />
                    Phân quyền & Bảo mật
                </h3>
                <p className="text-slate-500">Kiểm soát quyền hạn nhân viên và các hành động nhạy cảm</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm">
                    <strong>Lưu ý quan trọng:</strong> Các hành động vượt quá giới hạn dưới đây sẽ yêu cầu nhập mã <strong>PIN Quản lý</strong> để thực hiện. Hãy đảm bảo giữ bí mật mã PIN của bạn.
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Discount Limits */}
                <div className="space-y-6">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Lock size={18} className="text-slate-400" />
                        Giới hạn Giảm giá
                    </h4>

                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700">Giảm giá tối đa cho Thu ngân</label>
                            <span className="font-bold text-blue-600">{data.max_discount_percent}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            value={data.max_discount_percent}
                            onChange={(e) => handleChange('max_discount_percent', parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-xs text-slate-500 mt-2">Nhân viên chỉ được phép giảm giá tối đa {data.max_discount_percent}% trên tổng đơn.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Yêu cầu PIN khi giảm hơn (%)</label>
                        <input
                            type="number"
                            value={data.require_pin_for_discount_over}
                            onChange={(e) => handleChange('require_pin_for_discount_over', parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Action Permissions */}
                <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Lock size={18} className="text-slate-400" />
                        Quyền hạn Hành động
                    </h4>

                    <Toggle
                        label="Yêu cầu PIN khi hủy đơn (Void)"
                        desc="Bắt buộc nhập PIN khi nhân viên muốn hủy món hoặc hủy đơn"
                        checked={data.require_pin_for_void}
                        onChange={(v) => handleChange('require_pin_for_void', v)}
                    />
                    <Toggle
                        label="Cho phép tạo món mở (Open Item)"
                        desc="Nhân viên có thể nhập giá và tên món tùy ý tại POS"
                        checked={data.allow_open_item}
                        onChange={(v) => handleChange('allow_open_item', v)}
                    />
                    <Toggle
                        label="Cho phép sửa giá món"
                        desc="Nhân viên có thể thay đổi giá bán của món trong menu"
                        checked={data.allow_price_override}
                        onChange={(v) => handleChange('allow_price_override', v)}
                    />
                </div>
            </div>
        </div>
    );
}

function Toggle({ label, desc, checked, onChange }: { label: string, desc: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="mr-4">
                <p className="font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );
}
