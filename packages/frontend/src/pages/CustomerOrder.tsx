import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { socketService } from '../services/socket';
import {
    ShoppingCart, Plus, Bell, Receipt,
    Loader2, X, Check, AlertCircle
} from 'lucide-react';

const TRANSLATIONS = {
    vi: {
        cart: 'Giỏ hàng',
        total: 'Tổng',
        request_bill: 'Yêu cầu thanh toán',
        call_staff: 'Gọi nhân viên',
        water: 'Nước',
        service: 'Nhân viên',
        bill: 'Thanh toán',
        empty_cart: 'Giỏ hàng trống',
        error: 'Lỗi',
        scan_again: 'Vui lòng quét lại mã QR hoặc gọi nhân viên.',
        loading: 'Đang tải...',
        items: 'món',
        bill_requested: 'Đã gọi thanh toán',
        staff_called: 'Đã gọi nhân viên!',
        menu_title: 'Menu Khách',
        table: 'Bàn',
    },
    en: {
        cart: 'Cart',
        total: 'Total',
        request_bill: 'Request Bill',
        call_staff: 'Call Staff',
        water: 'Water',
        service: 'Staff',
        bill: 'Bill',
        empty_cart: 'Cart is empty',
        error: 'Error',
        scan_again: 'Please scan the QR code again or ask staff for help.',
        loading: 'Loading...',
        items: 'items',
        bill_requested: 'Bill requested',
        staff_called: 'Staff called!',
        menu_title: 'Guest Menu',
        table: 'Table',
    },
    ja: {
        cart: 'カート',
        total: '合計',
        request_bill: 'お会計',
        call_staff: 'スタッフ呼出',
        water: 'お水',
        service: 'スタッフ',
        bill: 'お会計',
        empty_cart: 'カートは空です',
        error: 'エラー',
        scan_again: 'QRコードを再スキャンするか、スタッフにお声がけください。',
        loading: '読み込み中...',
        items: '品',
        bill_requested: 'お会計をリクエストしました',
        staff_called: 'スタッフを呼びました！',
        menu_title: 'ご注文',
        table: 'テーブル',
    }
};

interface Category {
    id: string;
    name_vi: string;
    name_ja: string;
    name_en: string;
    name_translations?: Record<string, string>;
}

interface Product {
    id: string;
    category_id: string;
    name_vi: string;
    name_ja: string;
    name_en: string;
    name_translations?: Record<string, string>;
    description_translations?: Record<string, string>;
    price: number;
    display_in_kitchen: boolean;
    image_url?: string;
}

interface CartItem {
    product: Product;
    quantity: number;
    note?: string;
}

interface SessionInfo {
    table_id: string;
    table_number: number;
    table_name: string;
    order_id?: string;
    total?: number;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CustomerOrder() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const tableNum = searchParams.get('table');

