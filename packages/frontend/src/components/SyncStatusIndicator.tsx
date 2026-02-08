import { useState, useEffect } from 'react';
import { Cloud, Database, Wifi, AlertTriangle, RefreshCcw } from 'lucide-react';
import { offlineStore } from '../utils/offlineStore';

// Get API URL from env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SyncStatusIndicator() {
    const [info, setInfo] = useState<{ deploymentMode: string } | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingServer, setPendingServer] = useState(0);
    const [pendingLocal, setPendingLocal] = useState(0);

    useEffect(() => {
        // 1. Fetch server info
        const fetchInfo = async () => {
            try {
                const response = await fetch(`${API_URL}/api/info`);
                const data = await response.json();
                setInfo(data);
            } catch (err) {
                console.error('Failed to fetch server info', err);
            }
        };

        // 2. Fetch pending counts
        const updateCounts = async () => {
            // Fetch from server
            try {
                const response = await fetch(`${API_URL}/api/sync/pending-count`);
                const data = await response.json();
                setPendingServer(data.count || 0);
            } catch (error) {
                // Server might be unreachable
            }

            // Fetch from local IndexedDB
            try {
                const pending = await offlineStore.getAllPending();
                setPendingLocal(pending.length);
            } catch (err) {
                console.error('Failed to read local store', err);
            }
        };

        fetchInfo();
        updateCounts();
        const interval = setInterval(updateCounts, 5000); // Poll faster (5s) for better UX

        // 3. Handle online status
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, []);

    const isLocal = info?.deploymentMode === 'local';

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
            {isLocal ? (
                <div className="flex items-center gap-2 text-blue-600" title="Đang chạy bản Local tại quán">
                    <Database size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Local</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-indigo-600" title="Đang chạy bản Cloud (VPS)">
                    <Cloud size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Cloud</span>
                </div>
            )}

            <div className="w-px h-3 bg-slate-200" />

            {isOnline ? (
                <div className="flex items-center gap-1.5 text-green-500" title="Đã kết nối Internet">
                    <Wifi size={14} />
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-red-500" title="Mất kết nối Internet">
                    <AlertTriangle size={14} />
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                </div>
            )}

            {(pendingLocal > 0 || pendingServer > 0) && (
                <div className="flex items-center gap-1.5 ml-1">
                    {pendingLocal > 0 && (
                        <div className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full animate-bounce flex items-center gap-1 shadow-sm" title="Đơn hàng đang chờ đồng bộ từ máy này">
                            <RefreshCcw size={10} className="animate-spin" />
                            {pendingLocal}
                        </div>
                    )}
                    {pendingServer > 0 && (
                        <div className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-md" title="Đơn hàng đang chờ xử lý trên hệ thống">
                            +{pendingServer}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
