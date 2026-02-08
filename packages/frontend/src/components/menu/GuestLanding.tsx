import { motion } from 'framer-motion';
import { BookOpen, Phone, MapPin, Calendar, Heart, Ticket } from 'lucide-react';
import { useState, useEffect } from 'react';

interface GuestLandingProps {
    branding: { name: string; slogan: string; icon: string };
    onViewMenu: () => void;
    onBookTable: () => void;
}

export default function GuestLanding({ branding, onViewMenu, onBookTable }: GuestLandingProps) {
    const [hasVoucher, setHasVoucher] = useState(false);

    useEffect(() => {
        // Check if user already claimed the retention voucher
        const claimed = localStorage.getItem('retention_voucher_claimed');
        if (!claimed) {
            // Simulate finding a "secret" voucher
            setTimeout(() => setHasVoucher(true), 1500);
        }
    }, []);

    const claimVoucher = () => {
        localStorage.setItem('retention_voucher_claimed', 'true');
        alert('Đã lưu mã giảm giá: WELCOMEBACK5 (Giảm 5% cho lần tới)');
        setHasVoucher(false);
    };

    return (
        <div className="fixed inset-0 bg-stone-900 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-amber-900/20 to-transparent" />
                <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-orange-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 max-w-md w-full"
            >
                {/* Brand Logo */}
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/20 mb-6">
                    {branding.icon}
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">
                    Chào bạn cũ! <span className="text-amber-400">👋</span>
                </h1>
                <p className="text-stone-400 mb-8 leading-relaxed">
                    Bạn đang không ở tại quán, hoặc bàn chưa được mở.
                    <br />
                    Nhớ hương vị {branding.name} rồi sao?
                </p>

                {/* Action Buttons */}
                <div className="space-y-3 w-full">
                    <button
                        onClick={onViewMenu}
                        className="w-full py-4 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all border border-white/10 group"
                    >
                        <BookOpen className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                        Xem thực đơn (Chỉ xem)
                    </button>

                    <button
                        onClick={onBookTable}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                        <Calendar className="w-5 h-5" />
                        Đặt bàn trước
                    </button>
                </div>

                {/* Additional Links */}
                <div className="mt-8 flex justify-center gap-6">
                    <button className="flex flex-col items-center gap-2 text-stone-500 hover:text-amber-400 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center">
                            <Phone className="w-4 h-4" />
                        </div>
                        <span className="text-xs">Gọi điện</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 text-stone-500 hover:text-amber-400 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-xs">Bản đồ</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 text-stone-500 hover:text-pink-400 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center">
                            <Heart className="w-4 h-4" />
                        </div>
                        <span className="text-xs">Yêu thích</span>
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-12 text-xs text-stone-600">
                    © {new Date().getFullYear()} {branding.name}. All rights reserved.
                </p>
            </motion.div>

            {/* Retention Hook: Secret Voucher Popup */}
            {hasVoucher && (
                <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute bottom-24 right-6 z-50"
                >
                    <div className="bg-gradient-to-r from-rose-500 to-pink-600 p-4 rounded-2xl shadow-2xl text-white max-w-[200px] relative">
                        <button
                            onClick={() => setHasVoucher(false)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center font-bold text-xs"
                        >
                            ✕
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                            <Ticket className="w-5 h-5 fill-white text-white" />
                            <span className="font-bold text-sm">Quà bí mật!</span>
                        </div>
                        <p className="text-xs opacity-90 mb-2">Tặng bạn mã giảm giá 5% cho lần tới.</p>
                        <button
                            onClick={claimVoucher}
                            className="w-full py-1.5 bg-white text-rose-600 text-xs font-bold rounded-lg hover:bg-rose-50"
                        >
                            Nhận ngay
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
