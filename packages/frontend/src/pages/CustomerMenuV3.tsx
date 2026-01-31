import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ShoppingCart, Plus, Minus, X, Bell,
    Loader2, Sparkles, Flame, Star
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Types
interface Product {
    id: string;
    name: string;
    price: number;
    description?: string;
    image_url?: string;
    available: boolean;
    is_featured?: boolean;
    featured_badge?: string;
    is_best_seller?: boolean;
    is_chef_choice?: boolean;
}

interface Category {
    id: string;
    name: string;
    icon?: string;
    sort_order: number;
    products: Product[];
}

interface CartItem {
    product: Product;
    quantity: number;
    notes: string[];
}

interface QuickNote {
    id: string;
    label: string;
    price_modifier: number;
}

interface SlideshowImage {
    id: string;
    image_url: string;
    title?: string;
}

type Language = 'vi' | 'jp' | 'cn';
type AppState = 'idle' | 'language' | 'menu';

const IDLE_TIMEOUT = 120000;

const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
};

const LANG_LABELS: Record<Language, { flag: string; name: string; welcome: string; tap: string }> = {
    vi: { flag: '🇻🇳', name: 'Tiếng Việt', welcome: 'Chào mừng quý khách', tap: 'Chạm để bắt đầu' },
    jp: { flag: '🇯🇵', name: '日本語', welcome: 'いらっしゃいませ', tap: 'タップして開始' },
    cn: { flag: '🇨🇳', name: '中文', welcome: '欢迎光临', tap: '点击开始' },
};

const UI_TEXTS: Record<Language, Record<string, string>> = {
    vi: {
        search: 'Tìm món ăn...',
        featured: 'Món đặc biệt',
        hot: 'Được yêu thích',
        addToCart: 'Thêm vào giỏ',
        cart: 'Giỏ hàng của bạn',
        emptyCart: 'Chưa có món nào',
        total: 'Tổng cộng',
        order: 'Gửi đơn hàng',
        quantity: 'Số lượng',
        notes: 'Tuỳ chọn thêm',
        callStaff: 'Gọi phục vụ',
        payment: 'Thanh toán',
        loading: 'Đang tải thực đơn...',
        error: 'Không thể tải menu',
        table: 'Bàn',
    },
    jp: {
        search: 'メニューを検索...',
        featured: 'おすすめ',
        hot: '人気メニュー',
        addToCart: 'カートに追加',
        cart: 'ご注文',
        emptyCart: 'カートは空です',
        total: '合計',
        order: '注文する',
        quantity: '数量',
        notes: 'オプション',
        callStaff: 'スタッフを呼ぶ',
        payment: 'お会計',
        loading: 'メニューを読み込み中...',
        error: 'メニューが読み込めません',
        table: 'テーブル',
    },
    cn: {
        search: '搜索菜单...',
        featured: '推荐',
        hot: '人气菜品',
        addToCart: '加入购物车',
        cart: '您的订单',
        emptyCart: '购物车为空',
        total: '总计',
        order: '下单',
        quantity: '数量',
        notes: '选项',
        callStaff: '呼叫服务员',
        payment: '结账',
        loading: '正在加载菜单...',
        error: '无法加载菜单',
        table: '桌',
    },
};

// Premium gradient backgrounds
const GRADIENTS = {
    primary: 'bg-gradient-to-br from-amber-900 via-stone-900 to-neutral-900',
    card: 'bg-gradient-to-br from-stone-800/80 to-stone-900/90',
    gold: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400',
    red: 'bg-gradient-to-r from-rose-600 to-red-700',
    glass: 'backdrop-blur-xl bg-white/10',
};