    const [session, setSession] = useState<SessionInfo | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCart, setShowCart] = useState(false);
    const [addingItem, setAddingItem] = useState<string | null>(null);
    const [showServiceMenu, setShowServiceMenu] = useState(false);
    const [serviceSent, setServiceSent] = useState(false);
    const [language, setLanguage] = useState<'vi' | 'ja' | 'en'>(() => {
        const saved = localStorage.getItem('customer_language');
        return (saved as 'vi' | 'ja' | 'en') || 'ja';
    });

    const t = TRANSLATIONS[language];

    const changeLanguage = (lang: 'vi' | 'ja' | 'en') => {
        setLanguage(lang);
        localStorage.setItem('customer_language', lang);
    };

    useEffect(() => {
        if (token) {
            validateSession();
            loadMenu();
            setupSocket();
        } else {
            setError('Invalid QR code');
            setIsLoading(false);
        }

        return () => {
            socketService.disconnect();
        };
    }, [token]);

    const validateSession = async () => {
        try {
            const response = await fetch(`${API_URL}/api/client/session?token=${token}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error?.message || 'Session expired');
            }

            setSession(data.data);
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Session invalid');
        }
    };

    const loadMenu = async () => {
        try {
            const response = await fetch(`${API_URL}/api/client/menu`);
            const data = await response.json();

            if (data.success) {
                setCategories(data.data.categories);
                setProducts(data.data.products);
                if (data.data.categories.length > 0) {
                    setSelectedCategory(data.data.categories[0].id);
                }
            }
        } catch (error) {
            console.error('Error loading menu:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setupSocket = () => {
        socketService.connect();
        socketService.joinTable(token!);

        socketService.on('cart:updated', (data: unknown) => {
            // Sync cart from other devices
            console.log('Cart synced:', data);
        });

        socketService.on('product:sold_out', (data: unknown) => {
            const { productId } = data as { productId: string };
            setProducts(prev => prev.filter(p => p.id !== productId));
        });
    };

    const addToCart = async (product: Product) => {
        setAddingItem(product.id);

        try {
            const response = await fetch(`${API_URL}/api/client/order/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    product_id: product.id,
                    quantity: 1,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Update local cart
                setCart(prev => {
                    const newCart = new Map(prev);
                    const existing = newCart.get(product.id);
                    if (existing) {
                        newCart.set(product.id, { ...existing, quantity: existing.quantity + 1 });
                    } else {
                        newCart.set(product.id, { product, quantity: 1 });
                    }
                    return newCart;
                });
            }
        } catch (err) {
            console.error('Error adding item:', err);
        } finally {
            setAddingItem(null);
        }
    };

    const callService = async (type: string) => {
        try {
            await fetch(`${API_URL}/api/client/service-call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, type }),
            });
            setServiceSent(true);
            setTimeout(() => setServiceSent(false), 3000);
        } catch (err) {
            console.error('Error calling service:', err);
        }
        setShowServiceMenu(false);
    };

    const requestBill = async () => {
        try {
            await fetch(`${API_URL}/api/client/request-bill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            setServiceSent(true);
            setTimeout(() => setServiceSent(false), 3000);
        } catch (err) {
            console.error('Error requesting bill:', err);
        }
        setShowServiceMenu(false);
    };

    const getName = (item: { name_vi: string; name_ja?: string; name_en?: string; name_translations?: Record<string, string> }) => {
        if (item.name_translations?.[language]) return item.name_translations[language];
        if (language === 'ja' && item.name_ja) return item.name_ja;
        if (language === 'en' && item.name_en) return item.name_en;
        return item.name_vi;
    };

    const getDescription = (product: Product) => {
        return product.description_translations?.[language] || '';
    };

    const cartTotal = Array.from(cart.values()).reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );

    const cartCount = Array.from(cart.values()).reduce(
        (sum, item) => sum + item.quantity,
        0
    );

    const filteredProducts = selectedCategory
        ? products.filter(p => p.category_id === selectedCategory)
        : products;

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <AlertCircle size={64} className="text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">{t.error}</h1>
                    <p className="text-slate-400">{error}</p>
                    <p className="text-sm text-slate-500 mt-4">
                        {t.scan_again}
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-slate-800">🍜 {t.menu_title}</h1>
                            <p className="text-sm text-slate-500">
                                {session?.table_name || `${t.table} ${tableNum}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Language selector */}
                            <select
                                value={language}
                                onChange={(e) => changeLanguage(e.target.value as 'vi' | 'ja' | 'en')}
                                className="bg-slate-100 text-slate-700 text-sm rounded-lg px-2 py-1.5 border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="ja">🇯🇵 日本語</option>
                                <option value="vi">🇻🇳 Tiếng Việt</option>
                                <option value="en">🇬🇧 English</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Categories scroll */}
                <div className="px-4 py-3 overflow-x-auto bg-white">
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {getName(cat)}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Products */}
            <main className="p-4">
                <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition"
                        >
                            {/* Product image */}
                            {product.image_url ? (
                                <img
                                    src={product.image_url.startsWith('http') ? product.image_url : `${API_URL}${product.image_url}`}
                                    alt={getName(product)}
                                    className="h-28 w-full object-cover"
                                />
                            ) : (
                                <div className="h-28 bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center text-4xl">
                                    {product.display_in_kitchen ? '🍜' : '🥤'}
                                </div>
                            )}

                            <div className="p-3">
                                <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2">
                                    {getName(product)}
                                </h3>

                                {getDescription(product) && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{getDescription(product)}</p>
                                )}

                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-lg font-bold text-blue-600">
                                        ¥{product.price.toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        disabled={addingItem === product.id}
                                        className="w-9 h-9 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition disabled:opacity-50 shadow-md"
                                    >
                                        {addingItem === product.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Plus size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main >

            {/* Service call success toast */}
            {
                serviceSent && (
                    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-in">
                        <Check size={20} />
                        <span>{t.staff_called}</span>
                    </div>
                )
            }

            {/* Bottom action bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-40">
                <div className="flex items-center justify-between gap-3">
                    {/* Service call button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowServiceMenu(!showServiceMenu)}
                            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition"
                        >
                            <Bell size={24} />
                        </button>

                        {/* Service menu dropdown */}
                        {showServiceMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowServiceMenu(false)}
                                />
                                <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 min-w-[160px]">
                                    <button
                                        onClick={() => callService('water')}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        💧 <span>{t.water}</span>
                                    </button>
                                    <button
                                        onClick={() => callService('service')}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        🙋 <span>{t.service}</span>
                                    </button>
                                    <button
                                        onClick={requestBill}
                                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-2 border-t"
                                    >
                                        💰 <span>{t.request_bill}</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Cart button */}
                    <button
                        onClick={() => setShowCart(true)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-between transition shadow-md"
                    >
                        <div className="flex items-center gap-2">
                            <ShoppingCart size={20} />
                            <span className="font-semibold">
                                {cartCount > 0 ? `${cartCount}${t.items}` : t.cart}
                            </span>
                        </div>
                        <span className="font-bold text-lg">
                            ¥{cartTotal.toLocaleString()}
                        </span>
                    </button>
                </div>
            </div>

            {/* Cart drawer */}
            {
                showCart && (
                    <>
                        <div
                            className="fixed inset-0 bg-black/50 z-50"
                            onClick={() => setShowCart(false)}
                        />
                        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[80vh] overflow-hidden animate-slide-in">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                                <h2 className="text-lg font-bold">{t.cart}</h2>
                                <button onClick={() => setShowCart(false)}>
                                    <X size={24} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto max-h-[50vh]">
                                {cart.size === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>{t.empty_cart}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {Array.from(cart.values()).map(item => (
                                            <div key={item.product.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                                                <div className="flex-1">
                                                    <div className="font-medium text-slate-900">
                                                        {getName(item.product)}
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        ¥{item.product.price} × {item.quantity}
                                                    </div>
                                                </div>
                                                <div className="font-bold text-blue-600">
                                                    ¥{(item.product.price * item.quantity).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {cart.size > 0 && (
                                <div className="p-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between text-lg font-bold mb-4">
                                        <span>{t.total}</span>
                                        <span className="text-blue-600">¥{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={requestBill}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition"
                                    >
                                        <Receipt size={20} />
                                        {t.request_bill}
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )
            }
        </div >
    );
}
