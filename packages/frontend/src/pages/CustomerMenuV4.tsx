import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ShoppingCart, Plus, Minus, X, Bell,
    Loader2, Sparkles, Flame
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
        all: 'Tất cả',
        items: 'món',
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
        all: 'すべて',
        items: '品',
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
        all: '全部',
        items: '份',
    },
};

// Shimmer CSS for skeleton loading
const shimmerStyle = `
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}
.skeleton-shimmer::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    animation: shimmer 1.5s infinite;
}
`;

// Skeleton Card Component
const SkeletonCard = ({ delay = 0 }: { delay?: number }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay * 0.05 }}
        className="rounded-2xl overflow-hidden bg-white/5 border border-white/10"
    >
        <div className="aspect-square relative overflow-hidden bg-slate-800 skeleton-shimmer">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800" />
        </div>
        <div className="p-3 space-y-2">
            <div className="h-4 bg-slate-700 rounded-full w-3/4 skeleton-shimmer relative overflow-hidden" />
            <div className="h-5 bg-orange-500/20 rounded-full w-1/2 skeleton-shimmer relative overflow-hidden" />
        </div>
    </motion.div>
);

// Featured Skeleton
const SkeletonFeatured = () => (
    <div className="py-4">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 rounded bg-orange-400/20" />
            <div className="h-5 w-32 bg-slate-700 rounded-full" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {[0, 1, 2].map(i => (
                <div key={i} className="shrink-0 w-64 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                    <div className="h-40 bg-slate-800 skeleton-shimmer relative overflow-hidden" />
                    <div className="p-3 space-y-2">
                        <div className="h-4 bg-slate-700 rounded-full w-3/4" />
                        <div className="flex justify-between">
                            <div className="h-5 bg-orange-500/20 rounded-full w-20" />
                            <div className="w-9 h-9 rounded-full bg-slate-700" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Lazy Image Component with fade-in
const LazyImage = ({
    src,
    alt,
    className
}: {
    src: string;
    alt: string;
    className?: string
}) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <div className={`${className} bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-4xl`}>
                🍜
            </div>
        );
    }

    return (
        <div className={`${className} relative`}>
            {!loaded && (
                <div className="absolute inset-0 bg-slate-800 animate-pulse" />
            )}
            <motion.img
                src={src}
                alt={alt}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: loaded ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className={`${className} ${loaded ? '' : 'invisible'}`}
            />
        </div>
    );
};

// Stagger animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function CustomerMenuV4() {
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
    const [addedToCart, setAddedToCart] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const tabsRef = useRef<HTMLDivElement>(null);

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
            setSelectedCategory(null); // Show all by default
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

        // Show toast
        setAddedToCart(product.id);
        setTimeout(() => setAddedToCart(null), 1500);

        setSelectedProduct(null);
        setProductQuantity(1);
        setProductNotes([]);
    };

    const quickAddToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1, notes: [] }];
        });
        setAddedToCart(product.id);
        setTimeout(() => setAddedToCart(null), 1500);
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

    const getCartItemQuantity = (productId: string) => {
        const item = cart.find(i => i.product.id === productId);
        return item?.quantity || 0;
    };

    // Handle order submission
    const handleOrder = async () => {
        if (!tableId || cart.length === 0) return;
        setIsSubmitting(true);

        const items = cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
            notes: item.notes.join(', ')
        }));

        try {
            const res = await fetch(`${API_BASE}/api/customer/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_id: tableId,
                    items,
                    notes: ''
                })
            });

            if (!res.ok) throw new Error('Failed to create order');

            // Success
            setCart([]);
            setShowCart(false);
            alert(language === 'vi' ? 'Đã gửi đơn hàng thành công!' : language === 'jp' ? '注文が送信されました！' : '订单已发送！');
            fetchMenu(language); // Refresh to get updated session
        } catch (err) {
            console.error(err);
            alert(language === 'vi' ? 'Lỗi gửi đơn hàng!' : language === 'jp' ? '注文の送信に失敗しました！' : '发送订单失败！');
        } finally {
            setIsSubmitting(false);
        }
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const filteredProducts = categories.flatMap(cat => {
        if (selectedCategory && cat.id !== selectedCategory) return [];
        return cat.products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const t = UI_TEXTS[language];

    // ==================== IDLE SCREEN ====================
    if (appState === 'idle') {
        return (
            <div
                className="fixed inset-0 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden"
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
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20" />
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
                        className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-2xl shadow-orange-500/30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <span className="text-5xl">🍜</span>
                    </motion.div>

                    <h1 className="text-5xl font-light text-white mb-3 tracking-wide">
                        {LANG_LABELS.vi.welcome}
                    </h1>
                    <p className="text-xl text-orange-200/80 mb-12">{LANG_LABELS.vi.tap}</p>

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
                                className={`h-1 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 bg-orange-400' : 'w-2 bg-white/30'
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
            <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-orange-500 rounded-full blur-[120px]" />
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-red-600 rounded-full blur-[150px]" />
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative z-10 text-center"
                >
                    <motion.div
                        className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-xl"
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                    >
                        <span className="text-4xl">🍜</span>
                    </motion.div>

                    <h1 className="text-3xl font-light text-white mb-2">
                        Chọn ngôn ngữ
                    </h1>
                    <p className="text-orange-200/60 mb-12 text-sm">言語を選択 • 选择语言</p>

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
                                className="group flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-orange-400/50 hover:bg-white/10 transition-all duration-300"
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
            <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden">
                {/* Inject shimmer CSS */}
                <style>{shimmerStyle}</style>

                {/* Ambient Light Effects */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px]" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]" />
                </div>

                {/* Skeleton Header */}
                <div className="relative z-10 px-4 py-3 flex items-center gap-3 border-b border-white/5">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 animate-pulse" />
                    <div className="flex-1 h-12 bg-slate-800/50 rounded-xl" />
                    <div className="w-14 h-12 rounded-xl bg-slate-800 animate-pulse" />
                </div>

                {/* Skeleton Tabs */}
                <div className="relative z-10 px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className={`shrink-0 h-10 rounded-full bg-slate-800/50 ${i === 0 ? 'w-20' : 'w-28'}`} />
                    ))}
                </div>

                {/* Skeleton Content */}
                <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar relative z-10">
                    {/* Featured Skeleton */}
                    <SkeletonFeatured />

                    {/* Product Grid Skeleton */}
                    <div className="py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                                <SkeletonCard key={i} delay={i} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Loading indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-white/5 backdrop-blur-sm rounded-full z-50">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    >
                        <Loader2 className="w-5 h-5 text-orange-400" />
                    </motion.div>
                    <span className="text-white/70 text-sm">{t.loading}</span>
                </div>
            </div>
        );
    }


    // ==================== ERROR ====================
    if (error) {
        return (
            <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-6">😔</div>
                    <p className="text-xl text-white mb-6">{t.error}</p>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => fetchMenu(language)}
                        className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-full"
                    >
                        Thử lại
                    </motion.button>
                </div>
            </div>
        );
    }

    // ==================== MAIN MENU V4 ====================
    return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col overflow-hidden">
            {/* Inject shimmer CSS */}
            <style>{shimmerStyle}</style>

            {/* Ambient Light Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Header - Matching Mockup */}
            <div className="relative z-10 px-4 py-3 flex items-center gap-3 border-b border-orange-500/20">
                {/* Logo */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAppState('language')}
                    className="flex items-center gap-2 shrink-0"
                >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                        <span className="text-2xl">🍜</span>
                    </div>
                    <div className="hidden sm:block">
                        <span className="text-orange-400 font-bold text-lg">GIA VỊ</span>
                    </div>
                </motion.button>

                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                        type="text"
                        placeholder={t.search}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-2.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 focus:border-orange-400/50 outline-none text-white placeholder-white/40 transition-colors text-sm"
                    />
                </div>

                {/* Table Badge */}
                <div className="flex items-center gap-1 text-white/80">
                    <span className="text-sm">{t.table}</span>
                    <span className="text-orange-400 font-bold">{table?.number || table?.name || '1'}</span>
                </div>

                {/* Cart Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCart(true)}
                    className="relative p-2.5 flex items-center gap-2"
                >
                    <ShoppingCart className="w-6 h-6 text-white" />
                    {cartCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center font-bold"
                        >
                            {cartCount}
                        </motion.span>
                    )}
                </motion.button>
            </div>

            {/* Category Tabs - Underline Style (Matching Mockup) */}
            <div
                ref={tabsRef}
                className="relative z-10 px-4 py-2 flex gap-6 overflow-x-auto no-scrollbar border-b border-white/10"
            >
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`shrink-0 pb-2 text-sm font-medium transition-all relative ${selectedCategory === null
                        ? 'text-orange-400'
                        : 'text-white/60 hover:text-white/80'
                        }`}
                >
                    {t.all}
                    {selectedCategory === null && (
                        <motion.div
                            layoutId="tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                        />
                    )}
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`shrink-0 pb-2 text-sm font-medium transition-all relative ${selectedCategory === cat.id
                            ? 'text-orange-400'
                            : 'text-white/60 hover:text-white/80'
                            }`}
                    >
                        {cat.name}
                        {selectedCategory === cat.id && (
                            <motion.div
                                layoutId="tab-underline"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-24 no-scrollbar relative z-10">
                {/* Featured Section */}
                {featured.length > 0 && !searchQuery && !selectedCategory && (
                    <div className="py-4">
                        <div className="flex items-center gap-3 mb-4">
                            <Sparkles className="w-5 h-5 text-orange-400" />
                            <h2 className="text-lg font-semibold text-white">{t.featured}</h2>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                            {featured.map((product, i) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ scale: 1.02, y: -3 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setProductQuantity(1);
                                        setProductNotes([]);
                                    }}
                                    className="shrink-0 w-64 rounded-2xl overflow-hidden cursor-pointer group relative bg-white/5 backdrop-blur-sm border border-white/10 hover:border-orange-400/30"
                                >
                                    {/* Image */}
                                    <div className="h-40 relative overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={getImageUrl(product.image_url)!}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-5xl">🍜</div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                                        {/* Badge */}
                                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center gap-1">
                                            <Flame className="w-3 h-3" /> HOT
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-3">
                                        <h3 className="text-white font-medium mb-1 line-clamp-1">{product.name}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-orange-400 font-bold text-lg">
                                                ₫{product.price.toLocaleString()}
                                            </span>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    quickAddToCart(product);
                                                }}
                                                className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg"
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
                <div className="py-4">
                    {selectedCategory && (
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">{categories.find(c => c.id === selectedCategory)?.icon || '🍴'}</span>
                            <h2 className="text-lg font-semibold text-white">
                                {categories.find(c => c.id === selectedCategory)?.name}
                            </h2>
                            <span className="text-white/40 text-sm">({filteredProducts.length})</span>
                        </div>
                    )}

                    <motion.div
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        key={selectedCategory || 'all'}
                    >
                        {filteredProducts.map((product) => {
                            const inCartQty = getCartItemQuantity(product.id);
                            return (
                                <motion.div
                                    key={product.id}
                                    variants={itemVariants}
                                    whileHover={{ y: -4, boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)' }}
                                    className="group rounded-lg overflow-hidden bg-slate-900/90 backdrop-blur-sm border border-orange-500/40 hover:border-orange-500/70 cursor-pointer transition-all duration-300 shadow-lg shadow-orange-500/10"
                                    onClick={() => {
                                        setSelectedProduct(product);
                                        setProductQuantity(1);
                                        setProductNotes([]);
                                    }}
                                >
                                    {/* Image - smaller aspect ratio for 3 cols */}
                                    <div className="aspect-square relative overflow-hidden">
                                        {product.image_url ? (
                                            <img
                                                src={getImageUrl(product.image_url)!}
                                                alt={product.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl sm:text-4xl">🍜</div>
                                        )}

                                        {/* Added toast */}
                                        <AnimatePresence>
                                            {addedToCart === product.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.5 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.5 }}
                                                    className="absolute inset-0 bg-green-500/90 flex items-center justify-center"
                                                >
                                                    <span className="text-white font-bold text-xs sm:text-lg">✓ Đã thêm!</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Badges - Top Left (Mockup Style) */}
                                        {product.is_best_seller && (
                                            <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-red-500 text-white text-[8px] sm:text-[10px] font-bold shadow">
                                                HOT
                                            </div>
                                        )}
                                        {product.featured_badge === 'discount' && (
                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-gradient-to-br from-orange-500 to-red-500 text-white text-[7px] sm:text-[9px] font-bold leading-tight text-center">
                                                <span className="block">-10%</span>
                                            </div>
                                        )}

                                        {/* Quick Add Button on Image (only when not in cart) */}
                                        {inCartQty === 0 && (
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="absolute bottom-1 right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    quickAddToCart(product);
                                                }}
                                            >
                                                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                            </motion.button>
                                        )}
                                    </div>

                                    {/* Info Section - Compact for 3col */}
                                    <div className="p-1.5 sm:p-2.5">
                                        <h3 className="text-white text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1.5 line-clamp-1 leading-tight">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-orange-400 font-bold text-[10px] sm:text-sm">
                                                ¥{product.price.toLocaleString()}
                                            </p>
                                            {/* Quantity Controls - Compact for 3col */}
                                            {inCartQty > 0 ? (
                                                <div
                                                    className="flex items-center gap-0.5 sm:gap-1"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => updateCartQuantity(product.id, -1)}
                                                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-orange-500 bg-transparent flex items-center justify-center text-orange-400"
                                                    >
                                                        <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    </motion.button>
                                                    <span className="text-white font-medium text-[10px] sm:text-sm w-4 sm:w-5 text-center">{inCartQty}</span>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => updateCartQuantity(product.id, 1)}
                                                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-orange-500 flex items-center justify-center text-white"
                                                    >
                                                        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                    </motion.button>
                                                </div>
                                            ) : (
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        quickAddToCart(product);
                                                    }}
                                                >
                                                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </div>

            {/* Floating Cart - Mockup Style Pill */}
            <AnimatePresence>
                {cartCount > 0 && !showCart && (
                    <motion.button
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCart(true)}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 py-3 px-6 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 rounded-full flex items-center gap-4 shadow-2xl shadow-orange-500/40"
                    >
                        <ShoppingCart className="w-5 h-5 text-white" />
                        <span className="text-white font-bold text-lg">₫{cartTotal.toLocaleString()}</span>
                        <div className="bg-white/20 px-3 py-1 rounded-full">
                            <span className="text-white font-medium text-sm">{cartCount} Món</span>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Call Staff Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowQuickActions(true)}
                className="fixed bottom-6 left-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30"
                style={{ display: cartCount > 0 ? 'none' : 'flex' }}
            >
                <Bell className="w-6 h-6" />
            </motion.button>

            {/* Product Detail Bottom Sheet */}
            <AnimatePresence>
                {selectedProduct && (
                    <>
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProduct(null)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        />
                        {/* Bottom Sheet */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl z-50 overflow-hidden border-t border-white/10 shadow-2xl max-h-[70vh]"
                        >
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-12 h-1.5 bg-white/30 rounded-full" />
                            </div>

                            {/* Content - Horizontal Layout */}
                            <div className="px-4 pb-4">
                                <div className="flex gap-4 mb-4">
                                    {/* Image - Compact */}
                                    <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-slate-800">
                                        {selectedProduct.image_url ? (
                                            <img
                                                src={getImageUrl(selectedProduct.image_url)!}
                                                alt={selectedProduct.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl">🍜</div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-xl font-bold text-white mb-1 truncate">{selectedProduct.name}</h2>
                                        <p className="text-2xl font-bold text-orange-400 mb-2">¥{selectedProduct.price.toLocaleString()}</p>

                                        {selectedProduct.description && (
                                            <p className="text-white/50 text-sm line-clamp-2">{selectedProduct.description}</p>
                                        )}
                                    </div>

                                    {/* Close Button */}
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => setSelectedProduct(null)}
                                        className="w-8 h-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white/60"
                                    >
                                        <X className="w-4 h-4" />
                                    </motion.button>
                                </div>

                                {/* Quick Notes - Horizontal Chips */}
                                {quickNotes[selectedProduct.id]?.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-white/60 text-sm mb-2">{t.notes}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {quickNotes[selectedProduct.id].map(note => (
                                                <motion.button
                                                    key={note.id}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => {
                                                        setProductNotes(prev =>
                                                            prev.includes(note.label)
                                                                ? prev.filter(n => n !== note.label)
                                                                : [...prev, note.label]
                                                        );
                                                    }}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${productNotes.includes(note.label)
                                                        ? 'bg-orange-500 text-white'
                                                        : 'bg-white/10 text-white/70 border border-white/20'
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

                                {/* Quantity + Add Button Row */}
                                <div className="flex items-center gap-3">
                                    {/* Quantity Selector */}
                                    <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setProductQuantity(q => Math.max(1, q - 1))}
                                            className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </motion.button>
                                        <span className="text-xl font-bold text-white w-8 text-center">{productQuantity}</span>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setProductQuantity(q => q + 1)}
                                            className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center text-white"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </motion.button>
                                    </div>

                                    {/* Add to Cart Button */}
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => addToCart(selectedProduct, productQuantity, productNotes)}
                                        className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30"
                                    >
                                        <ShoppingCart className="w-5 h-5" />
                                        <span>{t.addToCart} • ¥{(selectedProduct.price * productQuantity).toLocaleString()}</span>
                                    </motion.button>
                                </div>
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
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 z-50 flex flex-col border-l border-white/10"
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
                                                        <div className="w-full h-full bg-slate-700 flex items-center justify-center text-2xl">🍜</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-medium line-clamp-1">{item.product.name}</h4>
                                                    <p className="text-orange-400 font-bold">₫{item.product.price.toLocaleString()}</p>
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
                                                            className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white"
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
                                        <span className="text-3xl font-bold text-orange-400">₫{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleOrder}
                                        disabled={isSubmitting}
                                        className={`w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl font-bold text-lg text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                {language === 'vi' ? 'Đang gửi...' : t.loading}
                                            </>
                                        ) : (
                                            t.order
                                        )}
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
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-slate-900 rounded-3xl z-50 p-6 border border-white/10 shadow-2xl"
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
                                        className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-orange-400/50 hover:bg-white/10 transition-all"
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
