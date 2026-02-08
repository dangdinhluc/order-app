import { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import {
    Clock, LogIn, LogOut, Loader2, Coffee, Check, History
} from 'lucide-react';

interface ClockEntry {
    id: string;
    user_id: string;
    user_name?: string;
    clock_in: string;
    clock_out: string | null;
    break_minutes: number;
    total_hours: number | null;
    note?: string;
}

export default function TimeClock() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [currentClock, setCurrentClock] = useState<ClockEntry | null>(null);
    const [history, setHistory] = useState<ClockEntry[]>([]);
    const [isClocking, setIsClocking] = useState(false);
    const [breakMinutes, setBreakMinutes] = useState(0);
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        loadData();

        // Update time every second
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('token');

            // Get current clock status
            const currentRes = await fetch(`${baseUrl}/api/scheduling/time-clock/current`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const currentData = await currentRes.json();
            setCurrentClock(currentData.data || null);

            // Get history
            const historyRes = await fetch(`${baseUrl}/api/scheduling/time-clock/history?limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const historyData = await historyRes.json();
            setHistory(historyData.data || []);
        } catch (error) {
            console.error('Failed to load time clock data:', error);
        }
        setIsLoading(false);
    };

    const handleClockIn = async () => {
        setIsClocking(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await fetch(`${baseUrl}/api/scheduling/time-clock/in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({})
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Đã chấm công vào', 'Chúc bạn làm việc vui vẻ!');
                loadData();
            } else {
                // Fix: Read detailed error message correctly
                const msg = data.error?.message || data.message || 'Thất bại';
                throw new Error(msg);
            }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error('Lỗi', error.message || 'Không thể chấm công');
            // Refresh data to sync state with backend (e.g. if DB was reset)
            loadData();
        }
        setIsClocking(false);
    };

    const handleClockOut = async () => {
        setIsClocking(true);
        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const res = await fetch(`${baseUrl}/api/scheduling/time-clock/out`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ break_minutes: breakMinutes })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Đã chấm công ra', `Tổng: ${Number(data.data.total_hours)?.toFixed(1)} giờ`);
                setShowBreakModal(false);
                setBreakMinutes(0);
                loadData();
            } else {
                // Fix: Read detailed error message correctly
                const msg = data.error?.message || data.message || 'Thất bại';
                throw new Error(msg);
            }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error('Lỗi', error.message || 'Không thể chấm công');
            // Refresh data to sync state with backend (e.g. if DB was reset)
            loadData();
            setShowBreakModal(false); // Close modal on error
        }
        setIsClocking(false);
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const getElapsedTime = () => {
        if (!currentClock) return { hours: 0, minutes: 0, seconds: 0 };

        const start = new Date(currentClock.clock_in).getTime();
        const now = currentTime.getTime();
        const elapsed = Math.floor((now - start) / 1000);

        return {
            hours: Math.floor(elapsed / 3600),
            minutes: Math.floor((elapsed % 3600) / 60),
            seconds: elapsed % 60
        };
    };

    const elapsed = getElapsedTime();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center justify-center gap-2">
                    <Clock className="text-blue-500" />
                    Chấm công
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                    {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Current Time Display */}
            <div className="text-center py-4">
                <div className="text-5xl font-mono font-bold text-slate-800">
                    {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
            </div>

            {/* Clock Status Card */}
            <div className={`p-6 rounded-2xl ${currentClock ? 'bg-green-50 border-2 border-green-200' : 'bg-white border border-slate-200'}`}>
                {currentClock ? (
                    <div className="text-center space-y-4">
                        <div className="text-green-600 font-semibold flex items-center justify-center gap-2">
                            <Check size={20} />
                            Đang trong ca làm việc
                        </div>
                        <div className="text-sm text-slate-600">
                            Bắt đầu lúc: {formatTime(currentClock.clock_in)}
                        </div>

                        {/* Elapsed Time */}
                        <div className="bg-white rounded-xl p-4 inline-block">
                            <div className="text-3xl font-mono font-bold text-green-600">
                                {String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}:{String(elapsed.seconds).padStart(2, '0')}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">Thời gian làm việc</div>
                        </div>

                        <button
                            onClick={() => setShowBreakModal(true)}
                            disabled={isClocking}
                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition disabled:bg-slate-300"
                        >
                            {isClocking ? <Loader2 className="animate-spin" /> : <LogOut size={24} />}
                            Chấm công ra
                        </button>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="text-slate-500 font-medium">
                            Bạn chưa chấm công hôm nay
                        </div>

                        <button
                            onClick={handleClockIn}
                            disabled={isClocking}
                            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition disabled:bg-slate-300"
                        >
                            {isClocking ? <Loader2 className="animate-spin" /> : <LogIn size={24} />}
                            Chấm công vào
                        </button>
                    </div>
                )}
            </div>

            {/* Recent History */}
            <div className="bg-white rounded-2xl border p-4">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <History size={18} className="text-slate-500" />
                    Lịch sử gần đây
                </h3>

                {history.length === 0 ? (
                    <p className="text-center text-slate-400 py-4">Chưa có lịch sử chấm công</p>
                ) : (
                    <div className="space-y-3">
                        {history.map(entry => (
                            <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                <div>
                                    <div className="font-medium text-slate-700">{formatDate(entry.clock_in)}</div>
                                    <div className="text-sm text-slate-500">
                                        {formatTime(entry.clock_in)} - {entry.clock_out ? formatTime(entry.clock_out) : 'Đang làm...'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    {entry.total_hours !== null ? (
                                        <span className="text-green-600 font-semibold">
                                            {Number(entry.total_hours).toFixed(1)}h
                                        </span>
                                    ) : (
                                        <span className="text-amber-500 text-sm">Đang làm</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Break Minutes Modal */}
            {showBreakModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBreakModal(false)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Coffee className="text-amber-500" />
                            Thời gian nghỉ
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Bạn đã nghỉ bao nhiêu phút? (ăn trưa, giải lao...)
                                </label>
                                <input
                                    type="number"
                                    value={breakMinutes}
                                    onChange={e => setBreakMinutes(parseInt(e.target.value) || 0)}
                                    min="0"
                                    max="180"
                                    className="w-full px-4 py-3 border rounded-xl text-center text-2xl font-bold focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-slate-500 mt-1 text-center">phút</p>
                            </div>

                            <div className="flex gap-2">
                                {[0, 15, 30, 45, 60].map(mins => (
                                    <button
                                        key={mins}
                                        onClick={() => setBreakMinutes(mins)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${breakMinutes === mins
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                    >
                                        {mins}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowBreakModal(false)}
                                className="flex-1 px-4 py-2.5 border rounded-xl text-slate-600 hover:bg-slate-50 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleClockOut}
                                disabled={isClocking}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:bg-slate-300 transition flex items-center justify-center gap-2"
                            >
                                {isClocking ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
