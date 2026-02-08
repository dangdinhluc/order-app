import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ShoppingCart, Plus, Minus, X, Bell, Menu,
    Loader2, Sparkles, Flame, Star, Clock, RefreshCw
} from 'lucide-react';
import { useDialog } from '../components/ui/DialogProvider';
import SuccessCelebration from '../components/ui/SuccessCelebration';
import { api, type Language as ApiLanguage } from '../services/api';
import { getTranslatedField } from '../utils/languageUtils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useLanguage } from '../context/LanguageContext';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import LanguageSwitcher from '../components/LanguageSwitcher';

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
    // Translation fields
    name_vi?: string;
    name_ja?: string;
    name_en?: string;
    name_translations?: Record<string, string>;
    description_translations?: Record<string, string>;
}

interface Category {
    id: string;
    name: string;
    icon?: string;
    sort_order: number;
    products: Product[];
    // Translation fields
    name_vi?: string;
    name_ja?: string;
    name_en?: string;
    name_translations?: Record<string, string>;
}

interface CartItem {
    product: Product;
    quantity: number;
    notes: string[];
    notesPriceModifier: number; // Total price modifier from selected toppings
}

interface QuickNote {
    id: string;
    label: string;
    price_modifier: number;
}

interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    note: string;
}

interface KitchenTicket {
    ticket_id: string;
    ticket_number: number;
    sent_at: string;
    status: 'pending' | 'cooking' | 'served' | 'cancelled';
    items: OrderItem[];
}

interface CurrentOrder {
    id: string;
    total: number;
    status: string;
    tickets: KitchenTicket[];
}

interface TableSession {
    id: string;
    order_id: string;
    started_at: string;
}

interface SlideshowImage {
    id: string;
    image_url: string;
    title?: string;
}

// Use string for dynamic language codes
type Language = string;
type AppState = 'idle' | 'language' | 'menu';

const IDLE_TIMEOUT = 120000;

const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
};

// Default labels for hardcoded languages, others will fallback to English/Vietnam
const LANG_LABELS: Record<string, { flag?: string; name?: string; welcome: string; tap: string }> = {
    vi: { flag: '🇻🇳', name: 'Tiếng Việt', welcome: 'Chào mừng quý khách', tap: 'Chạm để bắt đầu' },
    jp: { flag: '🇯🇵', name: '日本語', welcome: 'いらっしゃいませ', tap: 'タップして開始' },
    cn: { flag: '🇨🇳', name: '中文', welcome: '欢迎光临', tap: '点击开始' },
    en: { flag: '🇺🇸', name: 'English', welcome: 'Welcome', tap: 'Tap to start' },
    ko: { flag: '🇰🇷', name: 'Korean', welcome: '환영합니다', tap: '시작하려면 탭하세요' },
};

