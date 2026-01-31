import { Monitor, Smartphone, Tv, QrCode, ExternalLink } from 'lucide-react';

export default function DisplaySettings() {
    const screens = [
        {
            id: 'customer',
            title: 'Màn hình Khách (Customer View)',
            description: 'Hiển thị menu và trạng thái đơn hàng cho khách xem',
            icon: Smartphone,
            url: `/customer/${localStorage.getItem('tableId') || 'default'}`, // Example URL
            color: 'bg-purple-100 text-purple-600'
        },
        {
            id: 'kitchen',
            title: 'Màn hình Bếp (Kitchen Display)',
            description: 'Hiển thị danh sách món cần chế biến cho bếp',
            icon: Tv,
            url: '/kitchen',
            color: 'bg-orange-100 text-orange-600'
        },
        {
            id: 'pos',
            title: 'Màn hình Thu ngân (POS)',
            description: 'Giao diện gọi món và thanh toán chính',
            icon: Monitor,
            url: '/pos',
            color: 'bg-blue-100 text-blue-600'
        }
    ];

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Monitor className="text-blue-600" size={24} />
                    Quản lý Màn hình
                </h3>
                <p className="text-slate-500">Kết nối và quản lý các màn hình hiển thị trong quán</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {screens.map((screen) => (
                    <div key={screen.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl ${screen.color}`}>
                                <screen.icon size={24} />
                            </div>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                                Đang hoạt động
                            </span>
                        </div>

                        <h4 className="text-lg font-bold text-slate-800 mb-1">{screen.title}</h4>
                        <p className="text-slate-500 text-sm mb-6 min-h-[40px]">{screen.description}</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.open(screen.url, '_blank')}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition"
                            >
                                <ExternalLink size={18} />
                                Mở Link
                            </button>
                            <button className="flex items-center justify-center w-12 h-10 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition">
                                <QrCode size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <hr className="border-slate-100" />

            {/* Device Role Configuration */}
            <div>
                <h4 className="text-md font-bold text-slate-800 mb-4">Cấu hình thiết bị này</h4>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800">Chế độ hiển thị</p>
                            <p className="text-sm text-slate-500">Chọn vai trò cho thiết bị hiện tại</p>
                        </div>
                        <select className="px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="admin">Quản lý (Admin)</option>
                            <option value="pos">Thu ngân (POS)</option>
                            <option value="kitchen">Bếp (Kitchen View)</option>
                            <option value="customer">Khách hàng (Customer View)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
