import { useState, useEffect } from 'react';
import { initInstallPrompt, isInstallPromptAvailable, promptInstall, isPWAInstalled } from '../services/pwa';
import { Download, X } from 'lucide-react';

export default function InstallPWA() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (isPWAInstalled()) {
            setIsInstalled(true);
            return;
        }

        // Check if previously dismissed
        const wasDismissed = localStorage.getItem('pwa-install-dismissed');
        if (wasDismissed) {
            const dismissedDate = new Date(wasDismissed);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            // Show again after 7 days
            if (daysSinceDismissed < 7) {
                setDismissed(true);
                return;
            }
        }

        // Initialize install prompt
        initInstallPrompt();

        // Listen for install availability
        const handleInstallAvailable = () => {
            setShowPrompt(true);
        };

        window.addEventListener('installAvailable', handleInstallAvailable);

        // Check if already available
        if (isInstallPromptAvailable()) {
            setShowPrompt(true);
        }

        return () => {
            window.removeEventListener('installAvailable', handleInstallAvailable);
        };
    }, []);

    const handleInstall = async () => {
        const installed = await promptInstall();
        if (installed) {
            setIsInstalled(true);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setDismissed(true);
        localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    };

    if (isInstalled || dismissed || !showPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 
                        bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 shadow-2xl
                        animate-slide-up">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
            >
                <X size={16} className="text-white/80" />
            </button>

            <div className="flex items-start gap-3 text-white">
                <div className="p-2 bg-white/20 rounded-xl">
                    <Download size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-sm">Cài đặt Hybrid POS</h3>
                    <p className="text-xs text-white/80 mt-1">
                        Thêm vào màn hình chính để truy cập nhanh và sử dụng offline
                    </p>
                </div>
            </div>

            <div className="flex gap-2 mt-4">
                <button
                    onClick={handleDismiss}
                    className="flex-1 py-2 text-sm text-white/80 hover:bg-white/10 rounded-lg transition"
                >
                    Để sau
                </button>
                <button
                    onClick={handleInstall}
                    className="flex-1 py-2 bg-white text-blue-600 font-semibold text-sm rounded-lg 
                               hover:bg-blue-50 transition flex items-center justify-center gap-1"
                >
                    <Download size={16} />
                    Cài đặt
                </button>
            </div>
        </div>
    );
}
