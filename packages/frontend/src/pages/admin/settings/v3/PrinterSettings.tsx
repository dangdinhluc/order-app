import { Printer, Wifi, Usb, Globe } from 'lucide-react';

interface PrinterSettings {
    printer_type: 'browser' | 'network' | 'usb';
    printer_ip: string;
    printer_port: number;
    paper_width: '58mm' | '80mm';
}

interface Props {
    settings?: PrinterSettings;
    onChange?: (settings: PrinterSettings) => void;
}

export default function PrinterSettings({ settings, onChange }: Props) {
    const data = settings || {
        printer_type: 'browser',
        printer_ip: '192.168.1.100',
        printer_port: 9100,
        paper_width: '80mm',
    };

    const handleChange = (key: keyof PrinterSettings, value: any) => {
        if (onChange) onChange({ ...data, [key]: value });
    };

    const handleTestPrint = () => {
        alert('Sending test print command...');
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Printer className="text-blue-600" size={24} />
                    Cấu hình Máy in
                </h3>
                <p className="text-slate-500">Kết nối máy in hóa đơn và máy in bếp</p>
            </div>

            {/* Connection Type */}
            <div className="grid md:grid-cols-3 gap-4">
                {[
                    { id: 'browser', label: 'Trình duyệt', icon: Globe, desc: 'Sử dụng hộp thoại in của trình duyệt' },
                    { id: 'network', label: 'Mạng LAN', icon: Wifi, desc: 'Kết nối qua địa chỉ IP (Wifi/LAN)' },
                    { id: 'usb', label: 'USB/Bluetooth', icon: Usb, desc: 'Kết nối trực tiếp (Cần Driver)' },
                ].map((type) => {
                    const isActive = data.printer_type === type.id;
                    const Icon = type.icon;
                    return (
                        <button
                            key={type.id}
                            onClick={() => handleChange('printer_type', type.id)}
                            className={`p-4 rounded-2xl border-2 text-left transition-all ${isActive
                                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 ring-offset-2'
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                }`}
                        >
                            <div className={`p-2 rounded-lg w-fit mb-3 ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                <Icon size={24} />
                            </div>
                            <div className="font-bold text-slate-800 mb-1">{type.label}</div>
                            <div className="text-xs text-slate-500">{type.desc}</div>
                        </button>
                    );
                })}
            </div>

            {/* Network Settings */}
            {data.printer_type === 'network' && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-slate-800">Cấu hình Mạng</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Địa chỉ IP</label>
                            <input
                                type="text"
                                value={data.printer_ip}
                                onChange={(e) => handleChange('printer_ip', e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="192.168.1.100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Port</label>
                            <input
                                type="number"
                                value={data.printer_port}
                                onChange={(e) => handleChange('printer_port', parseInt(e.target.value))}
                                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="9100"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-4">
                    <label className="font-medium text-slate-700">Khổ giấy:</label>
                    <select
                        value={data.paper_width}
                        onChange={(e) => handleChange('paper_width', e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="80mm">80mm (Tiêu chuẩn)</option>
                        <option value="58mm">58mm (Nhỏ)</option>
                    </select>
                </div>
                <button
                    onClick={handleTestPrint}
                    className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition shadow-lg shadow-slate-200"
                >
                    In thử kiểm tra
                </button>
            </div>
        </div>
    );
}
