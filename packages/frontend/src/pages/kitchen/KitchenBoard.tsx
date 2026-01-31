import { useState, useEffect, useMemo } from 'react';
import { Layers, LayoutGrid, RotateCcw, Check, Clock, Flame, ChefHat, Wine } from 'lucide-react';
import { api } from '../../services/api';
import type { KitchenItem, GroupedKitchenItems, Station } from '../../services/api';
import { socketService } from '../../services/socket';

type ViewMode = 'ticket' | 'item';

export default function KitchenBoard() {
    const [viewMode, setViewMode] = useState<ViewMode>('ticket');
    const [loading, setLoading] = useState(true);
    const [queue, setQueue] = useState<KitchenItem[]>([]);
    const [grouped, setGrouped] = useState<GroupedKitchenItems[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<string>('all');

    useEffect(() => {
        loadStations();
        loadQueue();
        setupSocketListeners();

        // Refresh every 30 seconds
        const interval = setInterval(loadQueue, 30000);

        return () => {
            clearInterval(interval);
            socketService.off('kitchen:new_item', handleNewItem);
            socketService.off('kitchen:status_changed', handleStatusChange);
            socketService.off('kitchen:item_cancelled', handleItemCancelled);
        };
    }, []);

    useEffect(() => {
        loadQueue();
    }, [selectedStation]);

    const loadStations = async () => {
        try {
            const res = await api.getActiveStations();
            if (res.data) {
                setStations(res.data.stations);
            }
        } catch (error) {
            console.error('Error loading stations:', error);
        }
    };

    const loadQueue = async () => {
        try {
            const stationId = selectedStation === 'all' ? undefined : selectedStation;
            const response = await api.getKitchenQueue(stationId);
            if (response.data) {
                setQueue(response.data.queue);
                setGrouped(response.data.grouped);
            }
        } catch (error) {
            console.error('Error loading queue:', error);
        } finally {
            setLoading(false);
        }
    };

    const setupSocketListeners = () => {
        socketService.on('kitchen:new_item', handleNewItem);
        socketService.on('kitchen:status_changed', handleStatusChange);
        socketService.on('kitchen:item_cancelled', handleItemCancelled);
    };

    const handleNewItem = () => {
        const audio = new Audio('/sounds/new-order.mp3');
        audio.play().catch(() => { });
        loadQueue();
    };

    const handleStatusChange = () => loadQueue();
    const handleItemCancelled = () => loadQueue();

    const handleMarkPreparing = async (itemId: string) => {
        try {
            await api.updateKitchenItemStatus(itemId, 'preparing');
            loadQueue();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleMarkReady = async (itemId: string) => {
        try {
            await api.markItemReady(itemId);
            loadQueue();
        } catch (error) {
            console.error('Error marking ready:', error);
        }
    };

    const getTimeSince = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diff = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);
        return diff;
    };

    const getTimeColor = (minutes: number) => {
        if (minutes < 10) return 'text-emerald-400';
        if (minutes < 20) return 'text-yellow-400';
        return 'text-red-400';
    };

    // Helper to get display name for table/order type
    const getTableDisplay = (item: KitchenItem) => {
        if (item.order_type === 'takeaway') return '📦 Mang về';
        if (item.order_type === 'retail') return '🏪 Tạp hóa';
        return item.table_name || `Bàn ${item.table_number || '?'}`;
    };

    // Group queue by table for Ticket View
    const tickets = useMemo(() => {
        const groupedByTable: Record<string, { table: string; tableId: string; items: KitchenItem[]; created_at: string }> = {};

        queue.forEach(item => {
            const key = `table_${item.table_id || item.order_type}_${new Date(item.order_created_at).getTime()}`;
            if (!groupedByTable[key]) {
                groupedByTable[key] = {
                    table: getTableDisplay(item),
                    tableId: item.table_id || item.order_type || 'unknown',
                    items: [],
                    created_at: item.order_created_at
                };
            }
            groupedByTable[key].items.push(item);
        });

        return Object.values(groupedByTable).sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }, [queue]);

    // Calculate stats
    const stats = useMemo(() => {
        return {
            pending: queue.filter(i => i.kitchen_status === 'pending').length,
            cooking: queue.filter(i => i.kitchen_status === 'preparing').length,
            done_1h: 0 // To be implemented
        };
    }, [queue]);

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center backdrop-blur-sm">
                <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('ticket')}
                        className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'ticket'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                            : 'text-slate-400 hover:text-white hover:bg-slate-600'
                            }`}
                    >
                        <LayoutGrid size={18} /> Ticket View
                    </button>
                    <button
                        onClick={() => setViewMode('item')}
                        className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'item'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50'
                            : 'text-slate-400 hover:text-white hover:bg-slate-600'
                            }`}
                    >
                        <Layers size={18} /> Item View
                    </button>
                </div>

                {/* Station Selector */}
                {stations.length > 0 && (
                    <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg overflow-x-auto max-w-[400px]">
                        <button
                            onClick={() => setSelectedStation('all')}
                            className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${selectedStation === 'all'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                }`}
                        >
                            <ChefHat size={16} /> All
                        </button>
                        {stations.map(station => (
                            <button
                                key={station.id}
                                onClick={() => setSelectedStation(station.id)}
                                className={`px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${selectedStation === station.id
                                    ? 'bg-opacity-100 shadow-sm text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                                style={selectedStation === station.id ? {
                                    backgroundColor: station.color,
                                    color: 'white' // Force white text for contrast on colored background
                                } : {}}
                            >
                                {station.icon === 'wine' ? <Wine size={16} /> : <ChefHat size={16} />}
                                {station.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex gap-3">
                    {/* Stats */}
                    <div className="flex gap-4 px-4 py-2 bg-slate-700/30 rounded-lg border border-slate-700">
                        <div className="text-center">
                            <span className="block text-xs text-slate-400 uppercase font-bold">Pending</span>
                            <span className="text-xl font-bold text-blue-400">{stats.pending}</span>
                        </div>
                        <div className="w-px bg-slate-600"></div>
                        <div className="text-center">
                            <span className="block text-xs text-slate-400 uppercase font-bold">Cooking</span>
                            <span className="text-xl font-bold text-yellow-400">{stats.cooking}</span>
                        </div>
                        <div className="w-px bg-slate-600"></div>
                        <div className="text-center">
                            <span className="block text-xs text-slate-400 uppercase font-bold">Total</span>
                            <span className="text-xl font-bold text-emerald-400">{queue.length}</span>
                        </div>
                    </div>

                    <button
                        onClick={loadQueue}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                    >
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-auto p-4 bg-slate-900">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <LayoutGrid size={64} className="mb-4 opacity-50" />
                        <p className="text-xl">Không có món nào đang chờ</p>
                    </div>
                ) : viewMode === 'ticket' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {tickets.map((ticket) => (
                            <div key={ticket.created_at} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl flex flex-col h-fit">
                                <div className="bg-blue-900/30 px-4 py-3 border-b border-blue-900/50 flex justify-between items-center">
                                    <span className="font-bold text-lg text-blue-200">{ticket.table}</span>
                                    <span className="text-xs font-mono bg-slate-900/50 px-2 py-1 rounded text-slate-400">
                                        {new Date(ticket.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="p-2 space-y-1">
                                    {ticket.items.map((item) => {
                                        const isCooking = item.kitchen_status === 'preparing';
                                        return (
                                            <div
                                                key={item.id}
                                                className={`p-2 rounded flex justify-between items-start group cursor-pointer transition-colors ${isCooking ? 'bg-yellow-900/20 hover:bg-yellow-900/30' : 'hover:bg-slate-700'
                                                    }`}
                                                onClick={() => isCooking ? handleMarkReady(item.id) : handleMarkPreparing(item.id)}
                                            >
                                                <div className="flex-1">
                                                    <div className={`font-medium ${isCooking ? 'text-yellow-200' : 'text-slate-200'}`}>
                                                        {item.quantity}x {item.product_name_vi || item.open_item_name}
                                                    </div>
                                                    {item.note && (
                                                        <div className="text-xs text-yellow-500 italic mt-0.5">Note: {item.note}</div>
                                                    )}
                                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                        <Clock size={10} /> {getTimeSince(item.created_at)}m
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isCooking ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500' : 'border-slate-600 bg-slate-700'
                                                    }`}>
                                                    {isCooking && <Flame size={12} fill="currentColor" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Item View */
                    <div className="max-w-4xl mx-auto space-y-2">
                        {grouped.map((group, idx) => (
                            <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-6 shadow-lg hover:border-purple-500/50 transition-colors group">
                                <div className="w-16 h-16 bg-purple-900/20 rounded-lg flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <span className="text-2xl font-bold text-purple-400 group-hover:text-white">x{group.total_qty}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-200">{group.product}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {group.items.map(item => (
                                            <span
                                                key={item.id}
                                                onClick={() => item.kitchen_status === 'preparing' ? handleMarkReady(item.id) : handleMarkPreparing(item.id)}
                                                className={`cursor-pointer px-2 py-1 rounded text-xs font-bold border ${item.kitchen_status === 'preparing'
                                                    ? 'bg-yellow-900/30 border-yellow-500 text-yellow-500 hover:bg-emerald-900/30 hover:border-emerald-500 hover:text-emerald-500'
                                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-yellow-900/30 hover:border-yellow-500 hover:text-yellow-500'
                                                    }`}
                                            >
                                                {getTableDisplay(item)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <button className="px-6 py-3 bg-slate-700 hover:bg-green-600 text-slate-300 hover:text-white rounded-lg font-bold transition-all">
                                    DONE ALL
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
