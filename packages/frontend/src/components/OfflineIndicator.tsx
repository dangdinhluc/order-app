import { useState, useEffect } from 'react';
import { isOnline, onOnlineStatusChange } from '../services/pwa';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
    const [online, setOnline] = useState(isOnline());
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const cleanup = onOnlineStatusChange((status) => {
            setOnline(status);
            if (!status) {
                setShowBanner(true);
            } else {
                // Auto hide after 3 seconds when back online
                setTimeout(() => setShowBanner(false), 3000);
            }
        });

        return cleanup;
    }, []);

    if (!showBanner) return null;

    return (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl 
                        flex items-center gap-2 shadow-lg transition-all duration-300
                        ${online
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'}`}
        >
            {online ? (
                <>
                    <Wifi size={18} />
                    <span className="text-sm font-medium">Đã kết nối lại!</span>
                </>
            ) : (
                <>
                    <WifiOff size={18} />
                    <span className="text-sm font-medium">Đang offline - một số tính năng có thể hạn chế</span>
                </>
            )}
        </div>
    );
}
