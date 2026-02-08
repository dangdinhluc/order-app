import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, LayoutGrid, RotateCcw, Clock, Flame, ChefHat, Wine, CheckCircle, Maximize, Minimize, AlertTriangle, Zap, Volume2, VolumeX } from 'lucide-react';
import { api } from '../../services/api';
import type { KitchenItem, GroupedKitchenItems, Station } from '../../services/api';
import { socketService } from '../../services/socket';

type ViewMode = 'ticket' | 'item';
type FontSize = 'normal' | 'large' | 'xlarge';

export default function KitchenBoard() {
    const [viewMode, setViewMode] = useState<ViewMode>('ticket');
    const [loading, setLoading] = useState(true);
    const [queue, setQueue] = useState<KitchenItem[]>([]);
    const [grouped, setGrouped] = useState<GroupedKitchenItems[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<string>('all');

    // Phase 1 new states
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState<FontSize>('normal');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Real-time timer - update every second
    useEffect(() => {
        const timerInterval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(timerInterval);
    }, []);

    useEffect(() => {
        // Connect socket and join kitchen room
        socketService.connect();

        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.id) {
            socketService.joinRoom('kitchen', user.id);
            console.log('👨‍🍳 Joined kitchen room:', user.id);
        }

        loadStations();
        loadQueue();
        setupSocketListeners();

        const interval = setInterval(loadQueue, 15000);

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

    // Fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

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
        if (soundEnabled) {
            const audio = new Audio('/sounds/new-order.mp3');
            audio.play().catch(() => { });
        }
        loadQueue();
    };

    const handleStatusChange = () => loadQueue();
    const handleItemCancelled = () => loadQueue();

    const handleMarkReady = async (itemId: string) => {
        try {
            await api.markItemReady(itemId);
            loadQueue();
        } catch (error) {
            console.error('Error marking ready:', error);
        }
    };

    // Real-time timer calculation
    const getTimeSince = useCallback((createdAt: string | undefined) => {
        if (!createdAt) return 0;
        const created = new Date(createdAt).getTime();
        const diff = Math.floor((currentTime - created) / 1000 / 60);
        return diff < 0 ? 0 : diff;
    }, [currentTime]);

    // Priority level based on wait time
    const getPriorityLevel = (minutes: number): 'urgent' | 'warning' | 'normal' | 'new' => {
        if (minutes >= 20) return 'urgent';
        if (minutes >= 15) return 'warning';
        if (minutes < 5) return 'new';
        return 'normal';
    };

    const getPriorityStyles = (minutes: number) => {
        const priority = getPriorityLevel(minutes);
        switch (priority) {
            case 'urgent':
                return {
                    border: 'border-red-500 animate-pulse',
                    bg: 'bg-red-900/30',
                    text: 'text-red-400',
                    badge: 'bg-red-500 text-white',
                    icon: <AlertTriangle size={14} className="animate-bounce" />
                };
            case 'warning':
                return {
                    border: 'border-orange-500',
                    bg: 'bg-orange-900/20',
                    text: 'text-orange-400',
                    badge: 'bg-orange-500 text-white',
                    icon: <Zap size={14} />
                };
            case 'new':
                return {
                    border: 'border-emerald-500/50',
                    bg: 'bg-emerald-900/10',
                    text: 'text-emerald-400',
                    badge: 'bg-emerald-500 text-white',
                    icon: null
                };
            default:
                return {
                    border: 'border-slate-700',
                    bg: '',
                    text: 'text-slate-400',
                    badge: 'bg-slate-600 text-slate-200',
                    icon: null
                };
        }
    };

    // Font size classes based on setting
    const getFontClasses = () => {
        switch (fontSize) {
            case 'xlarge':
                return {
                    header: 'text-3xl',
                    title: 'text-2xl',
                    item: 'text-xl',
                    small: 'text-base',
                    timer: 'text-4xl',
                    button: 'px-6 py-4 text-lg'
                };
            case 'large':
                return {
                    header: 'text-2xl',
                    title: 'text-xl',
                    item: 'text-lg',
                    small: 'text-sm',
                    timer: 'text-3xl',
                    button: 'px-5 py-3 text-base'
                };
            default:
                return {
                    header: 'text-lg',
                    title: 'text-base',
                    item: 'text-sm',
                    small: 'text-xs',
                    timer: 'text-xl',
                    button: 'px-3 py-1.5 text-xs'
                };
        }
    };

    const fonts = getFontClasses();

    // Helper to get display name for table/order type
    const getTableDisplay = (item: KitchenItem) => {
        if (item.order_type === 'takeaway') return '📦 Mang về';
        if (item.order_type === 'retail') return '🏪 Tạp hóa';
        return item.table_name || `Bàn ${item.table_number || '?'}`;
    };

    // Group queue by table for Ticket View - sorted by priority
    const tickets = useMemo(() => {
        const groupedByTable: Record<string, { table: string; tableId: string; items: KitchenItem[]; created_at: string; maxWaitTime: number }> = {};

        queue.forEach(item => {
            const key = `table_${item.table_id || item.order_type}_${new Date(item.order_created_at).getTime()}`;
            const waitTime = getTimeSince(item.created_at);

            if (!groupedByTable[key]) {
                groupedByTable[key] = {
                    table: getTableDisplay(item),
                    tableId: item.table_id || item.order_type || 'unknown',
                    items: [],
                    created_at: item.order_created_at,
                    maxWaitTime: waitTime
                };
            }
            groupedByTable[key].items.push(item);
            groupedByTable[key].maxWaitTime = Math.max(groupedByTable[key].maxWaitTime, waitTime);
        });

        // Sort by priority (longest wait first)
        return Object.values(groupedByTable).sort((a, b) => b.maxWaitTime - a.maxWaitTime);
    }, [queue, currentTime]);

    // Separate urgent tickets
    const urgentTickets = tickets.filter(t => t.maxWaitTime >= 15);
    const normalTickets = tickets.filter(t => t.maxWaitTime < 15);

    // Calculate stats
    const stats = useMemo(() => {
        const times = queue.map(i => getTimeSince(i.created_at));
        const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

        return {
            pending: queue.filter(i => i.kitchen_status === 'pending').length,
            cooking: queue.filter(i => i.kitchen_status === 'preparing').length,
            avgTime
        };
    }, [queue, currentTime]);

    // Handle complete all items in a group
    const handleCompleteAllGroup = async (items: KitchenItem[]) => {
        try {
            for (const item of items) {
                if (item.kitchen_status === 'preparing') {
                    await api.markItemReady(item.id);
                }
            }
            loadQueue();
        } catch (error) {
            console.error('Error completing group:', error);
        }
    };

    // Render ticket card
    const renderTicket = (ticket: typeof tickets[0]) => {
        const priorityStyles = getPriorityStyles(ticket.maxWaitTime);

        return (
            <div
                key={ticket.created_at}
                className={`bg-slate-800 rounded-xl border-2 ${priorityStyles.border} overflow-hidden shadow-xl flex flex-col h-fit ${priorityStyles.bg}`}
            >
                {/* Ticket Header */}
                <div className={`px-4 py-3 border-b border-slate-700 flex justify-between items-center ${ticket.maxWaitTime >= 15 ? 'bg-gradient-to-r from-red-900/50 to-orange-900/50' : 'bg-blue-900/30'}`}>
                    <div className="flex items-center gap-2">
                        {priorityStyles.icon}
                        <span className={`font-bold ${fonts.title} text-blue-200`}>{ticket.table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`${fonts.timer} font-mono font-bold ${priorityStyles.text}`}>
                            {ticket.maxWaitTime}p
                        </span>
                    </div>
                </div>

                {/* Items */}
                <div className="p-2 space-y-1.5">
                    {ticket.items.map((item) => {
                        const isCooking = item.kitchen_status === 'preparing';
                        const itemTime = getTimeSince(item.created_at);
                        const itemPriority = getPriorityStyles(itemTime);

                        return (
                            <div
                                key={item.id}
                                className={`p-3 rounded-lg flex justify-between items-start gap-2 cursor-pointer transition-all ${isCooking
                                    ? 'bg-yellow-900/30 hover:bg-green-900/40 border border-yellow-600/50'
                                    : `bg-slate-700/50 hover:bg-yellow-900/30 border ${itemPriority.border}`
                                    }`}
                                onClick={() => handleMarkReady(item.id)}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className={`font-bold ${fonts.item} ${isCooking ? 'text-yellow-200' : 'text-slate-200'}`}>
                                        <span className="text-blue-400">{item.quantity}x</span> {item.product_name_vi || item.open_item_name}
                                    </div>
                                    {item.note && (
                                        <div className={`${fonts.small} text-orange-400 italic mt-1 truncate`}>
                                            📝 {item.note}
                                        </div>
                                    )}
                                    <div className={`${fonts.small} mt-1.5 flex items-center gap-1.5 ${itemPriority.text}`}>
                                        <Clock size={12} />
                                        <span className="font-mono font-bold">{itemTime}</span> phút
                                        {itemTime >= 15 && <Zap size={12} className="text-orange-400" />}
                                    </div>
                                </div>
                                <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isCooking
                                    ? 'border-yellow-500 bg-yellow-500/30 text-yellow-400'
                                    : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-yellow-500 hover:text-yellow-400'
                                    }`}>
                                    {isCooking ? <Flame size={20} fill="currentColor" /> : <ChefHat size={18} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-900">
            {/* Toolbar */}
            <div className={`px-3 sm:px-6 py-2 sm:py-3 bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm ${isFullscreen ? 'hidden' : ''}`}>
                {/* Top Row */}
                <div className="flex justify-between items-center gap-2 flex-wrap">
                    {/* View Mode Tabs */}
                    <div className="flex gap-1 bg-slate-700/50 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('ticket')}
                            className={`${fonts.button} rounded-md flex items-center gap-1.5 font-bold transition-all ${viewMode === 'ticket'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                }`}
                        >
                            <LayoutGrid size={16} /> Theo bàn
                        </button>
                        <button
                            onClick={() => setViewMode('item')}
                            className={`${fonts.button} rounded-md flex items-center gap-1.5 font-bold transition-all ${viewMode === 'item'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                }`}
                        >
                            <Layers size={16} /> Theo món
                        </button>
                    </div>

                    {/* Font Size Selector */}
                    <div className="flex gap-1 bg-slate-700/50 p-1 rounded-lg">
                        {(['normal', 'large', 'xlarge'] as FontSize[]).map(size => (
                            <button
                                key={size}
                                onClick={() => setFontSize(size)}
                                className={`px-2 py-1 rounded text-xs font-bold transition-all ${fontSize === size
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                            >
                                {size === 'normal' ? 'A' : size === 'large' ? 'A+' : 'A++'}
                            </button>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-2 sm:gap-4 px-3 py-2 bg-slate-700/30 rounded-lg border border-slate-700">
                        <div className="text-center">
                            <span className={`block ${fonts.small} text-slate-400 uppercase font-bold`}>Chờ</span>
                            <span className={`${fonts.timer} font-bold text-blue-400`}>{stats.pending}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-600"></div>
                        <div className="text-center">
                            <span className={`block ${fonts.small} text-slate-400 uppercase font-bold`}>Nấu</span>
                            <span className={`${fonts.timer} font-bold text-yellow-400`}>{stats.cooking}</span>
                        </div>
                        <div className="w-px h-8 bg-slate-600"></div>
                        <div className="text-center">
                            <span className={`block ${fonts.small} text-slate-400 uppercase font-bold`}>TB</span>
                            <span className={`${fonts.timer} font-bold text-emerald-400`}>{stats.avgTime}p</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`p-2 rounded-lg transition-colors ${soundEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'}`}
                            title={soundEnabled ? 'Tắt âm' : 'Bật âm'}
                        >
                            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                        </button>
                        <button
                            onClick={loadQueue}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                            title="Làm mới"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                        >
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </div>
                </div>

                {/* Station Selector */}
                {stations.length > 0 && (
                    <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setSelectedStation('all')}
                            className={`${fonts.button} rounded flex items-center gap-1.5 font-bold transition-all whitespace-nowrap flex-shrink-0 ${selectedStation === 'all'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600'
                                }`}
                        >
                            <ChefHat size={14} /> Tất cả
                        </button>
                        {stations.map(station => (
                            <button
                                key={station.id}
                                onClick={() => setSelectedStation(station.id)}
                                className={`${fonts.button} rounded flex items-center gap-1.5 font-bold transition-all whitespace-nowrap flex-shrink-0 ${selectedStation === station.id
                                    ? 'shadow-sm text-white'
                                    : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600'
                                    }`}
                                style={selectedStation === station.id ? { backgroundColor: station.color } : {}}
                            >
                                {station.icon === 'wine' ? <Wine size={14} /> : <ChefHat size={14} />}
                                {station.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Fullscreen Header - compact */}
            {isFullscreen && (
                <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className={`${fonts.header} font-bold text-white`}>🍳 Bếp</span>
                        <span className={`${fonts.title} text-blue-400`}>Chờ: {stats.pending}</span>
                        <span className={`${fonts.title} text-yellow-400`}>Nấu: {stats.cooking}</span>
                        <span className={`${fonts.title} text-emerald-400`}>TB: {stats.avgTime}p</span>
                    </div>
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
                    >
                        <Minimize size={20} />
                    </button>
                </div>
            )}

            {/* Board Area */}
            <div className="flex-1 overflow-auto p-2 sm:p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                ) : queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <CheckCircle size={80} className="mb-4 text-emerald-500" />
                        <p className={`${fonts.header} font-bold text-emerald-400`}>Không có món đang chờ</p>
                        <p className={`${fonts.title} text-slate-500 mt-2`}>Tất cả đã hoàn thành! 🎉</p>
                    </div>
                ) : viewMode === 'ticket' ? (
                    <div className="space-y-4">
                        {/* Urgent Section */}
                        {urgentTickets.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertTriangle className="text-red-500 animate-pulse" size={24} />
                                    <h2 className={`${fonts.header} font-bold text-red-400`}>
                                        ⚡ ƯU TIÊN CAO ({urgentTickets.length} bàn chờ &gt;15 phút)
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {urgentTickets.map(renderTicket)}
                                </div>
                            </div>
                        )}

                        {/* Normal Section */}
                        {normalTickets.length > 0 && (
                            <div>
                                {urgentTickets.length > 0 && (
                                    <h2 className={`${fonts.title} font-bold text-slate-400 mb-3`}>
                                        📋 Đang chờ ({normalTickets.length} bàn)
                                    </h2>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {normalTickets.map(renderTicket)}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Item View */
                    <div className="max-w-4xl mx-auto space-y-3">
                        {grouped.map((group, idx) => (
                            <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col sm:flex-row sm:items-center gap-4 shadow-lg hover:border-purple-500/50 transition-colors">
                                <div className="flex sm:block items-center gap-4">
                                    <div className="w-16 h-16 bg-purple-900/30 rounded-lg flex items-center justify-center border border-purple-500/30">
                                        <span className={`${fonts.timer} font-bold text-purple-400`}>x{group.total_qty}</span>
                                    </div>
                                    <h3 className={`${fonts.title} font-bold text-slate-200 sm:hidden`}>{group.product}</h3>
                                </div>

                                <div className="flex-1">
                                    <h3 className={`${fonts.title} font-bold text-slate-200 hidden sm:block`}>{group.product}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {group.items.map(item => {
                                            const itemTime = getTimeSince(item.created_at);
                                            const itemPriority = getPriorityStyles(itemTime);
                                            return (
                                                <span
                                                    key={item.id}
                                                    onClick={() => handleMarkReady(item.id)}
                                                    className={`cursor-pointer px-3 py-1.5 rounded ${fonts.small} font-bold border-2 transition-all flex items-center gap-1 ${item.kitchen_status === 'preparing'
                                                        ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400 hover:bg-emerald-900/40 hover:border-emerald-500'
                                                        : `bg-slate-700 ${itemPriority.border} ${itemPriority.text} hover:bg-yellow-900/30`
                                                        }`}
                                                >
                                                    {itemPriority.icon}
                                                    {getTableDisplay(item)}
                                                    <span className="opacity-60 ml-1">{itemTime}p</span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleCompleteAllGroup(group.items.filter(i => i.kitchen_status === 'preparing'))}
                                    className={`w-full sm:w-auto ${fonts.button} bg-slate-700 hover:bg-green-600 text-slate-300 hover:text-white rounded-lg font-bold transition-all`}
                                >
                                    ✓ Xong tất cả
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
