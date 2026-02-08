import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { Product } from './types';
import { getTranslatedField } from '../../utils/languageUtils';

interface ProductDetailModalProps {
    product: Product | null;
    onClose: () => void;
    onAddToCart: (product: Product, quantity: number, notes: string[], priceModifier: number) => void;
    getImageUrl: (url?: string) => string | null;
    language: string;
}

export default function ProductDetailModal({
    product,
    onClose,
    onAddToCart,
    getImageUrl,
    language
}: ProductDetailModalProps) {
    if (!product) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-gradient-to-b from-stone-800 to-stone-900 rounded-3xl z-50 overflow-hidden flex flex-col border border-white/10 shadow-2xl"
            >
                {/* Close */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white border border-white/20"
                >
                    <X className="w-5 h-5" />
                </motion.button>

                {/* Image */}
                <div className="h-56 md:h-72 shrink-0 relative">
                    {product.image_url ? (
                        <img
                            src={getImageUrl(product.image_url)!}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center text-7xl">🍜</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent" />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 -mt-10 relative">
                    <h2 className="text-2xl font-bold text-white mb-2">{getTranslatedField(product, 'name', language)}</h2>
                    <p className="text-3xl font-bold text-amber-400 mb-4">¥{product.price.toLocaleString()}</p>

                    {product.description && (
                        <p className="text-white/70 leading-relaxed mb-6">
                            {getTranslatedField(product, 'description', language)}
                        </p>
                    )}

                    <div className="mt-auto pt-6">
                        <button
                            onClick={() => onAddToCart(product, 1, [], 0)}
                            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                        >
                            Thêm vào giỏ - ¥{product.price.toLocaleString()}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
