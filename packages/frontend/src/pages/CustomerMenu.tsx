import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
    ShoppingCart, Plus, Minus, Send,
    Bell, Receipt, Loader2,
    Check, X
} from 'lucide-react';

// Types
interface Product {
    id: string;
    name: string;
    price: number;
    description?: string;
    image_url?: string;
    available: boolean;
}

interface Category {
    id: string;
    name: string;
    products: Product[];
}

interface CartItem {
    product: Product;
    quantity: number;
    notes?: string;
}

interface TableInfo {
    id: string;
    number: number;
    name: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function CustomerMenu() {
    const { tableId } = useParams<{ tableId: string }>();
    const [table, setTable] = useState<TableInfo | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [settings, setSettings] = useState<{
        customer_banner_url?: string;
        customer_logo_url?: string;
        customer_primary_color?: string;
        customer_welcome_heading?: string;
        customer_welcome_message?: string;
    }>({});

    const loadMenu = useCallback(async () => {
        if (!tableId) return;

        try {
            const res = await fetch(`${API_URL}/api/customer/menu/${tableId}`);
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Không tải được menu');
                return;
            }

            setTable(data.table);
            setCategories(data.categories);
            if (data.settings) {
                setSettings(data.settings);
            }
        } catch (err) {
            setError('Lỗi kết nối máy chủ');
        } finally {
            setIsLoading(false);
        }
    }, [tableId]);

    // ... (rest of logic)

    const primaryColor = settings.customer_primary_color || '#2563eb'; // Default blue-600

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Banner Section */}
            {settings.customer_banner_url && (
                <div className="w-full h-48 md:h-64 relative">
                    <img
                        src={settings.customer_banner_url}
                        alt="Banner"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6 text-white">
                        <h1 className="text-2xl font-bold shadow-sm">
                            {settings.customer_welcome_heading || 'Kính chào quý khách'}
                        </h1>
                        <p className="text-sm opacity-90 shadow-sm mt-1">
                            {settings.customer_welcome_message || 'Vui lòng chọn món bên dưới'}
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={`bg-white sticky top-0 z-40 shadow-sm ${settings.customer_banner_url ? '' : 'border-b border-slate-200'}`}>
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {settings.customer_logo_url && (
                            <img
                                src={settings.customer_logo_url}
                                alt="Logo"
                                className="w-10 h-10 object-contain"
                            />
                        )}
                        <div>
                            <h1 className="font-bold text-slate-800">
                                {table?.name || 'Bàn ' + table?.number}
                            </h1>
                            {!settings.customer_banner_url && (
                                <p className="text-xs text-slate-500">
                                    {settings.customer_welcome_heading || 'Chọn món và gửi order'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => callService('service')}
                            className="p-2 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100"
                            title="Gọi nhân viên"
                        >
                            <Bell size={20} />
                        </button>
                        <button
                            onClick={() => callService('bill')}
                            className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            title="Thanh toán"
                        >
                            <Receipt size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {orderSuccess && (
                <div
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce"
                    style={{ backgroundColor: primaryColor }}
                >
                    <Check size={20} />
                    <span className="font-medium">Đã gửi đơn hàng!</span>
                </div>
            )}

            {/* Menu Content */}
            <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
                {categories.map(category => (
                    category.products.length > 0 && (
                        <div key={category.id}>
                            <h2 className="text-lg font-bold text-slate-800 mb-3 sticky top-14 bg-slate-50 py-2">
                                {category.name}
                            </h2>
                            <div className="space-y-3">
                                {category.products.map(product => {
                                    const cartItem = cart.find(c => c.product.id === product.id);
                                    return (
                                        <div
                                            key={product.id}
                                            className="bg-white rounded-xl p-4 shadow-sm flex gap-4"
                                        >
                                            {product.image_url && (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-20 h-20 rounded-lg object-cover"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-medium text-slate-800">{product.name}</h3>
                                                {product.description && (
                                                    <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
                                                )}
                                                <p className="font-bold mt-1" style={{ color: primaryColor }}>
                                                    ¥{product.price.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                {cartItem ? (
                                                    <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1">
                                                        <button
                                                            onClick={() => updateQuantity(product.id, -1)}
                                                            className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center"
                                                            style={{ color: primaryColor }}
                                                        >
                                                            <Minus size={16} />
                                                        </button>
                                                        <span className="w-6 text-center font-bold" style={{ color: primaryColor }}>
                                                            {cartItem.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(product.id, 1)}
                                                            className="w-8 h-8 rounded-full text-white flex items-center justify-center"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => addToCart(product)}
                                                        className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-md hover:opacity-90 transition"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                ))}
            </div>

            {/* Cart Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-lg p-4 z-50">
                    <div className="max-w-lg mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingCart style={{ color: primaryColor }} size={24} />
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {getCartCount()}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{getCartCount()} món</p>
                                <p className="font-bold text-slate-800">¥{getCartTotal().toLocaleString()}</p>
                            </div>
                        </div>
                        <button
                            onClick={submitOrder}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 text-white rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Send size={18} />
                                    Gửi đơn
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
