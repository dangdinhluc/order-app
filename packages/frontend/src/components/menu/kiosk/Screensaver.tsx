import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Users } from 'lucide-react';
import { api } from '../../../services/api';

interface ScreensaverProps {
    branding: { name: string; slogan: string; icon: string };
    slideshow: { id: string; image_url: string }[];
    onStart: (customerCount: number) => void;
    tableId: string;
}

export default function Screensaver({ branding, slideshow, onStart, tableId }: ScreensaverProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showGuestInput, setShowGuestInput] = useState(false);
    const [customerCount, setCustomerCount] = useState(2);
    const [isStarting, setIsStarting] = useState(false);

    // Auto-rotate slides
    useEffect(() => {
        if (slideshow.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slideshow.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [slideshow.length]);

    const handleStart = async () => {
        setIsStarting(true);
        try {
            // Call API to open table
            await api.openTable(tableId, customerCount);
            onStart(customerCount);
        } catch (error) {
            console.error('Failed to open table:', error);
            alert('Lỗi mở bàn. Vui lòng gọi nhân viên.');
            setIsStarting(false);
        }
    };

    const getImageUrl = (url: string) => {
        if (url.startsWith('http')) return url;
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        return `${API_BASE}${url}`;
    };

    return (
        <div className="fixed inset-0 bg-black z-50 overflow-hidden">
            {/* Background Slideshow */}
            <AnimatePresence mode='wait'>
                {slideshow.length > 0 ? (
                    <motion.img
                        key={currentSlide}
                        src={getImageUrl(slideshow[currentSlide].image_url)}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black opacity-80" />
                )}
            </AnimatePresence>

            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
                {!showGuestInput ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8 cursor-pointer w-full h-full flex flex-col items-center justify-center"
                        onClick={() => setShowGuestInput(true)}
                    >
                        <div className="w-32 h-32 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-amber-500/50 shadow-[0_0_50px_rgba(245,158,11,0.3)] animate-pulse">
                            <span className="text-6xl">{branding.icon}</span>
                        </div>

                        <div>
                            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">
                                {branding.name}
                            </h1>
                            <p className="text-2xl text-amber-400 font-light tracking-widest uppercase">
                                {branding.slogan}
                            </p>
                        </div>

                        <div className="mt-12">
                            <p className="text-xl text-white/80 font-medium animate-bounce">
                                Chạm vào màn hình để bắt đầu
                            </p>
                            <p className="text-sm text-white/50 mt-2 uppercase tracking-widest">
                                Touch Screen to Start
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-stone-900/90 backdrop-blur-xl p-8 rounded-3xl border border-white/10 w-full max-w-md shadow-2xl"
                    >
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center justify-center gap-3">
                            <Users className="text-amber-500" />
                            Quý khách đi mấy người?
                        </h2>

                        <div className="flex items-center justify-center gap-6 mb-8">
                            <button
                                onClick={() => setCustomerCount(Math.max(1, customerCount - 1))}
                                className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-3xl text-white transition-colors"
                            >
                                -
                            </button>
                            <span className="text-6xl font-bold text-amber-400 w-24">
                                {customerCount}
                            </span>
                            <button
                                onClick={() => setCustomerCount(Math.min(20, customerCount + 1))}
                                className="w-16 h-16 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-3xl text-white transition-colors"
                            >
                                +
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowGuestInput(false)}
                                className="py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={handleStart}
                                disabled={isStarting}
                                className="py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isStarting ? (
                                    <span className="animate-spin">⏳</span>
                                ) : (
                                    <UtensilsCrossed size={20} />
                                )}
                                Bắt đầu
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
