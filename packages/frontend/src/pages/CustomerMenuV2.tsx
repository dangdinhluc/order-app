import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Search, Bell, X, Plus, Minus } from 'lucide-react';

// Types
interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    image_url: string | null;
    available: boolean;
    is_best_seller?: boolean;
    is_chef_choice?: boolean;
    is_combo?: boolean;
}

interface Category {
    id: string;
    name: string;
    sort_order: number;
    products: Product[];
}

interface CartItem {
    product: Product;
    quantity: number;
    notes?: string;
}

interface Table {
    id: string;
    number: number;
    name: string;
}

interface ServiceButton {
    id: string;
    label: string;
    icon: string;
    type: string;
}

interface Settings {
    customer_banner_url?: string;
    customer_logo_url?: string;
    customer_primary_color?: string;
    customer_welcome_heading?: string;
    customer_welcome_message?: string;
    customer_service_buttons?: ServiceButton[];
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEFAULT_SERVICE_BUTTONS: ServiceButton[] = [
    { id: 'water', label: 'Thêm đá/nước', icon: '🧊', type: 'water' },
    { id: 'grill', label: 'Thay vỉ nướng', icon: '🔥', type: 'grill_change' },
    { id: 'utensils', label: 'Lấy chén bát', icon: '🥢', type: 'utensils' },
    { id: 'bill', label: 'Thanh toán', icon: '🧾', type: 'bill' },
];

const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function CustomerMenuV2() {
    const { tableId } = useParams<{ tableId: string }>();
    const [table, setTable] = useState<Table | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [settings, setSettings] = useState<Settings>({});
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [comboItems, setComboItems] = useState<any[]>([]);

    // Load menu data
    const loadMenu = useCallback(async () => {
        if (!tableId) return;

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/customer/menu/${tableId}`);

            if (!res.ok) {
                throw new Error('Không thể tải menu');
            }

            const data = await res.json();
            setTable(data.table);
            setCategories(data.categories || []);
            setSettings(data.settings || {});

            if (data.categories?.length > 0) {
                setActiveCategory(data.categories[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi tải menu');
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        loadMenu();
    }, [loadMenu]);

    // Fetch combo items when selected
    useEffect(() => {
        if (selectedProduct?.is_combo) {
            fetch(`${API_BASE}/api/combos/${selectedProduct.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.items) setComboItems(data.items);
                })
                .catch(err => console.error('Failed to load combo items', err));
        } else {
            setComboItems([]);
        }
    }, [selectedProduct]);

    // Cart functions
    const addToCart = (product: Product, quantity = 1, notes = '') => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity, notes: notes || item.notes }
                        : item
                );
            }
            return [...prev, { product, quantity, notes }];
        });

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Close modal if open (wait a bit for animation)
        setTimeout(() => setSelectedProduct(null), 300);
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev =>
            prev
                .map(item =>
                    item.product.id === productId
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item
                )
                .filter(item => item.quantity > 0)
        );
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Filter products by search
    const filteredCategories = categories.map(cat => ({
        ...cat,
        products: cat.products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.products.length > 0);

    // Submit order
    const submitOrder = async () => {
        if (cart.length === 0) return;

        try {
            const res = await fetch(`${API_BASE}/api/customer/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_id: tableId,
                    items: cart.map(item => ({
                        product_id: item.product.id,
                        quantity: item.quantity,
                        notes: item.notes
                    }))
                })
            });

            if (res.ok) {
                setCart([]);
                setIsCartOpen(false);
                alert('Đã gửi đơn hàng!');
            }
        } catch (error) {
            alert('Lỗi gửi đơn hàng');
        }
    };

    // Call service
    const callService = async (type: string) => {
        try {
            await fetch(`${API_BASE}/api/customer/call-service`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table_id: tableId, type })
            });
            setIsServiceModalOpen(false);
            alert('Đã gọi nhân viên!');
        } catch (error) {
            alert('Lỗi gọi nhân viên');
        }
    };

    const serviceButtons = settings.customer_service_buttons || DEFAULT_SERVICE_BUTTONS;

    if (loading) {
        return (
            <div className="customer-dark min-h-screen flex items-center justify-center bg-[#0f0f0f]">
                <div className="loading-spinner w-12 h-12" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="customer-dark min-h-screen flex items-center justify-center bg-[#0f0f0f]">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="customer-dark min-h-screen bg-[url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-fixed bg-center">
            {/* Dark Overlay */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-0" />

            <div className="relative z-10 customer-dark bg-transparent min-h-screen flex flex-col">
                {/* Header - Glass */}
                <header className="sticky top-0 z-40 glass px-4 py-3 border-b-0 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-[var(--customer-accent-gold)] tracking-wide">
                                {settings.customer_welcome_heading || 'Thực đơn'}
                            </h1>
                            <p className="text-sm text-[var(--customer-text-secondary)] font-medium">
                                {table?.name || `Bàn ${table?.number}`}
                            </p>
                        </div>

                        {/* Search */}
                        <div className="flex-1 max-w-xs mx-4">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--customer-text-secondary)] group-focus-within:text-[var(--customer-accent-gold)] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Tìm món..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-black/20 border border-[var(--customer-border)] rounded-full text-sm backdrop-blur-md focus:border-[var(--customer-accent-gold)] outline-none transition-all focus:bg-black/40 text-white placeholder:text-gray-500"
                                />
                            </div>
                        </div>

                        {/* Service Call Button */}
                        <button
                            onClick={() => setIsServiceModalOpen(true)}
                            className="p-2 bg-black/20 rounded-full border border-[var(--customer-border)] active:scale-95 transition-all hover:bg-[var(--customer-accent-gold)] hover:text-black hover:border-[var(--customer-accent-gold)] group"
                        >
                            <Bell className="w-5 h-5 text-[var(--customer-accent-gold)] group-hover:text-black" />
                        </button>
                    </div>

                    {/* Category Tabs (Mobile) */}
                    <div className="mt-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                        <div className="flex gap-3 pb-1">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-5 py-2 rounded-full text-sm whitespace-nowrap transition-all border font-medium ${activeCategory === cat.id
                                        ? 'bg-[var(--customer-accent-gold)] text-black border-[var(--customer-accent-gold)] shadow-[0_0_15px_rgba(251,191,36,0.5)] transform scale-105'
                                        : 'bg-black/30 text-[var(--customer-text-secondary)] border-white/5 hover:bg-black/50 hover:border-white/10'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {/* Product Grid */}
                <main className="p-4 pb-28 flex-1 overflow-y-auto">
                    {filteredCategories.map(category => (
                        <section key={category.id} className="mb-10">
                            <h2 className="text-xl font-bold mb-5 text-[var(--customer-text-primary)] flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-[var(--customer-accent-gold)] rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                                {category.name}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                {category.products.map(product => (
                                    <motion.div
                                        key={product.id}
                                        onClick={() => setSelectedProduct(product)}
                                        whileHover={{ y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="glass-card rounded-2xl overflow-hidden group cursor-pointer relative shadow-lg hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all"
                                    >
                                        {/* Product Image */}
                                        <div className="relative aspect-[4/3] overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={getImageUrl(product.image_url)!}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                                                    <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all">🍽️</span>
                                                </div>
                                            )}

                                            {/* Gradient Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />

                                            {/* Badges */}
                                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                                                {product.is_best_seller && (
                                                    <span className="bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-red-500/50 flex items-center gap-1">
                                                        🔥 HOT
                                                    </span>
                                                )}
                                                {product.is_chef_choice && (
                                                    <span className="bg-yellow-500/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg border border-yellow-400/50 flex items-center gap-1">
                                                        👑 CHEF
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Product Info */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                            <h3 className="font-bold text-sm line-clamp-2 text-white mb-1 drop-shadow-md leading-tight group-hover:text-[var(--customer-accent-gold)] transition-colors">
                                                {product.name}
                                            </h3>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[var(--customer-accent-gold)] font-bold text-base drop-shadow-md">
                                                    ¥{product.price.toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        addToCart(product);
                                                    }}
                                                    className="w-8 h-8 bg-white/10 hover:bg-[var(--customer-accent-gold)] hover:text-black hover:scale-110 transition-all text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/10"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </section>
                    ))}
                </main>

                {/* Floating Cart Button */}
                <AnimatePresence>
                    {cartCount > 0 && (
                        <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setIsCartOpen(true)}
                            className="fixed bottom-6 right-6 w-16 h-16 bg-[var(--customer-accent-gold)] text-black rounded-full shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center justify-center z-40 border-2 border-white/20"
                        >
                            <ShoppingCart className="w-7 h-7" />
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-[var(--customer-accent-red)] text-white text-xs rounded-full flex items-center justify-center font-bold border-2 border-[#0f0f0f] shadow-sm">
                                {cartCount}
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Cart Drawer */}
                <AnimatePresence>
                    {isCartOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsCartOpen(false)}
                                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#1a1a1a] z-50 flex flex-col shadow-2xl border-l border-white/10"
                            >
                                <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#1a1a1a]">
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <ShoppingCart className="w-5 h-5 text-[var(--customer-accent-gold)]" />
                                        Giỏ hàng <span className="text-[var(--customer-text-secondary)] text-base font-normal">({cartCount})</span>
                                    </h2>
                                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-auto p-4 bg-[#141414]">
                                    {cart.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-[var(--customer-text-secondary)]">
                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                <ShoppingCart className="w-10 h-10 opacity-30" />
                                            </div>
                                            <p className="text-lg font-medium">Giỏ hàng trống</p>
                                            <p className="text-sm opacity-60">Hãy chọn món ngon nhé!</p>
                                        </div>
                                    ) : (
                                        cart.map(item => (
                                            <div key={item.product.id} className="flex gap-4 mb-4 bg-[#1f1f1f] p-3 rounded-2xl border border-white/5 shadow-sm">
                                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#2a2a2a] shrink-0 border border-white/5">
                                                    {item.product.image_url ? (
                                                        <img src={getImageUrl(item.product.image_url)!} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                    <div>
                                                        <h4 className="font-bold text-white text-sm line-clamp-1 mb-1">{item.product.name}</h4>
                                                        <p className="text-[var(--customer-accent-gold)] font-bold">¥{item.product.price.toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-[#141414] w-fit rounded-lg p-1 border border-white/5 mt-2">
                                                        <button
                                                            onClick={() => updateQuantity(item.product.id, -1)}
                                                            className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-md text-white/70 hover:text-white transition-colors"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-sm font-bold text-white w-4 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(item.product.id, 1)}
                                                            className="w-7 h-7 flex items-center justify-center bg-[var(--customer-accent-gold)] text-black rounded-md hover:brightness-110 transition-all font-bold"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-5 border-t border-white/10 bg-[#1a1a1a]">
                                    <div className="flex justify-between mb-2 text-[var(--customer-text-secondary)] text-sm">
                                        <span>Tạm tính</span>
                                        <span>¥{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between mb-6 text-xl text-white">
                                        <span className="font-bold">Tổng thanh toán</span>
                                        <span className="font-bold text-[var(--customer-accent-gold)] text-2xl">
                                            ¥{cartTotal.toLocaleString()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={submitOrder}
                                        disabled={cart.length === 0}
                                        className="w-full py-4 bg-[var(--customer-accent-gold)] text-black font-bold rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:transform-none"
                                    >
                                        Gửi đơn hàng
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Product Detail Modal (Food Story) */}
                <AnimatePresence>
                    {selectedProduct && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedProduct(null)}
                                className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="fixed z-50 w-full max-w-4xl bg-[#141414] md:rounded-3xl rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/10 max-h-[90vh]"
                            >
                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white hover:bg-black/80 backdrop-blur-sm transition-colors border border-white/10"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                {/* Image Section */}
                                <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-black shrink-0">
                                    {selectedProduct.image_url ? (
                                        <img
                                            src={getImageUrl(selectedProduct.image_url)!}
                                            alt={selectedProduct.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-6xl bg-[#1a1a1a]">🍽️</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent md:bg-gradient-to-r" />
                                </div>

                                {/* Content Section */}
                                <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto">
                                    <div className="flex-1">
                                        <div className="flex gap-2 mb-4">
                                            {selectedProduct.is_best_seller && (
                                                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-red-500/50 flex items-center gap-1">
                                                    🔥 BEST SELLER
                                                </span>
                                            )}
                                            {selectedProduct.is_chef_choice && (
                                                <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-yellow-400/50 flex items-center gap-1">
                                                    👑 CHEF'S CHOICE
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="text-2xl md:text-4xl font-bold mb-3 text-white leading-tight">
                                            {selectedProduct.name}
                                        </h2>

                                        <div className="text-3xl font-bold text-[var(--customer-accent-gold)] mb-6 drop-shadow-sm">
                                            ¥{selectedProduct.price.toLocaleString()}
                                        </div>

                                        <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mb-6" />

                                        <p className="text-[var(--customer-text-secondary)] leading-relaxed mb-8 text-lg font-light">
                                            {selectedProduct.description || 'Hương vị tuyệt hảo được chế biến từ những nguyên liệu tươi ngon nhất. Món ăn này là sự kết hợp tinh tế giữa truyền thống và hiện đại, mang đến trải nghiệm ẩm thực khó quên.'}
                                        </p>

                                        {selectedProduct.is_combo && comboItems.length > 0 && (
                                            <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
                                                <h3 className="text-[var(--customer-accent-gold)] font-bold mb-3 flex items-center gap-2">
                                                    <span className="text-xl">📦</span> Bao gồm:
                                                </h3>
                                                <ul className="space-y-2">
                                                    {comboItems.map((item, idx) => (
                                                        <li key={idx} className="flex justify-between items-center text-white/90 border-b border-white/5 pb-2 last:border-0">
                                                            <span>{item.name_vi}</span>
                                                            <span className="text-sm font-bold bg-white/10 px-2 py-0.5 rounded text-[var(--customer-accent-gold)]">x{item.quantity}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Mock Attributes */}
                                        <div className="grid grid-cols-2 gap-4 mb-8">
                                            <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                                                <span className="text-3xl">⚡</span>
                                                <div className="text-sm">
                                                    <p className="text-[var(--customer-text-secondary)] mb-1">Thời gian</p>
                                                    <p className="font-bold text-white text-lg">10-15m</p>
                                                </div>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                                                <span className="text-3xl">👥</span>
                                                <div className="text-sm">
                                                    <p className="text-[var(--customer-text-secondary)] mb-1">Phần ăn</p>
                                                    <p className="font-bold text-white text-lg">1-2 người</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="mt-auto">
                                        <button
                                            onClick={() => addToCart(selectedProduct!)}
                                            className="w-full py-4 bg-[var(--customer-accent-gold)] text-black font-bold rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg"
                                        >
                                            <Plus className="w-6 h-6" />
                                            Thêm vào giỏ - ¥{selectedProduct.price.toLocaleString()}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Service Call Modal */}
                <AnimatePresence>
                    {isServiceModalOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsServiceModalOpen(false)}
                                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="w-full max-w-sm bg-[#1a1a1a] rounded-3xl p-6 z-50 border border-white/10 shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setIsServiceModalOpen(false)}
                                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="text-center mb-8">
                                    <div className="w-16 h-16 bg-[var(--customer-accent-gold)] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                                        <Bell className="w-8 h-8 text-black" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">Bạn cần hỗ trợ?</h2>
                                    <p className="text-[var(--customer-text-secondary)] text-sm mt-1">Chọn yêu cầu bên dưới, nhân viên sẽ đến ngay.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {serviceButtons.map(btn => (
                                        <button
                                            key={btn.id}
                                            onClick={() => callService(btn.type)}
                                            className="flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-[var(--customer-accent-gold)] hover:text-black transition-all rounded-2xl group border border-white/10 hover:border-[var(--customer-accent-gold)]"
                                        >
                                            <span className="text-3xl group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">
                                                {btn.icon}
                                            </span>
                                            <span className="text-sm font-bold text-center">{btn.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
