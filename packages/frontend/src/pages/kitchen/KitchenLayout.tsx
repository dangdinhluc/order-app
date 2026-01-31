import React from 'react';
import { Outlet, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { ChefHat, Wifi, WifiOff, History, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';

function NavLink({ to, label, icon, end = false }: { to: string; label: string; icon: React.ReactNode; end?: boolean }) {
    const location = useLocation();
    const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

    return (
        <RouterNavLink
            to={to}
            end={end}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
        >
            {icon}
            {label}
        </RouterNavLink>
    );
}

export default function KitchenLayout({ children }: { children?: React.ReactNode }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isConnected, setIsConnected] = useState(true); // Placeholder for socket status

    useEffect(() => {
        // Clock timer
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            {/* Header */}
            <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-md">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-500 p-1.5 rounded-lg">
                            <ChefHat className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-orange-400">Smart Kitchen</h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex gap-1">
                        <NavLink to="/kitchen" end label="Đang chờ" icon={<Layers size={18} />} />
                        <NavLink to="/kitchen/history" label="Lịch sử" icon={<History size={18} />} />
                    </nav>
                </div>

                <div className="flex items-center gap-6">
                    {/* Clock */}
                    <div className="text-2xl font-mono font-bold text-slate-300">
                        {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${isConnected ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-red-900/50 text-red-400 border border-red-800'
                        }`}>
                        {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden relative">
                {children || <Outlet />}
            </main>
        </div>
    );
}