const UI_TEXTS: Record<string, Record<string, string>> = {
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
    en: {
        search: 'Search menu...',
        featured: 'Featured',
        hot: 'Popular',
        addToCart: 'Add to Cart',
        cart: 'Your Order',
        emptyCart: 'Cart is empty',
        total: 'Total',
        order: 'Place Order',
        quantity: 'Quantity',
        notes: 'Options',
        callStaff: 'Call Staff',
        payment: 'Bill',
        loading: 'Loading menu...',
        error: 'Failed to load menu',
        table: 'Table',
    }
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
    const dialog = useDialog();

    const [appState, setAppState] = useState<AppState>('idle');
    const [language, setLanguage] = useState<Language>('vi');
    const [availableLanguages, setAvailableLanguages] = useState<ApiLanguage[]>([]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [featured, setFeatured] = useState<Product[]>([]);
    const [slideshow, setSlideshow] = useState<SlideshowImage[]>([]);
    const [quickNotes, setQuickNotes] = useState<Record<string, QuickNote[]>>({});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [table, setTable] = useState<{ id: string; number: number; name: string } | null>(null);
    // Branding from admin settings
    const [branding, setBranding] = useState({ name: 'GIA VỊ', slogan: 'Hương vị Việt', icon: '🍜' });

    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [tableSession, setTableSession] = useState<TableSession | null>(null);
    const [currentOrder, setCurrentOrder] = useState<CurrentOrder | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productNotes, setProductNotes] = useState<string[]>([]);
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [flyingItems, setFlyingItems] = useState<{ id: number; x: number; y: number; image?: string }[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [highlightedFeaturedIndex, setHighlightedFeaturedIndex] = useState(0);
    const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
    const [greetingLangIndex, setGreetingLangIndex] = useState(0); // For rotating greetings
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    // Fetch available languages
    useEffect(() => {
        api.getLanguages().then(res => {
            if (res.data?.languages) {
                const active = res.data.languages.filter(l => l.is_active);
                setAvailableLanguages(active);
            }
        }).catch(err => console.error("Failed to load languages", err));
    }, []);

    // Get display languages for greeting: use available languages if loaded, otherwise fallback
    const displayLanguages = availableLanguages.length > 0
        ? availableLanguages.map(l => l.code)
        : ['vi', 'en', 'jp'];

    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const featuredScrollRef = useRef<HTMLDivElement>(null);

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

    // Auto-scroll featured items (Restored for Hero Banner)
    useEffect(() => {
        if (featured.length <= 1) return;

        const interval = setInterval(() => {
            setHighlightedFeaturedIndex(prev => (prev + 1) % featured.length);
        }, 5000); // Rotate every 5 seconds

        return () => clearInterval(interval);
    }, [featured.length]);

    useEffect(() => {
        if (appState === 'idle' && slideshow.length > 1) {
            const interval = setInterval(() => {
                setCurrentSlide(prev => (prev + 1) % slideshow.length);
            }, 4000);
            return () => clearInterval(interval);
        }
    }, [appState, slideshow.length]);

    // Rotate greeting language every 3 seconds on idle screen
    useEffect(() => {
        if (appState === 'idle') {
            const interval = setInterval(() => {
                // Rotate through available languages
                setGreetingLangIndex(prev => (prev + 1) % displayLanguages.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [appState, displayLanguages.length]);

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
            setTableSession(data.active_session);
            setCurrentOrder(data.current_order);

            if (data.categories?.length > 0) {
                setSelectedCategory(data.categories[0].id);
            }
            // Set branding from settings
            if (data.settings) {
                setBranding({
                    name: data.settings.brand_name || 'GIA VỊ',
                    slogan: data.settings.brand_slogan || 'Hương vị Việt',
                    icon: data.settings.brand_icon || '🍜'
                });
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

    // Utility: Spawn confetti at position
    const spawnConfetti = (x: number, y: number) => {
        const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'];
        const particles = Array.from({ length: 12 }, (_, i) => ({
            id: Date.now() + i,
            x: x + (Math.random() - 0.5) * 100,
            y: y,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));
        setConfettiParticles(prev => [...prev, ...particles]);
        setTimeout(() => {
            setConfettiParticles(prev => prev.filter(p => !particles.find(np => np.id === p.id)));
        }, 1000);
    };

    // Utility: Trigger haptic feedback (mobile)
    const triggerHaptic = (pattern: 'light' | 'medium' | 'heavy' = 'light') => {
        if ('vibrate' in navigator) {
            const patterns = { light: [10], medium: [20, 10, 20], heavy: [30, 15, 30] };
            navigator.vibrate(patterns[pattern]);
        }
    };

    // Pull to refresh handler
    const contentRef = useRef<HTMLDivElement>(null);
    const pullStartY = useRef<number>(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (contentRef.current && contentRef.current.scrollTop === 0) {
            pullStartY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (pullStartY.current > 0 && contentRef.current && contentRef.current.scrollTop === 0) {
            const pullY = e.touches[0].clientY - pullStartY.current;
            if (pullY > 0 && pullY < 150) {
                setPullDistance(pullY);
                setIsPulling(pullY > 60);
            }
        }
    };

    const handleTouchEnd = () => {
        if (isPulling) {
            triggerHaptic('medium');
            fetchMenu(language);
        }
        setPullDistance(0);
        setIsPulling(false);
        pullStartY.current = 0;
    };

    const handleLanguageSelect = (lang: Language) => {
        setLanguage(lang);
        fetchMenu(lang);
        setAppState('menu');
        resetIdleTimer();
    };

    const addToCart = (product: Product, quantity: number, notes: string[], notesPriceModifier: number = 0, e?: React.MouseEvent | { clientX: number, clientY: number }) => {
        // Trigger haptic feedback (8. Haptic feedback)
        triggerHaptic('light');

        if (e) {
            const id = Date.now();
            // @ts-expect-error - e.touches comes from touch events
            const { clientX, clientY } = e.clientX ? e : (e.touches?.[0] || {});
            if (clientX) {
                // Spawn confetti (2. Confetti animation)
                spawnConfetti(clientX, clientY);

                setFlyingItems(prev => [...prev, { id, x: clientX, y: clientY, image: product.image_url }]);
                setTimeout(() => {
                    setFlyingItems(prev => prev.filter(item => item.id !== id));
                    setCart(prev => {
                        const existing = prev.find(item => item.product.id === product.id && JSON.stringify(item.notes.sort()) === JSON.stringify(notes.sort()));
                        if (existing) {
                            return prev.map(item =>
                                item.product.id === product.id && JSON.stringify(item.notes.sort()) === JSON.stringify(notes.sort())
                                    ? { ...item, quantity: item.quantity + quantity }
                                    : item
                            );
                        }
                        return [...prev, { product, quantity, notes, notesPriceModifier }];
                    });
                }, 800); // Animation duration
            } else {
                setCart(prev => {
                    const existing = prev.find(item => item.product.id === product.id && JSON.stringify(item.notes.sort()) === JSON.stringify(notes.sort()));
                    if (existing) {
                        return prev.map(item =>
                            item.product.id === product.id && JSON.stringify(item.notes.sort()) === JSON.stringify(notes.sort())
                                ? { ...item, quantity: item.quantity + quantity }
                                : item
                        );
                    }
                    return [...prev, { product, quantity, notes, notesPriceModifier }];
                });
            }
        } else {
            setCart(prev => {
                const existing = prev.find(item => item.product.id === product.id && JSON.stringify(item.notes.sort()) === JSON.stringify(notes.sort()));
                if (existing) {
                    return prev.map(item =>
                        item.product.id === product.id && JSON.stringify(item.notes.sort()) === JSON.stringify(notes.sort())
                            ? { ...item, quantity: item.quantity + quantity }
                            : item
                    );
                }
                return [...prev, { product, quantity, notes, notesPriceModifier }];
            });
        }

        setSelectedProduct(null);
        setProductQuantity(1);
        setProductNotes([]);
    };

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
                    notes: '' // Optional general note
                })
            });

            if (!res.ok) throw new Error('Failed to create order');

            // Success
            setCart([]);
            setShowCart(false);
            setShowSuccessCelebration(true); // Show celebration with confetti
            fetchMenu(language); // Refresh to get updated session
        } catch (err) {
            console.error(err);
            await dialog.alert({
                title: language === 'vi' ? 'Lỗi!' : language === 'jp' ? 'エラー！' : '错误！',
                message: language === 'vi' ? 'Lỗi gửi đơn hàng!' : language === 'jp' ? '注文の送信に失敗しました！' : '发送订单失败！',
                variant: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const scrollToCategory = (categoryId: string) => {
        setShowCategoryMenu(false);
        const element = document.getElementById(`category-${categoryId}`);
        const container = document.getElementById('main-scroll-container');
        if (element && container) {
            // Calculate offset: element position, minus a small gap for sticky header (~10px)
            const headerOffset = 10;
            const elementTop = element.offsetTop;
            container.scrollTo({
                top: elementTop - headerOffset,
                behavior: 'smooth'
            });
        }
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

    // Cart total now includes notesPriceModifier (topping prices)
    const cartTotal = cart.reduce((sum, item) => sum + (item.product.price + item.notesPriceModifier) * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // History Total (from current order session)
    const historyTotal = currentOrder?.total || 0;

    const filteredCategories = categories.map(cat => ({
        ...cat,
        products: cat.products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.products.length > 0 || !searchQuery);

    const t = UI_TEXTS[language];

    // ==================== IDLE / WELCOME SCREEN (Merged with Language Selection) ====================
    if (appState === 'idle') {
        const currentLangCode = displayLanguages[greetingLangIndex];
        const currentLabel = LANG_LABELS[currentLangCode] || LANG_LABELS['en'];

        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
                {/* Background Slideshow */}
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <motion.div
                    className="relative z-10 text-center px-6 w-full max-w-md"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {/* Logo */}
                    <motion.div
                        className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl shadow-amber-500/30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <span className="text-4xl sm:text-5xl">🍜</span>
                    </motion.div>

                    {/* Rotating Greeting - AnimatePresence for smooth transitions */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentLangCode}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="mb-8"
                        >
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-2 tracking-wide">
                                {currentLabel.welcome}
                            </h1>
                            <p className="text-base sm:text-lg text-amber-200/70">
                                {currentLabel.tap}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* Language Selection Buttons - Responsive */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6">
                        {displayLanguages.map((lang, i) => {
                            const label = LANG_LABELS[lang] || { flag: '🌐', name: lang };
                            return (
                                <motion.button
                                    key={lang}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + i * 0.1 }}
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleLanguageSelect(lang)}
                                    className={`group flex items-center gap-3 sm:flex-col sm:gap-2 px-5 py-3 sm:px-6 sm:py-4 rounded-2xl backdrop-blur-xl border transition-all duration-300 ${greetingLangIndex === i
                                        ? 'bg-amber-500/20 border-amber-400/50'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform duration-300">
                                        {label.flag}
                                    </span>
                                    <span className={`text-sm sm:text-base font-medium transition-colors ${greetingLangIndex === i ? 'text-amber-200' : 'text-white/70 group-hover:text-white'
                                        }`}>
                                        {label.name}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Hint text */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="text-xs sm:text-sm text-white/40"
                    >
                        Chọn ngôn ngữ để bắt đầu • 言語を選択 • 选择语言
                    </motion.p>
                </motion.div>

                {/* Slideshow Indicators */}
                {slideshow.length > 1 && (
                    <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
                        {slideshow.map((_, i) => (
                            <motion.div
                                key={i}
                                className={`h-1 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ==================== LANGUAGE SELECTION (Keep as fallback, but normally skipped) ====================
    if (appState === 'language') {
        // Auto-redirect to menu with default language since we merged screens
        handleLanguageSelect('vi');
        return null;
    }

    // ==================== LOADING (3. Shimmer skeleton loading) ====================
    if (loading) {
        return (
            <div className={`fixed inset-0 ${GRADIENTS.primary} flex flex-col`}>
                {/* Header skeleton */}
                <div className="px-4 py-4">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-white/10 skeleton-shimmer" />
                        <div className="flex-1 h-10 rounded-xl bg-white/10 skeleton-shimmer" />
                        <div className="w-10 h-10 rounded-xl bg-white/10 skeleton-shimmer" />
                    </div>
                </div>

                {/* Featured section skeleton */}
                <div className="px-6 mb-6">
                    <div className="w-32 h-6 bg-white/10 rounded-full skeleton-shimmer mb-4" />
                    <div className="flex gap-4 overflow-hidden">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="shrink-0 w-72 h-48 rounded-3xl bg-white/5 skeleton-shimmer" />
                        ))}
                    </div>
                </div>

                {/* Products grid skeleton */}
                <div className="flex-1 px-6">
                    <div className="w-24 h-6 bg-white/10 rounded-full skeleton-shimmer mb-4 mx-auto" />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="rounded-2xl overflow-hidden bg-white/5">
                                <div className="aspect-[4/5] skeleton-shimmer" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Loading text */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                        <Loader2 className="w-5 h-5 text-amber-400" />
                    </motion.div>
                    <p className="text-white/60 text-sm">{t.loading}</p>
                </div>
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

            {/* Confetti Particles (2. Confetti animation) */}
            {confettiParticles.map(particle => (
                <div
                    key={particle.id}
                    className="confetti-particle"
                    style={{
                        left: particle.x,
                        top: particle.y,
                        width: 8,
                        height: 8,
                        backgroundColor: particle.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                    }}
                />
            ))}

            {/* Pull to Refresh Indicator (7. Pull to refresh) */}
            {pullDistance > 0 && (
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 py-4 transition-all"
                    style={{ transform: `translateX(-50%) translateY(${Math.min(pullDistance, 80)}px)` }}
                >
                    <RefreshCw className={`w-6 h-6 text-amber-400 ${isPulling ? 'pull-indicator' : ''}`} />
                    <span className="text-amber-400 text-xs">
                        {isPulling ? 'Thả để làm mới' : 'Kéo xuống...'}
                    </span>
                </div>
            )}

            {/* Main Content Layout */}

            <div className="flex flex-col h-full relative z-10 w-full transition-all duration-300">

                {/* HEADER - Fixed Top */}
                <div className="shrink-0 px-4 md:px-6 py-4 z-40">
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-stone-900/80 to-amber-950/60 backdrop-blur-xl shadow-lg shadow-amber-500/20">
                        {/* Left: Logo */}
                        <div className="flex items-center gap-2 shrink-0">
                            <motion.div
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <span className="text-xl">{branding.icon}</span>
                            </motion.div>
                            <span className="hidden sm:block text-amber-400 font-bold text-sm leading-tight">{branding.name}<br /><span className="text-[10px] text-white/50 font-normal">{branding.slogan}</span></span>
                        </div>

                        {/* Middle: Search */}
                        <div className="flex-1 relative mx-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder={t.search}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 focus:border-amber-400/50 outline-none text-white placeholder-white/40 transition-colors text-sm"
                            />
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowQuickActions(true)}
                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors border border-white/5 text-rose-400"
                            >
                                <Bell className="w-5 h-5" />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowHistory(true)}
                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors border border-white/5 text-blue-400 relative"
                            >
                                <Clock className="w-5 h-5" />
                                {currentOrder && currentOrder.tickets.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                        {currentOrder.tickets.length}
                                    </span>
                                )}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowLanguageModal(true)}
                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors border border-white/5 text-xl"
                            >
                                {(LANG_LABELS[language] || { flag: '🌐' }).flag}
                            </motion.button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* SIDEBAR (Desktop Only - Hidden on Mobile & Tablet) */}
                    <div className="hidden lg:flex flex-col w-20 xl:w-64 shrink-0 bg-stone-900/40 backdrop-blur-lg border-r border-white/5 overflow-y-auto no-scrollbar py-4">
                        {featured.length > 0 && !searchQuery && (
                            <button
                                onClick={() => scrollToCategory('featured')}
                                className={`relative flex items-center gap-3 px-4 py-3 mx-2 transition-all duration-300 group hover:bg-white/5 rounded-lg ${activeCategory === 'featured' ? 'text-amber-50' : 'text-stone-400 hover:text-stone-200'}`}
                            >
                                {/* Emoji Icon */}
                                <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">✨</span>

                                {/* Label */}
                                <span className={`hidden xl:block text-sm text-left truncate transition-colors ${activeCategory === 'featured' ? 'font-semibold' : 'font-medium'}`}>
                                    {t.featured}
                                </span>

                                {/* Active Underline Indicator */}
                                {activeCategory === 'featured' && (
                                    <motion.div
                                        layoutId="active-underline"
                                        className="absolute bottom-1 left-4 right-4 h-[2px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent rounded-full"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        )}
                        {categories.map(cat => {
                            const isActive = activeCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => scrollToCategory(cat.id)}
                                    className={`relative flex items-center gap-3 px-4 py-3 mx-2 transition-all duration-300 group hover:bg-white/5 rounded-lg ${isActive ? 'text-amber-50' : 'text-stone-400 hover:text-stone-200'}`}
                                >
                                    {/* Emoji Icon */}
                                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{cat.icon || '🍜'}</span>

                                    {/* Category Name */}
                                    <span className={`hidden xl:block text-sm text-left truncate transition-colors ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                        {cat.name}
                                    </span>

                                    {/* Badge Count */}
                                    {cat.products?.length > 0 && (
                                        <span className={`hidden xl:flex ml-auto px-1.5 py-0.5 items-center justify-center rounded-full text-[10px] font-bold ${isActive ? 'bg-amber-500/25 text-amber-400' : 'bg-white/10 text-white/50'}`}>
                                            {cat.products.length}
                                        </span>
                                    )}

                                    {/* Active Underline Indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-underline"
                                            className="absolute bottom-1 left-4 right-4 h-[2px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent rounded-full"
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* MAIN FEED (Scrollable) */}
                    <div
                        id="main-scroll-container"
                        ref={contentRef}
                        className="flex-1 overflow-y-auto scroll-smooth no-scrollbar relative px-4 md:px-6 pb-20"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onScroll={(e) => {
                            const container = e.currentTarget;
                            const scrollTop = container.scrollTop;
                            const headerOffset = 180;

                            const featuredEl = document.getElementById('category-featured');
                            if (featuredEl) {
                                if (featuredEl.offsetTop <= scrollTop + headerOffset + 100 && featuredEl.offsetTop + featuredEl.offsetHeight > scrollTop + headerOffset) {
                                    if (activeCategory !== 'featured') setActiveCategory('featured');
                                }
                            }

                            for (const cat of filteredCategories) {
                                const el = document.getElementById(`category-${cat.id}`);
                                if (el) {
                                    if (el.offsetTop <= scrollTop + headerOffset + 100 && el.offsetTop + el.offsetHeight > scrollTop + headerOffset) {
                                        if (activeCategory !== cat.id) setActiveCategory(cat.id);
                                    }
                                }
                            }
                        }}
                    >
                        {/* FEATURED SECTION - Apple Style Carousel */}
                        {featured.length > 0 && !searchQuery && (
                            <div id="category-featured" className="scroll-mt-20 mb-8 mt-2">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4 px-1">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    <h2 className="text-lg font-bold text-amber-100">{t.featured}</h2>
                                </div>

                                {/* Apple-style Horizontal Carousel */}
                                <div className="relative">
                                    <div
                                        className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-4 px-4"
                                        style={{ scrollBehavior: 'smooth' }}
                                    >
                                        {featured.map((product) => (
                                            <motion.div
                                                key={product.id}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setProductQuantity(1);
                                                    setProductNotes([]);
                                                }}
                                                className="flex-shrink-0 w-[85%] md:w-[60%] lg:w-[45%] snap-center cursor-pointer"
                                            >
                                                <div className="relative rounded-3xl overflow-hidden bg-stone-800/60 border border-white/10 shadow-xl group">
                                                    {/* Large Image - Apple Style 4:3 */}
                                                    <div className="aspect-[4/3] relative overflow-hidden">
                                                        {product.image_url ? (
                                                            <img
                                                                src={getImageUrl(product.image_url)!}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-stone-700 to-stone-800 flex items-center justify-center text-6xl">🍜</div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                                                        {/* Featured Badge */}
                                                        <div className="absolute top-4 left-4">
                                                            <div className="px-3 py-1.5 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                                                <Star className="w-3.5 h-3.5 fill-black" /> おすすめ
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Info Overlay - Apple Style */}
                                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                                        <h4 className="text-white font-bold text-xl leading-tight mb-1 drop-shadow-lg">{getTranslatedField(product, 'name', language)}</h4>
                                                        {product.description && (
                                                            <p className="text-white/70 text-sm line-clamp-1 mb-3">{getTranslatedField(product, 'description', language)}</p>
                                                        )}
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-amber-400 font-bold text-2xl drop-shadow-md">¥{product.price.toLocaleString()}</span>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    addToCart(product, 1, [], 0, e);
                                                                }}
                                                                className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/30 hover:bg-amber-400 transition-colors"
                                                            >
                                                                <Plus className="w-6 h-6" strokeWidth={3} />
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Dots Indicator */}
                                    {featured.length > 1 && (
                                        <div className="flex justify-center gap-2 mt-4">
                                            {featured.slice(0, 5).map((_, i) => (
                                                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === 0 ? 'bg-amber-400 w-4' : 'bg-white/30'}`} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* CATEGORY SECTIONS (Sticky Headers) */}
                        <div className="pb-32 space-y-8">
                            {filteredCategories.map(cat => (
                                <div key={cat.id} id={`category-${cat.id}`} className="scroll-mt-16 relative">
                                    {/* STICKY HEADER - Hybrid (Minimal Line + Glassmorphism) */}
                                    <div className="sticky top-0 z-30 bg-stone-900/80 backdrop-blur-lg -mx-4 md:-mx-6 px-4 md:px-6 py-3 transition-all duration-300 border-b border-white/5">
                                        <div className="flex items-center justify-center gap-4 md:gap-6">
                                            {/* Left Line - Gradient (thicker) */}
                                            <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-amber-500/60" />

                                            {/* Center Title */}
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <span className="text-xl">{cat.icon}</span>
                                                <h3 className="text-base md:text-lg font-bold text-amber-50 uppercase tracking-wider">{cat.name}</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-xs text-amber-400 font-bold">{cat.products.length}</span>
                                            </div>

                                            {/* Right Line - Gradient (thicker) */}
                                            <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-amber-500/40 to-amber-500/60" />
                                        </div>
                                    </div>

                                    {/* PRODUCT GRID */}
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 mt-4">
                                        {cat.products.map(product => (
                                            <motion.div
                                                key={product.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setProductQuantity(1);
                                                    setProductNotes([]);
                                                }}
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
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(product, 1, [], 0, e);
                                                        }}
                                                        className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-black shadow-lg shadow-black/30 hover:bg-amber-400 transition-colors z-10"
                                                    >
                                                        <Plus className="w-5 h-5" strokeWidth={3} />
                                                    </motion.button>
                                                </div>

                                                {/* Info Below - No Overlay */}
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
                            ))}
                            {filteredCategories.length === 0 && searchQuery && (
                                <div className="text-center py-20">
                                    <div className="text-4xl mb-2">🔍</div>
                                    <p className="text-white/50">Không tìm thấy món nào cho "{searchQuery}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* FLOATING MENU BUTTON - (Mobile & Tablet, Hidden on Desktop) */}
                <motion.button
                    className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-40 py-4 px-2 rounded-r-xl bg-stone-900/80 backdrop-blur-xl border-y border-r border-amber-500/30 shadow-xl shadow-amber-500/10 flex items-center justify-center hover:bg-stone-800 hover:border-amber-400/50 transition-all group"
                    onClick={() => setShowCategoryMenu(true)}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <Menu className="w-5 h-5 text-amber-400" />
                </motion.button>

                {/* MOBILE CATEGORY DRAWER */}
                <AnimatePresence>
                    {showCategoryMenu && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowCategoryMenu(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                            />
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                                className="fixed left-0 top-0 bottom-0 w-72 bg-stone-900 border-r border-white/10 z-50 flex flex-col p-4 shadow-2xl lg:hidden"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-white pl-2">Thực đơn</h2>
                                    <button onClick={() => setShowCategoryMenu(false)} className="p-2 rounded-full hover:bg-white/10 text-white">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto no-scrollbar">
                                    <div className="flex flex-col gap-1">
                                        {/* Featured */}
                                        {featured.length > 0 && !searchQuery && (
                                            <button
                                                onClick={() => {
                                                    scrollToCategory('featured');
                                                    setShowCategoryMenu(false);
                                                }}
                                                className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeCategory === 'featured' ? 'text-amber-50 bg-amber-500/10' : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'}`}
                                            >
                                                <span className="text-xl">✨</span>
                                                <span className={`font-medium ${activeCategory === 'featured' ? 'font-semibold' : ''}`}>{t.featured}</span>
                                                {activeCategory === 'featured' && (
                                                    <div className="absolute bottom-1 left-4 right-4 h-[2px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent rounded-full" />
                                                )}
                                            </button>
                                        )}

                                        {/* Categories */}
                                        {categories.map(cat => {
                                            const isActive = activeCategory === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => {
                                                        scrollToCategory(cat.id);
                                                        setShowCategoryMenu(false);
                                                    }}
                                                    className={`relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'text-amber-50 bg-amber-500/10' : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'}`}
                                                >
                                                    <span className="text-xl">{cat.icon || '🍜'}</span>
                                                    <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{cat.name}</span>
                                                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-amber-500/25 text-amber-400' : 'bg-white/10 text-white/50'}`}>
                                                        {cat.products.length}
                                                    </span>
                                                    {isActive && (
                                                        <div className="absolute bottom-1 left-4 right-4 h-[2px] bg-gradient-to-r from-amber-500 via-amber-400 to-transparent rounded-full" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Success Celebration - Auto dismiss after 5s */}
            <SuccessCelebration
                isOpen={showSuccessCelebration}
                onClose={() => setShowSuccessCelebration(false)}
                title={language === 'vi' ? 'Đặt hàng thành công!' : language === 'jp' ? '注文成功！' : language === 'en' ? 'Order Successful!' : '订单成功！'}
                message={language === 'vi' ? 'Cảm ơn quý khách!' : language === 'jp' ? 'ありがとうございます！' : language === 'en' ? 'Thank you!' : '感谢您！'}
                subMessage={language === 'vi' ? 'Món ăn sẽ được phục vụ trong 10-15 phút' : language === 'jp' ? '10〜15分でお届けします' : language === 'en' ? 'Served in 10-15 mins' : '10-15分钟内送达'}
                brandName={branding.name}
                autoDismissMs={5000}
            />

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
                                <h2 className="text-2xl font-bold text-white mb-2">{getTranslatedField(selectedProduct, 'name', language)}</h2>
                                <p className="text-3xl font-bold text-amber-400 mb-4">¥{selectedProduct.price.toLocaleString()}</p>

                                {selectedProduct.description && (
                                    <p className="text-white/60 mb-6 leading-relaxed">{getTranslatedField(selectedProduct, 'description', language)}</p>
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
                                    onClick={(e) => {
                                        const modifierTotal = quickNotes[selectedProduct.id]?.filter(n => productNotes.includes(n.label)).reduce((sum, n) => sum + n.price_modifier, 0) || 0;
                                        addToCart(selectedProduct, productQuantity, productNotes, modifierTotal, e);
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl font-bold text-lg text-black flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30"
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {t.addToCart} • ¥{(() => {
                                        const basePrice = selectedProduct.price * productQuantity;
                                        const modifierTotal = quickNotes[selectedProduct.id]?.filter(n => productNotes.includes(n.label)).reduce((sum, n) => sum + n.price_modifier, 0) || 0;
                                        return ((basePrice + modifierTotal * productQuantity)).toLocaleString();
                                    })()}
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Language Switcher Modal */}
            <AnimatePresence>
                {showLanguageModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLanguageModal(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-stone-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setShowLanguageModal(false)}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <h3 className="text-xl font-bold text-white mb-6 text-center">Language / 言語 / 语言</h3>

                                <div className="grid grid-cols-1 gap-3">
                                    {displayLanguages.map((lang) => {
                                        const label = LANG_LABELS[lang] || { flag: '🌐', name: lang };
                                        const isActive = language === lang;
                                        return (
                                            <button
                                                key={lang}
                                                onClick={() => {
                                                    setLanguage(lang);
                                                    setShowLanguageModal(false);
                                                }}
                                                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isActive
                                                    ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20'
                                                    : 'bg-white/5 text-white hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="text-3xl">{label.flag}</span>
                                                <span className="text-lg">{label.name}</span>
                                                {isActive && <span className="ml-auto">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
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
                            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
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
                                                    <h4 className="text-white font-medium line-clamp-1">{getTranslatedField(item.product, 'name', language)}</h4>
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
                                        onClick={handleOrder}
                                        disabled={isSubmitting}
                                        className={`w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl font-bold text-lg text-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>{language === 'vi' ? 'Đang gửi...' : t.loading}</span>
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
                                            } catch (error) { /* ignore */ }
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

            {/* History Modal */}
            <AnimatePresence>
                {showHistory && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHistory(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-stone-900 rounded-3xl z-50 p-6 border border-white/10 shadow-2xl max-h-[80vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                    {language === 'vi' ? 'Đã gọi' : language === 'jp' ? '注文履歴' : '已点餐'}
                                </h2>
                                <button onClick={() => setShowHistory(false)} className="p-2 rounded-full hover:bg-white/10 text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                                {!currentOrder || currentOrder.tickets.length === 0 ? (
                                    <div className="text-center py-10 text-white/40">
                                        {t.emptyCart}
                                    </div>
                                ) : (
                                    currentOrder.tickets.map(ticket => (
                                        <div key={ticket.ticket_id} className="border-b border-white/10 pb-4 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs text-white/40">
                                                    #{ticket.ticket_number} - {new Date(ticket.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${ticket.status === 'served' ? 'bg-green-500/20 text-green-400' :
                                                    ticket.status === 'cooking' ? 'bg-amber-500/20 text-amber-400' :
                                                        'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                    {ticket.status === 'served' ? (language === 'vi' ? 'Đã phục vụ' : 'Served') :
                                                        ticket.status === 'cooking' ? (language === 'vi' ? 'Đang chế biến' : 'Cooking') :
                                                            (language === 'vi' ? 'Đang chờ' : 'Pending')}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {ticket.items.map(item => (
                                                    <div key={item.id} className="flex justify-between items-start">
                                                        <div>
                                                            <div className="text-white font-medium">
                                                                <span className="text-amber-400 font-bold mr-2">{item.quantity}x</span>
                                                                {item.product_name}
                                                            </div>
                                                            {item.note && (
                                                                <div className="text-xs text-white/50 mt-0.5">{item.note}</div>
                                                            )}
                                                        </div>
                                                        <div className="text-white/80">
                                                            ¥{(item.unit_price * item.quantity).toLocaleString()}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {currentOrder && currentOrder.tickets.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-white/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-white/60">{language === 'vi' ? 'Tạm tính' : 'Total'}</span>
                                        <span className="text-2xl font-bold text-amber-400">¥{historyTotal.toLocaleString()}</span>
                                    </div>
                                    {/* Payment Button Suggestion */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={async () => {
                                            try {
                                                await fetch(`${API_BASE}/api/customer/call-service`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ table_id: tableId, type: 'bill' })
                                                });
                                                alert(language === 'vi' ? 'Đã gọi thanh toán!' : 'Payment requested!');
                                                setShowHistory(false);
                                            } catch (error) { /* ignore */ }
                                        }}
                                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition-colors"
                                    >
                                        {t.payment}
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Floating Cart Button - Bottom Right - Premium Glass Style */}
            <motion.button
                layoutId="cart-button"
                className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-stone-900/90 backdrop-blur-xl flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20 border-2 border-amber-500/50 z-50 overflow-visible"
                onClick={() => setShowCart(true)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{
                    boxShadow: ["0 0 0px rgba(245, 158, 11, 0.2)", "0 0 20px rgba(245, 158, 11, 0.4)", "0 0 0px rgba(245, 158, 11, 0.2)"]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                }}
            >
                {/* Steam Animation */}
                <motion.span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs opacity-60"
                    animate={{ y: [-2, -8, -2], opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    ♨️
                </motion.span>
                <motion.span
                    className="absolute -top-1 left-1/3 text-[10px] opacity-40"
                    animate={{ y: [0, -6, 0], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                >
                    ♨️
                </motion.span>
                <motion.span
                    className="absolute -top-1 right-1/3 text-[10px] opacity-40"
                    animate={{ y: [0, -5, 0], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                >
                    ♨️
                </motion.span>
                {/* Bowl Emoji - Larger */}
                <span className="text-3xl">🍜</span>
                {cartCount > 0 && (
                    <motion.div
                        key={cartCount}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full text-white text-xs flex items-center justify-center font-bold border-2 border-stone-900 shadow-sm"
                    >
                        {cartCount}
                    </motion.div>
                )}
            </motion.button>

            {/* FLYING ANIMATION */}
            <AnimatePresence>
                {flyingItems.map(item => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 1, x: item.x, y: item.y, scale: 1, rotate: 0 }}
                        animate={{
                            opacity: 0,
                            x: window.innerWidth - 48, // Bottom-right cart position
                            y: window.innerHeight - 48,
                            scale: 0.2,
                            rotate: 360
                        }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="fixed z-[60] pointer-events-none w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 shadow-xl"
                    >
                        {item.image ? (
                            <img src={getImageUrl(item.image)!} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full bg-amber-500 flex items-center justify-center">🍜</div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

        </div >
    );
}
