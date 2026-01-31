import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutGrid,
    UtensilsCrossed,
    Receipt,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    ChefHat,
    Users,
    Activity,
    DollarSign,
    History
} from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [notifications] = useState<string[]>([]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/pos', icon: LayoutGrid, label: 'Bàn & Order', roles: ['owner', 'cashier'] },
        { path: '/kitchen', icon: ChefHat, label: 'Bếp (KDS)', roles: ['owner', 'kitchen'] },
        { path: '/orders', icon: Receipt, label: 'Đơn hàng', roles: ['owner', 'cashier'] },
        { path: '/admin/history', icon: History, label: 'Lịch sử đơn', roles: ['owner', 'cashier'] },
        { path: '/dashboard', icon: BarChart3, label: 'Dashboard', roles: ['owner'] },
    ];

    const adminItems = [
        { path: '/admin/menu', icon: UtensilsCrossed, label: 'Quản lý Menu', roles: ['owner'] },
        { path: '/admin/tables', icon: LayoutGrid, label: 'Quản lý Bàn', roles: ['owner'] },
        { path: '/admin/staff', icon: Users, label: 'Quản lý Nhân viên', roles: ['owner'] },
        { path: '/reports', icon: BarChart3, label: 'Báo cáo', roles: ['owner'] },
        { path: '/cash', icon: DollarSign, label: 'Sổ quỹ', roles: ['owner'] },
        { path: '/audit', icon: Activity, label: 'Nhật ký', roles: ['owner'] },
        { path: '/admin/settings/customer', icon: LayoutGrid, label: 'Giao diện khách', roles: ['owner'] },
        { path: '/settings', icon: Settings, label: 'Cài đặt', roles: ['owner'] },
    ];

    const filteredNavItems = navItems.filter(item =>
        item.roles.includes(user?.role || '')
    );

    const filteredAdminItems = adminItems.filter(item =>
        item.roles.includes(user?.role || '')
    );

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'owner': return 'Chủ quán';
            case 'cashier': return 'Thu ngân';
            case 'kitchen': return 'Bếp';
            default: return role;
        }
    };

    const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/settings') || location.pathname.startsWith('/reports') || location.pathname.startsWith('/cash') || location.pathname.startsWith('/audit');

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar - Clean Modern Style */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${isAdminRoute ? 'bg-gradient-to-br from-slate-700 to-slate-800' : 'bg-gradient-to-br from-blue-500 to-blue-600'}`}>
                                <span className="text-xl">{isAdminRoute ? '⚙️' : '🍜'}</span>
                            </div>
                            {isSidebarOpen && (
                                <div>
                                    <h1 className="text-slate-800 font-bold">{isAdminRoute ? 'Admin Panel' : 'Hybrid POS'}</h1>
                                    <p className="text-slate-400 text-xs">{user?.name}</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden text-slate-400 hover:text-slate-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Main Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {/* Operational Menu - Hide if in Admin Route */}
                        {!isAdminRoute && (
                            <>
                                <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {isSidebarOpen && 'Menu chính'}
                                </p>
                                {filteredNavItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                                ? 'bg-blue-50 text-blue-600 font-medium'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                        >
                                            <Icon size={20} className={isActive ? 'text-blue-600' : ''} />
                                            {isSidebarOpen && <span>{item.label}</span>}
                                        </Link>
                                    );
                                })}
                            </>
                        )}

                        {/* Admin Section - Always show if allowed, but style differently if in Admin Mode */}
                        {filteredAdminItems.length > 0 && (
                            <>
                                <div className={`pb-2 ${!isAdminRoute ? 'pt-4 border-t border-slate-100 mt-4' : ''}`}>
                                    <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        {isSidebarOpen && 'Quản trị'}
                                    </p>
                                </div>
                                {filteredAdminItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;

                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                                ? 'bg-slate-100 text-slate-900 font-bold shadow-sm'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                        >
                                            <Icon size={20} className={isActive ? 'text-slate-800' : ''} />
                                            {isSidebarOpen && <span>{item.label}</span>}
                                        </Link>
                                    );
                                })}
                            </>
                        )}
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-100 space-y-2">
                        {/* Switch Context Button */}
                        {isAdminRoute ? (
                            <Link
                                to="/pos"
                                className="flex items-center gap-3 px-3 py-2.5 w-full bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all font-medium"
                            >
                                <LayoutGrid size={20} />
                                {isSidebarOpen && <span>Về POS Bán Hàng</span>}
                            </Link>
                        ) : (
                            user?.role === 'owner' && (
                                <Link
                                    to="/admin/dashboard"
                                    className="flex items-center gap-3 px-3 py-2.5 w-full bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-all font-medium"
                                >
                                    <Settings size={20} />
                                    {isSidebarOpen && <span>Vào Trang Quản Trị</span>}
                                </Link>
                            )
                        )}

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2.5 w-full text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                        >
                            <LogOut size={20} />
                            {isSidebarOpen && <span>Đăng xuất</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="lg:hidden text-slate-600 hover:text-slate-900"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        {/* Notifications */}
                        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
                            <Bell size={20} />
                            {notifications.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {notifications.length}
                                </span>
                            )}
                        </button>

                        {/* User info */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                {user?.name?.charAt(0)}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-sm font-medium text-slate-800">{user?.name}</p>
                                <p className="text-xs text-slate-500">
                                    {getRoleLabel(user?.role || '')}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>

            {/* Mobile sidebar overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}
