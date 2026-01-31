import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutGrid,
    History,
    Settings,
    LogOut,
    ChefHat
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PosMobileNavProps {
    className?: string;
}

export default function PosMobileNav({ className = '' }: PosMobileNavProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

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
        <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 ${className}`}>
            <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-xl transition-all ${active
                                    ? 'text-blue-600'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-100' : ''
                                }`}>
                                <item.icon
                                    size={22}
                                    strokeWidth={active ? 2.5 : 2}
                                />
                            </div>
                            <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : ''
                                }`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Logout button */}
                <button
                    onClick={logout}
                    className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-xl text-red-400 hover:text-red-500 transition-all"
                >
                    <div className="p-1.5 rounded-xl">
                        <LogOut size={22} strokeWidth={2} />
                    </div>
                    <span className="text-[10px] font-medium">Thoát</span>
                </button>
            </div>
        </nav>
    );
}
