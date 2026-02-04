import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

interface SuccessCelebrationProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
    subMessage?: string;
    autoDismissMs?: number;
    brandName?: string;
}

// Confetti particle component
const ConfettiParticle = ({ index }: { index: number }) => {
    const colors = ['#f59e0b', '#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa'];
    const color = colors[index % colors.length];
    const size = 8 + Math.random() * 8;
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 2 + Math.random() * 2;
    const rotation = Math.random() * 360;

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{
                width: size,
                height: size,
                left: `${left}%`,
                top: -20,
                backgroundColor: color,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                transform: `rotate(${rotation}deg)`,
            }}
            initial={{ y: 0, opacity: 1, scale: 0 }}
            animate={{
                y: [0, 400],
                x: [0, (Math.random() - 0.5) * 100],
                opacity: [1, 1, 0],
                scale: [0, 1, 0.5],
                rotate: [rotation, rotation + 360],
            }}
            transition={{
                duration,
                delay,
                ease: 'easeOut',
            }}
        />
    );
};

export default function SuccessCelebration({
    isOpen,
    onClose,
    title = 'Đặt hàng thành công!',
    message = 'Cảm ơn quý khách!',
    subMessage = 'Món ăn sẽ được phục vụ trong 10-15 phút',
    autoDismissMs = 5000,
    brandName = 'GIA VỊ',
}: SuccessCelebrationProps) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!isOpen) {
            setProgress(100);
            return;
        }

        const interval = 50; // Update every 50ms
        const decrement = (100 / autoDismissMs) * interval;

        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    onClose();
                    return 0;
                }
                return prev - decrement;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [isOpen, autoDismissMs, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                    />

                    {/* Confetti Container */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[101]">
                        {Array.from({ length: 50 }).map((_, i) => (
                            <ConfettiParticle key={i} index={i} />
                        ))}
                    </div>

                    {/* Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-4 right-4 top-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-sm z-[102]"
                    >
                        <div className="bg-gradient-to-b from-stone-800 to-stone-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                            >
                                <X className="w-4 h-4 text-white/60" />
                            </button>

                            {/* Content */}
                            <div className="p-8 text-center">
                                {/* Emoji Burst */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
                                    className="text-6xl mb-4"
                                >
                                    🎉
                                </motion.div>

                                {/* Success Icon */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.3 }}
                                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                                >
                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                </motion.div>

                                {/* Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-2xl font-bold text-white mb-2"
                                >
                                    {title}
                                </motion.h2>

                                {/* Message */}
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-white/80 mb-1"
                                >
                                    {message}
                                </motion.p>

                                {/* Brand Name */}
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.55 }}
                                    className="text-amber-400 font-semibold mb-4"
                                >
                                    {brandName}
                                </motion.p>

                                {/* Sub Message */}
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-sm text-white/50 mb-6"
                                >
                                    {subMessage}
                                </motion.p>

                                {/* Progress Bar */}
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                                        initial={{ width: '100%' }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.05 }}
                                    />
                                </div>
                                <p className="text-xs text-white/40">
                                    Tự động đóng sau {Math.ceil((progress / 100) * (autoDismissMs / 1000))}s
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