export default function CustomerMenuV3() {
    const { tableId } = useParams<{ tableId: string }>();

    const [appState, setAppState] = useState<AppState>('idle');
    const [language, setLanguage] = useState<Language>('vi');

    const [categories, setCategories] = useState<Category[]>([]);
    const [featured, setFeatured] = useState<Product[]>([]);
    const [slideshow, setSlideshow] = useState<SlideshowImage[]>([]);
    const [quickNotes, setQuickNotes] = useState<Record<string, QuickNote[]>>({});
    const [table, setTable] = useState<{ id: string; number: number; name: string } | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productNotes, setProductNotes] = useState<string[]>([]);

    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const resetIdleTimer = useCallback(() => {
        lastActivityRef.current = Date.now();
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (appState === 'menu') {
            idleTimerRef.current = setTimeout(() => {
                setAppState('idle');
                setCart([]);
                setSearchQuery('');
                setSelectedProduct(null);
                setShowCart(false);
            }, IDLE_TIMEOUT);
        }
    }, [appState]);

    useEffect(() => {
        const handleActivity = () => resetIdleTimer();
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('click', handleActivity);
        window.addEventListener('scroll', handleActivity);
        return () => {
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    useEffect(() => {
        if (appState === 'idle' && slideshow.length > 1) {
            const interval = setInterval(() => {
                setCurrentSlide(prev => (prev + 1) % slideshow.length);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [appState, slideshow.length]);

    const fetchMenu = useCallback(async (lang: Language) => {
        if (!tableId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/customer/menu-v3/${tableId}?lang=${lang}`);
            if (!res.ok) throw new Error('Failed to fetch menu');

            const data = await res.json();
            setTable(data.table);
            setCategories(data.categories || []);
            setFeatured(data.featured || []);
            setSlideshow(data.slideshow || []);
            setQuickNotes(data.quickNotes || {});

            if (data.categories?.length > 0) {
                setSelectedCategory(data.categories[0].id);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    useEffect(() => {
        if (tableId && slideshow.length === 0) {
            fetch(`${API_BASE}/api/customer/menu-v3/${tableId}?lang=vi`)
                .then(res => res.json())
                .then(data => {
                    setSlideshow(data.slideshow || []);
                    setTable(data.table);
                })
                .catch(() => { });
        }
    }, [tableId, slideshow.length]);

    const handleLanguageSelect = (lang: Language) => {
        setLanguage(lang);
        fetchMenu(lang);
        setAppState('menu');
        resetIdleTimer();
    };

    const addToCart = (product: Product, quantity: number, notes: string[]) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity, notes: [...item.notes, ...notes] }
                        : item
                );
            }
            return [...prev, { product, quantity, notes }];
        });
        setSelectedProduct(null);
        setProductQuantity(1);
        setProductNotes([]);
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const filteredCategories = categories.map(cat => ({
        ...cat,
        products: cat.products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.products.length > 0 || !searchQuery);

    const t = UI_TEXTS[language];

    // ==================== IDLE SCREEN ====================
    if (appState === 'idle') {
        return (
            <div
                className="fixed inset-0 bg-black flex items-center justify-center cursor-pointer overflow-hidden"
                onClick={() => setAppState('language')}
            >
                <AnimatePresence mode="wait">
                    {slideshow.length > 0 && (
                        <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0"
                        >
                            <img
                                src={getImageUrl(slideshow[currentSlide]?.image_url) || ''}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    className="relative z-10 text-center"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <motion.div
                        className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <span className="text-5xl">🍜</span>
                    </motion.div>

                    <h1 className="text-5xl font-light text-white mb-3 tracking-wide">
                        {LANG_LABELS.vi.welcome}
                    </h1>
                    <p className="text-xl text-amber-200/80 mb-12">{LANG_LABELS.vi.tap}</p>

                    <div className="flex justify-center gap-6">
                        {(['vi', 'jp', 'cn'] as Language[]).map((lang, i) => (
                            <motion.div
                                key={lang}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 + i * 0.1 }}
                                className="text-4xl p-3 rounded-full bg-white/10 backdrop-blur-sm"
                            >
                                {LANG_LABELS[lang].flag}
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {slideshow.length > 1 && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3">
                        {slideshow.map((_, i) => (
                            <motion.div
                                key={i}
                                className={`h-1 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 bg-amber-400' : 'w-2 bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ==================== LANGUAGE SELECTION ====================
    if (appState === 'language') {
        return (
            <div className={`fixed inset-0 ${GRADIENTS.primary} flex items-center justify-center`}>
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-amber-500 rounded-full blur-[120px]" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-orange-600 rounded-full blur-[150px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 text-center"
                >
                    <motion.div
                        className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl"
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    >
                        <span className="text-4xl">🍜</span>
                    </motion.div>

                    <h1 className="text-3xl font-light text-white mb-2">
                        Chọn ngôn ngữ
                    </h1>
                    <p className="text-amber-200/60 mb-12 text-sm">言語を選択 • 选择语言</p>

                    <div className="flex gap-6">
                        {(['vi', 'jp', 'cn'] as Language[]).map((lang, i) => (
                            <motion.button
                                key={lang}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                whileHover={{ scale: 1.05, y: -5 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleLanguageSelect(lang)}
                                className="group flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-amber-400/50 hover:bg-white/10 transition-all duration-300"
                            >
                                <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
                                    {LANG_LABELS[lang].flag}
                                </span>
                                <span className="text-lg text-white/80 group-hover:text-white font-medium">
                                    {LANG_LABELS[lang].name}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    // ==================== LOADING ====================
    if (loading) {
        return (
            <div className={`fixed inset-0 ${GRADIENTS.primary} flex items-center justify-center`}>
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                        <Loader2 className="w-16 h-16 text-amber-400 mx-auto mb-6" />
                    </motion.div>
                    <p className="text-white/80 text-lg">{t.loading}</p>
                </motion.div>
            </div>
        );
    }

    // ==================== ERROR ====================
    if (error) {
        return (
            <div className={`fixed inset-0 ${GRADIENTS.primary} flex items-center justify-center`}>
                <div className="text-center">
                    <div className="text-6xl mb-6">😔</div>
                    <p className="text-xl text-white mb-6">{t.error}</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fetchMenu(language)}
                        className="px-8 py-3 bg-amber-500 text-black font-semibold rounded-full"
                    >
                        Thử lại
                    </motion.button>
                </div>
            </div>
        );
    }

    // ==================== MAIN MENU ====================
    return (
        <div className={`fixed inset-0 ${GRADIENTS.primary} flex overflow-hidden`}>
            {/* Ambient Light Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px]" />
            </div>

            {/* Sidebar */}
            <div className="w-28 md:w-36 shrink-0 flex flex-col py-4 px-2 relative z-10 border-r border-white/5">
                {/* Language Switch */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAppState('language')}
                    className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/10 hover:border-amber-400/50 transition-colors"
                >
                    {LANG_LABELS[language].flag}
                </motion.button>

                {/* Categories */}
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                    {categories.map((cat, i) => (
                        <motion.button
                            key={cat.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`w-full p-3 rounded-2xl transition-all duration-300 ${selectedCategory === cat.id
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30'
                                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <div className="text-2xl mb-1">{cat.icon || '🍴'}</div>
                            <div className="text-[10px] md:text-xs font-medium line-clamp-2 leading-tight">
                                {cat.name}
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* Quick Actions */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowQuickActions(true)}
                    className="mt-4 mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30"
                >
                    <Bell className="w-6 h-6" />
                </motion.button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Header */}
                <div className="px-6 py-4 flex items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            placeholder={t.search}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 focus:border-amber-400/50 outline-none text-white placeholder-white/40 transition-colors"
                        />
                    </div>

                    {/* Table Badge */}
                    {table && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                            <span className="text-amber-400 text-sm">{t.table}</span>
                            <span className="text-white font-bold">{table.number || table.name}</span>
                        </div>
                    )}

                    {/* Cart Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCart(true)}
                        className="relative p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center gap-3 shadow-lg shadow-amber-500/30"
                    >
                        <ShoppingCart className="w-6 h-6 text-black" />
                        {cartCount > 0 && (
                            <>
                                <span className="text-black font-bold">{cartCount}</span>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold"
                                >
                                    {cartCount}
                                </motion.div>
                            </>
                        )}
                    </motion.button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 no-scrollbar">
                    {/* Featured Section */}
                    {featured.length > 0 && !searchQuery && (
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-5">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                <h2 className="text-xl font-semibold text-white">{t.featured}</h2>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                                {featured.map((product, i) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        whileHover={{ scale: 1.02, y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setProductQuantity(1);
                                            setProductNotes([]);
                                        }}
                                        className="shrink-0 w-72 rounded-3xl overflow-hidden cursor-pointer group relative"
                                    >
                                        {/* Image */}
                                        <div className="h-48 relative overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={getImageUrl(product.image_url)!}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center text-5xl">🍜</div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                            {/* Badge */}
                                            {product.featured_badge && (
                                                <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${product.featured_badge === 'hot' ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white' :
                                                        product.featured_badge === 'new' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' :
                                                            product.featured_badge === 'chef' ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black' :
                                                                'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                                                    }`}>
                                                    {product.featured_badge === 'hot' && <Flame className="w-3 h-3" />}
                                                    {product.featured_badge === 'chef' && <Star className="w-3 h-3" />}
                                                    {product.featured_badge === 'hot' ? 'Bán chạy' :
                                                        product.featured_badge === 'new' ? 'Mới' :
                                                            product.featured_badge === 'chef' ? 'Đặc sắc' : 'Giảm giá'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info Overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4">
                                            <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">{product.name}</h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-amber-400 font-bold text-xl">
                                                    ¥{product.price.toLocaleString()}
                                                </span>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        addToCart(product, 1, []);
                                                    }}
                                                    className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Products Grid */}
                    {filteredCategories.map(cat => (
                        <div
                            key={cat.id}
                            className={`mb-8 ${selectedCategory === cat.id ? '' : 'hidden md:block'}`}
                        >
                            <div className="flex items-center gap-3 mb-5">
                                <span className="text-2xl">{cat.icon || '🍴'}</span>
                                <h2 className="text-xl font-semibold text-white">{cat.name}</h2>
                                <span className="text-white/40 text-sm">({cat.products.length})</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {cat.products.map((product, i) => (
                                    <motion.div
                                        key={product.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        whileHover={{ y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setSelectedProduct(product);
                                            setProductQuantity(1);
                                            setProductNotes([]);
                                        }}
                                        className="group rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 hover:border-amber-400/30 cursor-pointer transition-all duration-300"
                                    >
                                        {/* Image */}
                                        <div className="aspect-square relative overflow-hidden">
                                            {product.image_url ? (
                                                <img
                                                    src={getImageUrl(product.image_url)!}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center text-4xl">🍜</div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                            {/* Quick Add Button */}
                                            <motion.button
                                                initial={{ scale: 0 }}
                                                whileHover={{ scale: 1.1 }}
                                                className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    addToCart(product, 1, []);
                                                }}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </motion.button>

                                            {/* Badges */}
                                            {product.is_best_seller && (
                                                <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold flex items-center gap-1">
                                                    <Flame className="w-3 h-3" /> HOT
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="p-3">
                                            <h3 className="text-white text-sm font-medium mb-1 line-clamp-2 leading-tight group-hover:text-amber-200 transition-colors">
                                                {product.name}
                                            </h3>
                                            <p className="text-amber-400 font-bold">
                                                ¥{product.price.toLocaleString()}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Product Detail Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProduct(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.9 }}
                            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-gradient-to-b from-stone-800 to-stone-900 rounded-3xl z-50 overflow-hidden flex flex-col border border-white/10 shadow-2xl"
                        >
                            {/* Close */}
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white border border-white/20"
                            >
                                <X className="w-5 h-5" />
                            </motion.button>

                            {/* Image */}
                            <div className="h-56 md:h-72 shrink-0 relative">
                                {selectedProduct.image_url ? (
                                    <img
                                        src={getImageUrl(selectedProduct.image_url)!}
                                        alt={selectedProduct.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center text-7xl">🍜</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 -mt-10 relative">
                                <h2 className="text-2xl font-bold text-white mb-2">{selectedProduct.name}</h2>
                                <p className="text-3xl font-bold text-amber-400 mb-4">¥{selectedProduct.price.toLocaleString()}</p>

                                {selectedProduct.description && (
                                    <p className="text-white/60 mb-6 leading-relaxed">{selectedProduct.description}</p>
                                )}

                                {/* Quick Notes */}
                                {quickNotes[selectedProduct.id]?.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-white/80 font-medium mb-3">{t.notes}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {quickNotes[selectedProduct.id].map(note => (
                                                <motion.button
                                                    key={note.id}
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        setProductNotes(prev =>
                                                            prev.includes(note.label)
                                                                ? prev.filter(n => n !== note.label)
                                                                : [...prev, note.label]
                                                        );
                                                    }}
                                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${productNotes.includes(note.label)
                                                            ? 'bg-amber-500 text-black'
                                                            : 'bg-white/10 text-white/70 border border-white/20 hover:border-amber-400/50'
                                                        }`}
                                                >
                                                    {note.label}
                                                    {note.price_modifier !== 0 && (
                                                        <span className="ml-1 opacity-70">
                                                            {note.price_modifier > 0 ? '+' : ''}¥{note.price_modifier}
                                                        </span>
                                                    )}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity */}
                                <div className="flex items-center justify-between">
                                    <span className="text-white/80 font-medium">{t.quantity}</span>
                                    <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-1">
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setProductQuantity(q => Math.max(1, q - 1))}
                                            className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </motion.button>
                                        <span className="text-2xl font-bold text-white w-10 text-center">{productQuantity}</span>
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setProductQuantity(q => q + 1)}
                                            className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-black"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                </div>
                            </div>

                            {/* Add Button */}
                            <div className="p-4 border-t border-white/10">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => addToCart(selectedProduct, productQuantity, productNotes)}
                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl font-bold text-lg text-black flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {t.addToCart} • ¥{(selectedProduct.price * productQuantity).toLocaleString()}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Cart Drawer */}
            <AnimatePresence>
                {showCart && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCart(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gradient-to-b from-stone-800 to-stone-900 z-50 flex flex-col border-l border-white/10"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-white/10">
                                <h2 className="text-xl font-bold text-white">{t.cart}</h2>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowCart(false)}
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                                >
                                    <X className="w-5 h-5" />
                                </motion.button>
                            </div>

                            {/* Items */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {cart.length === 0 ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                                                <ShoppingCart className="w-10 h-10 text-white/20" />
                                            </div>
                                            <p className="text-white/40">{t.emptyCart}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {cart.map(item => (
                                            <motion.div
                                                key={item.product.id}
                                                layout
                                                className="flex gap-3 p-3 rounded-2xl bg-white/5 border border-white/10"
                                            >
                                                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                                                    {item.product.image_url ? (
                                                        <img src={getImageUrl(item.product.image_url)!} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-stone-700 flex items-center justify-center text-2xl">🍜</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-medium line-clamp-1">{item.product.name}</h4>
                                                    <p className="text-amber-400 font-bold">¥{item.product.price.toLocaleString()}</p>
                                                    {item.notes.length > 0 && (
                                                        <p className="text-xs text-white/40 mt-1 line-clamp-1">{item.notes.join(', ')}</p>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => updateCartQuantity(item.product.id, -1)}
                                                            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </motion.button>
                                                        <span className="text-white font-bold w-6 text-center">{item.quantity}</span>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => updateCartQuantity(item.product.id, 1)}
                                                            className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            {cart.length > 0 && (
                                <div className="p-4 border-t border-white/10 bg-black/20">
                                    <div className="flex justify-between mb-4">
                                        <span className="text-white/60">{t.total}</span>
                                        <span className="text-3xl font-bold text-amber-400">¥{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl font-bold text-lg text-black shadow-lg shadow-amber-500/30"
                                    >
                                        {t.order}
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Quick Actions Modal */}
            <AnimatePresence>
                {showQuickActions && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQuickActions(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-gradient-to-b from-stone-800 to-stone-900 rounded-3xl z-50 p-6 border border-white/10 shadow-2xl"
                        >
                            <h2 className="text-xl font-bold text-white text-center mb-6">{t.callStaff}</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: '🧊', label: language === 'vi' ? 'Nước/Đá' : language === 'jp' ? '氷/水' : '冰/水', type: 'water' },
                                    { icon: '🔥', label: language === 'vi' ? 'Đổi vỉ' : language === 'jp' ? '網交換' : '换烤网', type: 'grill' },
                                    { icon: '🥢', label: language === 'vi' ? 'Bát/Đũa' : language === 'jp' ? '食器' : '餐具', type: 'utensils' },
                                    { icon: '👋', label: language === 'vi' ? 'Gọi NV' : language === 'jp' ? 'スタッフ' : '服务员', type: 'service' },
                                    { icon: '💳', label: t.payment, type: 'bill' },
                                ].map(action => (
                                    <motion.button
                                        key={action.type}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={async () => {
                                            try {
                                                await fetch(`${API_BASE}/api/customer/call-service`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ table_id: tableId, type: action.type })
                                                });
                                                setShowQuickActions(false);
                                            } catch { }
                                        }}
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/50 hover:bg-white/10 transition-all"
                                    >
                                        <span className="text-3xl">{action.icon}</span>
                                        <span className="text-sm text-white/80">{action.label}</span>
                                    </motion.button>
                                ))}
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowQuickActions(false)}
                                className="w-full mt-5 py-3 rounded-2xl bg-white/10 text-white/60 font-medium"
                            >
                                {language === 'vi' ? 'Đóng' : language === 'jp' ? '閉じる' : '关闭'}
                            </motion.button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
