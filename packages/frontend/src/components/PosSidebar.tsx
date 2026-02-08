import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutGrid,
    History,
    Settings,
    LogOut,
    ChefHat,
    UtensilsCrossed
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PosSidebarProps {
    className?: string;
}

export default function PosSidebar({ className = '' }: PosSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const menuItems = [
        { path: '/pos', icon: LayoutGrid, label: 'POS' },
        { path: '/kitchen', icon: ChefHat, label: 'Bếp' },
        { path: '/admin/history', icon: History, label: 'Lịch sử' },
        { path: '/admin/settings', icon: Settings, label: 'Cài đặt' },
    ];

    const isActive = (path: string) => {
        if (path === '/pos' && location.pathname === '/pos') return true;
        if (path !== '/pos' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className={`w-[80px] bg-white border-r border-slate-200 flex flex-col items-center py-6 h-full z-20 ${className}`}>
            {/* Logo Icon */}
            <div className="mb-8 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <UtensilsCrossed className="text-white" size={24} />
            </div>

            {/* Navigation Items */}
            <div className="flex-1 flex flex-col gap-4 w-full px-3">
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`
                                w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group
                                ${active
                                    ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                }
                            `}
                            title={item.label}
                        >
                            <item.icon
                                size={24}
                                className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}
                                strokeWidth={active ? 2.5 : 2}
                            />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* User Avatar & Logout */}
            <div className="mt-auto px-3 w-full flex flex-col gap-4">
                <div className="w-full aspect-square rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-white ring-1 ring-slate-100">
                    <span className="text-sm font-bold text-slate-600">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                </div>

                <button
                    onClick={logout}
                    className="w-full aspect-square rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Đăng xuất"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
    );
}
