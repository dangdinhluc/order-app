import { Edit3, Plus, ChefHat } from 'lucide-react';
import type { Product } from '../services/api';

interface ProductCardProps {
    product: Product;
    onQuickAdd: (product: Product) => void;
    onEdit: (product: Product) => void;
}

// Color palette for product cards without images
const PLACEHOLDER_COLORS = [
    { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-orange-400 to-orange-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-purple-400 to-purple-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-pink-400 to-pink-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-cyan-400 to-cyan-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-amber-400 to-amber-600', text: 'text-white' },
    { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600', text: 'text-white' },
];

function getPlaceholderColor(productId: string) {
    // Use product ID to get consistent color
    const hash = productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

export default function ProductCard({ product, onQuickAdd, onEdit }: ProductCardProps) {
    const placeholderColor = getPlaceholderColor(product.id);

    return (
        <div
            className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
            onClick={() => onQuickAdd(product)}
        >
            {/* Card Content - Vertical layout for all sizes on tablet */}
            <div className="flex flex-col">
                {/* Image/Placeholder Area */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 flex-shrink-0">
                    {product.image_url ? (
                        <img
                            src={product.image_url.startsWith('http') ? product.image_url : `${import.meta.env.VITE_API_URL}${product.image_url}`}
                            alt={product.name_vi}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/200?text=🍜';
                            }}
                        />
                    ) : (
                        /* Beautiful placeholder when no image */
                        <div className={`w-full h-full flex flex-col items-center justify-center ${placeholderColor.bg} ${placeholderColor.text} p-2`}>
                            <span className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center leading-tight drop-shadow-sm">
                                {product.name_vi.length > 8
                                    ? product.name_vi.substring(0, 8)
                                    : product.name_vi}
                            </span>
                            {product.name_ja && (
                                <span className="text-xs opacity-80 mt-1 truncate max-w-full">
                                    {product.name_ja}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Kitchen Badge */}
                    {product.display_in_kitchen && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] bg-orange-500 text-white px-2 py-1 rounded-full font-bold shadow-lg">
                            <ChefHat size={12} />
                            <span className="hidden sm:inline">Bếp</span>
                        </span>
                    )}

                    {/* Best Seller / Chef Choice badges */}
                    {product.is_best_seller && (
                        <span className="absolute top-2 right-2 text-[10px] bg-red-500 text-white px-2 py-1 rounded-full font-bold shadow-lg">
                            🔥 Hot
                        </span>
                    )}
                    {product.is_chef_choice && !product.is_best_seller && (
                        <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-white px-2 py-1 rounded-full font-bold shadow-lg">
                            ⭐ Chef
                        </span>
                    )}

                    {/* Quick Add Button Overlay */}
                    <div className="absolute bottom-2 right-2">
                        <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-transform opacity-80 group-hover:opacity-100">
                            <Plus size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>

                {/* Content Info - Always visible */}
                <div className="p-2.5 border-t border-slate-100">
                    {/* Product Name - Vietnamese */}
                    <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">
                        {product.name_vi}
                    </h4>

                    {/* Japanese Name - Show if exists */}
                    {product.name_ja && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {product.name_ja}
                        </p>
                    )}

                    {/* Price Row */}
                    <div className="flex items-center justify-between mt-1.5">
                        <span className="font-bold text-blue-600 text-base">
                            ¥{Math.round(product.price).toLocaleString()}
                        </span>

                        {/* Combo badge */}
                        {product.is_combo && (
                            <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">
                                Combo
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Button - Desktop only (hover) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                }}
                className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-slate-200 shadow-sm hidden lg:flex z-20"
            >
                <Edit3 size={14} />
            </button>

            {/* Sold out overlay */}
            {!product.is_available && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                    <span className="bg-slate-800 text-white text-xs px-4 py-1.5 rounded-full font-bold shadow-xl">
                        Hết hàng
                    </span>
                </div>
            )}
        </div>
    );
}
