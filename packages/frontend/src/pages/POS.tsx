import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Table, Category, Product } from '../services/api';
import { socketService } from '../services/socket';
import TableMap from '../components/TableMap';
import OrderPanel from '../components/OrderPanel';
import OrderListPanel from '../components/OrderListPanel';
import PosLayout from '../components/PosLayout';
import { Loader2, UtensilsCrossed, PackageCheck, Store, ClipboardList, History, Settings, LogOut } from 'lucide-react';
import InvoiceHistory from './InvoiceHistory';

// Order mode types
type OrderMode = 'orders' | 'dine_in' | 'takeaway' | 'retail' | 'history';

const orderModes = [
    { id: 'dine_in' as OrderMode, label: 'Tại bàn', icon: UtensilsCrossed, color: 'blue' },
    { id: 'takeaway' as OrderMode, label: 'Mang về', icon: PackageCheck, color: 'orange' },
    { id: 'retail' as OrderMode, label: 'Tạp hóa', icon: Store, color: 'emerald' },
    { id: 'orders' as OrderMode, label: 'Đơn hàng', icon: ClipboardList, color: 'purple' },
    { id: 'history' as OrderMode, label: 'Lịch sử', icon: History, color: 'slate' },
];


export default function POS() {
    const [tables, setTables] = useState<Table[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [orderMode, setOrderMode] = useState<OrderMode>('dine_in');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        setupSocketListeners();

        return () => {
            // Cleanup socket listeners
            socketService.off('table:opened', handleTableUpdate);
            socketService.off('table:closed', handleTableUpdate);
        };
    }, []);

    const loadData = async () => {
        try {
            const [tablesRes, categoriesRes, productsRes] = await Promise.all([
                api.getTables(),
                api.getCategories(),
                api.getProducts(),
            ]);

            if (tablesRes.data) setTables(tablesRes.data.tables);
            if (categoriesRes.data) setCategories(categoriesRes.data.categories);
            if (productsRes.data) setProducts(productsRes.data.products);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setupSocketListeners = () => {
        socketService.on('table:opened', handleTableUpdate);
        socketService.on('table:closed', handleTableUpdate);
        socketService.on('table:transferred', handleTableUpdate);
        socketService.on('table:merged', handleTableUpdate);
        socketService.on('product:availability_changed', handleProductAvailabilityChanged);
        socketService.on('kitchen:item_ready', handleItemReady);
    };

    const handleTableUpdate = () => {
        // Reload tables when table status changes
        api.getTables().then(res => {
            if (res.data) setTables(res.data.tables);
        });
    };

    const handleProductAvailabilityChanged = (data: unknown) => {
        const { productId, is_available } = data as { productId: string; is_available: boolean };
        setProducts(prev => prev.map(p =>
            p.id === productId ? { ...p, is_available } : p
        ));
    };

    const handleItemReady = (data: unknown) => {
        const { table_number, table_name } = data as { table_number: number; table_name: string };
        // Play sound
        const audio = new Audio('/sounds/ding.mp3');
        audio.play().catch(() => { });

        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`Món xong - ${table_name || `Bàn ${table_number}`}`, {
                body: 'Có món đã sẵn sàng phục vụ!',
                icon: '/icon.png',
            });
        }
    };

    const handleTableSelect = (table: Table) => {
        setSelectedTable(table);
    };

    const handleCloseOrder = () => {
        setSelectedTable(null);
        setSelectedOrderId(null);
        loadData(); // Refresh data
    };

    // Create a virtual "table" for takeaway/retail mode
    const handleQuickOrder = () => {
        const virtualTable: Table = {
            id: `${orderMode}-${Date.now()}`,
            number: 0,
            name: orderMode === 'takeaway' ? 'Mang về' : 'Tạp hóa',
            capacity: 0,
            status: 'available',
            position_x: 0,
            position_y: 0
        };
        setSelectedTable(virtualTable);
    };

    // Handler to select an existing order (from OrderListPanel)
    const handleSelectExistingOrder = (orderId: string, orderType: 'dine_in' | 'takeaway' | 'retail') => {
        // Create a virtual table with the order ID as reference
        const virtualTable: Table = {
            id: `order-${orderId}`,
            number: 0,
            name: orderType === 'takeaway' ? 'Mang về' : orderType === 'retail' ? 'Tạp hóa' : 'Tại bàn',
            capacity: 0,
            status: 'occupied',
            current_order_id: orderId,
            position_x: 0,
            position_y: 0
        };
        setSelectedOrderId(orderId);
        setOrderMode(orderType === 'dine_in' ? 'dine_in' : orderType === 'takeaway' ? 'takeaway' : 'retail');
        setSelectedTable(virtualTable);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Check if in takeaway/retail mode (no table selection needed)
    const needsTableSelection = orderMode === 'dine_in';

    return (
        <PosLayout>
            <div className="flex flex-col flex-1 h-full w-full bg-slate-50 relative overflow-hidden">
                {/* Order Mode Switcher Header */}
                {!selectedTable && (
                    <div className="bg-white border-b border-slate-200 px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {/* Scrollable tabs for mobile */}
                                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide flex-nowrap max-w-full">
                                    {orderModes.map(mode => {
                                        const Icon = mode.icon;
                                        const isActive = orderMode === mode.id;
                                        return (
                                            <button
                                                key={mode.id}
                                                onClick={() => {
                                                    setOrderMode(mode.id);
                                                    // Clear selected table when switching modes
                                                    // User will click "Bắt đầu đơn hàng mới" to create order
                                                    setSelectedTable(null);
                                                }}
                                                className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${isActive
                                                    ? mode.color === 'purple'
                                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                                        : mode.color === 'blue'
                                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                            : mode.color === 'orange'
                                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                                                                : mode.color === 'slate'
                                                                    ? 'bg-slate-600 text-white shadow-lg shadow-slate-200'
                                                                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                                                    : 'text-slate-600 hover:bg-white'
                                                    }`}
                                            >
                                                <Icon size={16} className="flex-shrink-0" />
                                                {/* Compact on mobile, full text on larger screens */}
                                                <span className="truncate">{mode.label}</span>
                                            </button>
                                        );
                                    })}

                                </div>
                            </div>

                            {/* Right Side Actions */}
                            <div className="flex items-center gap-2">
                                {/* Settings Button */}
                                <button
                                    onClick={() => window.location.href = '/admin/settings'}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Cài đặt"
                                >
                                    <Settings size={20} />
                                </button>

                                {/* User Profile & Logout */}
                                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                                    {/* Avatar - Click to logout or show menu */}
                                    <div className="relative group">
                                        <button className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors">
                                            <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                                                U
                                            </div>
                                            <div className="text-left hidden md:block">
                                                <p className="text-sm font-bold text-slate-700 leading-none">Admin</p>
                                                <p className="text-[11px] text-slate-400 mt-1">Owner</p>
                                            </div>
                                        </button>
                                        {/* Simple Logout Dropdown on Hover/Click */}
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover:block z-50">
                                            <button
                                                onClick={() => {
                                                    localStorage.removeItem('token');
                                                    localStorage.removeItem('user');
                                                    window.location.href = '/login';
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                <LogOut size={16} />
                                                Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                    {/* Orders View Mode */}
                    {orderMode === 'orders' && !selectedTable && (
                        <div className="flex-1 bg-white">
                            <OrderListPanel
                                onSelectOrder={handleSelectExistingOrder}
                                categories={categories}
                                products={products}
                            />
                        </div>
                    )}

                    {/* History View Mode */}
                    {orderMode === 'history' && !selectedTable && (
                        <div className="flex-1 bg-white overflow-auto">
                            <InvoiceHistory />
                        </div>
                    )}

                    {/* Order Panel (when order is selected from any mode) */}
                    {selectedTable && (
                        <div className="flex-1 overflow-hidden bg-white">
                            <OrderPanel
                                table={selectedTable}
                                categories={categories}
                                products={products}
                                onClose={handleCloseOrder}
                                orderType={orderMode === 'orders' || orderMode === 'history' ? 'dine_in' : orderMode}
                            />
                        </div>
                    )}

                    {/* Table Map (dine_in mode without selected table) */}
                    {orderMode === 'dine_in' && !selectedTable && (
                        <div className="flex-1 p-4 overflow-y-auto">
                            <TableMap
                                tables={tables}
                                selectedTable={selectedTable}
                                onTableSelect={handleTableSelect}
                            />
                        </div>
                    )}

                    {/* Takeaway/Retail empty state (shouldn't normally show because we auto-create) */}
                    {(orderMode === 'takeaway' || orderMode === 'retail') && !selectedTable && (
                        <div className="flex-1 bg-white">
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <Store size={64} className="mb-4 text-slate-300" />
                                <p className="text-lg mb-4">
                                    {orderMode === 'takeaway' ? 'Chế độ Mang về' : 'Chế độ Tạp hóa'}
                                </p>
                                <button
                                    onClick={handleQuickOrder}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                                >
                                    Bắt đầu đơn hàng mới
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PosLayout>
    );
}
