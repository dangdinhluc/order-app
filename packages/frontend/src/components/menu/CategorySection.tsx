import { motion } from 'framer-motion';
import { Star, Flame, Plus } from 'lucide-react';
import type { Category, Product } from './types';
import { getTranslatedField } from '../../utils/languageUtils';

interface CategorySectionProps {
    category: Category;
    onAddToCart: (product: Product, quantity: number, notes: string[], priceModifier: number, event: React.MouseEvent) => void;
    onProductClick: (product: Product) => void;
    getImageUrl: (url?: string) => string | null;
    language: string;
}

export default function CategorySection({
    category,
    onAddToCart,
    onProductClick,
    getImageUrl,
    language
}: CategorySectionProps) {
    return (
        <div id={`category-${category.id}`} className="scroll-mt-16 relative">
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-30 bg-stone-900/80 backdrop-blur-lg -mx-4 md:-mx-6 px-4 md:px-6 py-3 transition-all duration-300 border-b border-white/5">
                <div className="flex items-center justify-center gap-4 md:gap-6">
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/60" />
                    <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xl">{category.icon}</span>
                        <h3 className="text-base md:text-lg font-bold text-amber-50 uppercase tracking-wider">{category.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-xs text-amber-400 font-bold">{category.products.length}</span>
                    </div>
                    <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/60" />
                </div>
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mt-4">
                {category.products.map(product => (
                    <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => onProductClick(product)}
                        className="group relative rounded-2xl overflow-hidden bg-stone-800/60 border border-white/10 cursor-pointer hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300"
                    >
                        {/* Square Image */}
                        <div className="aspect-square relative overflow-hidden bg-stone-700">
                            {product.image_url ? (
                                <img
                                    src={getImageUrl(product.image_url)!}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-5xl">🍜</div>
                            )}

                            {/* Badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                {product.is_featured && (
                                    <div className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center gap-1">
                                        <Star className="w-2.5 h-2.5 fill-black" /> HOT
                                    </div>
                                )}
                                {product.is_best_seller && (
                                    <div className="px-2 py-0.5 rounded-full bg-green-500 text-black text-[10px] font-bold flex items-center gap-1">
                                        <Flame className="w-2.5 h-2.5" /> BEST
                                    </div>
                                )}
                                {product.is_chef_choice && (
                                    <div className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center gap-1">
                                        👨‍🍳 CHEF
                                    </div>
                                )}
                            </div>

                            {/* Floating + Button */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => onAddToCart(product, 1, [], 0, e)}
                                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-black/30 hover:bg-amber-400 transition-colors z-10"
                            >
                                <Plus className="w-5 h-5" strokeWidth={3} />
                            </motion.button>
                        </div>

                        {/* Info Below */}
                        <div className="p-3 bg-stone-800/80">
                            <h4 className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-1">{getTranslatedField(product, 'name', language)}</h4>
                            {product.description && (
                                <p className="text-white/40 text-[10px] line-clamp-1 mb-2">{getTranslatedField(product, 'description', language)}</p>
                            )}
                            <span className="text-amber-400 font-bold text-base">¥{product.price.toLocaleString()}</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
