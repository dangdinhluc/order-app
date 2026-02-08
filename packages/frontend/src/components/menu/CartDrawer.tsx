import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Receipt, Minus, Plus } from 'lucide-react';
import type { CartItem } from './types';
import { getTranslatedField } from '../../utils/languageUtils';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    onUpdateQuantity: (productId: string, delta: number) => void;
    onRequestBill: () => void;
    getImageUrl: (url?: string) => string | null;
    language: string;
    t: Record<string, string>;
}

export default function CartDrawer({
    isOpen,
    onClose,
    cart,
    onUpdateQuantity,
    onRequestBill,
    getImageUrl,
    language,
    t
}: CartDrawerProps) {
    const cartTotal = cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );

    const getName = (product: any) => getTranslatedField(product, 'name', language);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-stone-900 rounded-t-3xl z-50 max-h-[85vh] overflow-hidden border-t border-white/10 shadow-2xl flex flex-col"
                    >
                        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-amber-400" />
                                {t.cart}
                            </h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/70">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {cart.length === 0 ? (
                                <div className="text-center py-12 text-white/30">
                                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>{t.emptyCart}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                            {/* Image */}
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-800 shrink-0">
                                                {item.product.image_url ? (
                                                    <img
                                                        src={getImageUrl(item.product.image_url)!}
                                                        alt={getName(item.product)}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl">🍜</div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-medium text-white text-sm line-clamp-2">{getName(item.product)}</h4>
                                                        <span className="font-bold text-amber-400 text-sm whitespace-nowrap">
                                                            ¥{(item.product.price * item.quantity).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-white/50 mt-1">¥{item.product.price.toLocaleString()}</p>
                                                </div>

                                                {/* Controls */}
                                                <div className="flex items-center gap-3 bg-black/20 self-start rounded-lg p-1 mt-2 border border-white/5">
                                                    <button
                                                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                                                        className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-white/70 hover:text-white"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-sm font-bold text-white w-6 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                                                        className="w-6 h-6 flex items-center justify-center bg-amber-500 text-black rounded hover:bg-amber-400 font-bold"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-4 border-t border-white/10 bg-black/20 shrink-0 safe-area-bottom">
                                <div className="flex items-center justify-between text-lg font-bold mb-4 text-white">
                                    <span>{t.total}</span>
                                    <span className="text-amber-400 text-2xl">¥{cartTotal.toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={onRequestBill}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    <Receipt size={20} />
                                    {t.request_bill}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
