import { Shield, Lock, AlertTriangle, Trash2, Download, Upload } from 'lucide-react';
import { useState } from 'react';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (key: keyof PermissionSettings, value: any) => {
        if (onChange) onChange({ ...data, [key]: value });
    };

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetInput, setResetInput] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const handleResetDatabase = async () => {
        if (resetInput !== 'RESET') {
            alert('Vui lòng nhập chính xác "RESET" để xác nhận');
            return;
        }

        const finalConfirm = confirm(
            '⚠️ CẢNH BÁO CUỐI CÙNG!\n\nHành động này sẽ XÓA VĨNH VIỄN:\n' +
            '- Tất cả đơn hàng\n' +
            '- Lịch sử bàn\n' +
            '- Kitchen tickets\n\n' +
            'Bấm OK để tiếp tục xóa, Cancel để hủy'
        );

        if (!finalConfirm) return;

        setIsResetting(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/api/admin/reset-database`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Reset failed');
            }

            alert('✅ Database đã được reset thành công!');
            setShowResetConfirm(false);
            setResetInput('');
            window.location.reload();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Reset error:', error);
            alert(`❌ Lỗi: ${error.message || 'Không thể reset database'}`);
        } finally {
            setIsResetting(false);
        }
    };

    // Backup & Import handlers
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/api/admin/backup`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Backup failed');
            }

            // Download file
            const blob = await response.blob();
            const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'backup.json';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            alert('✅ Backup tải xuống thành công!');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Backup error:', error);
            alert(`❌ Lỗi: ${error.message || 'Không thể tạo backup'}`);
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const confirm = window.confirm(
            '⚠️ CẢNH BÁO!\n\n' +
            'Import sẽ XÓA TOÀN BỘ dữ liệu hiện tại và thay thế bằng dữ liệu từ file backup.\n\n' +
            'Bạn có chắc chắn muốn tiếp tục?'
        );

        if (!confirm) {
            event.target.value = ''; // Reset input
            return;
        }

        setIsImporting(true);
        try {
            const content = await file.text();
            const backup = JSON.parse(content);

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');

            const response = await fetch(`${API_URL}/api/admin/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(backup)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Import failed');
            }

            alert('✅ Import thành công! Trang sẽ tự động reload.');
            window.location.reload();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error('Import error:', error);
            alert(`❌ Lỗi: ${error.message || 'Không thể import backup'}`);
        } finally {
            setIsImporting(false);
            event.target.value = ''; // Reset input
        }
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

            {/* BACKUP & IMPORT */}
            <div className="border-t-4 border-blue-200 pt-8">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-blue-700 flex items-center gap-2 mb-2">
                        <Download className="text-blue-600" size={24} />
                        Backup & Import
                    </h3>
                    <p className="text-blue-600 mb-4">Sao lưu và khôi phục dữ liệu của bạn</p>

                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Backup */}
                        <div className="bg-white rounded-xl p-4 border border-blue-200">
                            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Download size={18} className="text-blue-600" />
                                Backup Database
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">
                                Tải về file JSON chứa toàn bộ dữ liệu: sản phẩm, đơn hàng, cài đặt, bàn...
                            </p>
                            <button
                                onClick={handleBackup}
                                disabled={isBackingUp}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                {isBackingUp ? 'Đang tạo backup...' : 'Tải về Backup'}
                            </button>
                        </div>

                        {/* Import */}
                        <div className="bg-white rounded-xl p-4 border border-blue-200">
                            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                <Upload size={18} className="text-blue-600" />
                                Import Database
                            </h4>
                            <p className="text-sm text-slate-600 mb-4">
                                Tải lên file backup để khôi phục dữ liệu. <strong className="text-red-600">Sẽ xóa data hiện tại!</strong>
                            </p>
                            <label className="w-full block">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    disabled={isImporting}
                                    className="hidden"
                                    id="import-file"
                                />
                                <span className="cursor-pointer w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-center">
                                    <Upload size={18} />
                                    {isImporting ? 'Đang import...' : 'Chọn file Backup'}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* DANGER ZONE */}
            <div className="border-t-4 border-red-200 pt-8">
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-2">
                        <Trash2 className="text-red-600" size={24} />
                        Vùng Nguy Hiểm
                    </h3>
                    <p className="text-red-600 mb-4">Các hành động bên dưới không thể hoàn tác. Hãy cẩn thận!</p>

                    <div className="bg-white rounded-xl p-4 border border-red-200">
                        <h4 className="font-bold text-slate-800 mb-2">Reset Database</h4>
                        <p className="text-sm text-slate-600 mb-4">
                            Xóa toàn bộ đơn hàng, lịch sử bàn, kitchen tickets. Dùng để setup lại từ đầu.
                        </p>

                        {!showResetConfirm ? (
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Reset Database
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-sm font-bold text-red-800 mb-2">⚠️ Để xác nhận, gõ chữ "RESET" (in hoa) vào ô bên dưới:</p>
                                    <input
                                        type="text"
                                        value={resetInput}
                                        onChange={(e) => setResetInput(e.target.value)}
                                        placeholder="Nhập RESET"
                                        className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none font-mono"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleResetDatabase}
                                        disabled={resetInput !== 'RESET' || isResetting}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isResetting ? 'Đang xóa...' : 'Xác nhận xóa'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowResetConfirm(false);
                                            setResetInput('');
                                        }}
                                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                                    >
                                        Hủy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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
