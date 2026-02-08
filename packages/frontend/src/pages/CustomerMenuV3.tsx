import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Bell, Menu, X, ShoppingCart,
    Sparkles, Plus, Star, Clock, RefreshCw
} from 'lucide-react';
// import { useDialog } from '../components/ui/DialogProvider';
import SuccessCelebration from '../components/ui/SuccessCelebration';
import SkeletonMenu from '../components/skeletons/SkeletonMenu';
import GuestLanding from '../components/menu/GuestLanding';
import Screensaver from '../components/menu/kiosk/Screensaver';
import { api, type Language as ApiLanguage } from '../services/api';
import { getTranslatedField } from '../utils/languageUtils';

// Sub-components
import ProductDetailModal from '../components/menu/ProductDetailModal';
import CartDrawer from '../components/menu/CartDrawer';
import CategorySection from '../components/menu/CategorySection';
import type {
    Category, Product, CartItem, QuickNote, CurrentOrder,
    TableSession, SlideshowImage, Language
} from '../components/menu/types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type AppState = 'idle' | 'language' | 'menu';

const IDLE_TIMEOUT = 120000;

const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
};

// Default labels for hardcoded languages
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
        request_bill: 'Yêu cầu thanh toán',
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
        request_bill: 'お会計',
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
        request_bill: '结账',
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
        request_bill: 'Request Bill',
    }
};

const GRADIENTS = {
    primary: 'bg-gradient-to-br from-amber-900 via-stone-900 to-neutral-900',
    card: 'bg-gradient-to-br from-stone-800/80 to-stone-900/90',
};

export default function CustomerMenuV3() {
    const { tableId } = useParams<{ tableId: string }>();
    const [searchParams] = useSearchParams();
    const isKioskMode = searchParams.get('mode') === 'kiosk';

    // const _dialog = useDialog();

    const [appState, setAppState] = useState<AppState>('idle');
    const [language] = useState<Language>('vi');
    const [_availableLanguages, setAvailableLanguages] = useState<ApiLanguage[]>([]);

    const [categories, setCategories] = useState<Category[]>([]);
    const [featured, setFeatured] = useState<Product[]>([]);
    const [slideshow, setSlideshow] = useState<SlideshowImage[]>([]);
    const [_quickNotes, setQuickNotes] = useState<Record<string, QuickNote[]>>({});
    const [_table, setTable] = useState<{ id: string; number: number; name: string } | null>(null);
    const [branding] = useState({ name: 'GIA VỊ', slogan: 'Hương vị Việt', icon: '🍜' });

    const [loading, setLoading] = useState(true);
    const [_isSubmitting, setIsSubmitting] = useState(false);
    const [_tableSession, setTableSession] = useState<TableSession | null>(null);
    const [_currentOrder, setCurrentOrder] = useState<CurrentOrder | null>(null);
    const [_showHistory, setShowHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [_showQuickActions, setShowQuickActions] = useState(false);
    const [showCategoryMenu, setShowCategoryMenu] = useState(false);
    const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
    const [isPulling, setIsPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [isOrderSuccess, setIsOrderSuccess] = useState(false);
    const [_showLanguageModal, setShowLanguageModal] = useState(false);
    const [isGuestMode, setIsGuestMode] = useState(false);

    const contentRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<number>(0);

    const t = UI_TEXTS[language] || UI_TEXTS['en'];

    // Fetch data
    const fetchMenu = useCallback(async (lang: string) => {
        if (!tableId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.request<{
                categories: Category[],
                featured: Product[],
                slideshow: SlideshowImage[],
                quickNotes: Record<string, QuickNote[]>,
                table: { id: string; number: number; name: string },
                active_session: TableSession | null,
                current_order: CurrentOrder | null
            }>(`/api/customer/menu-v3/${tableId}?lang=${lang}`);

            if (res.data) {
                setCategories(res.data.categories || []);
                setFeatured(res.data.featured || []);
                setSlideshow(res.data.slideshow || []);
                setQuickNotes(res.data.quickNotes || {});
                setTable(res.data.table);
                setTableSession(res.data.active_session);
                setCurrentOrder(res.data.current_order);
                // @ts-ignore
                setIsGuestMode(!!res.data.guest_mode);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    }, [tableId]);

    // Initial load
    useEffect(() => {
        fetchMenu(language);
        api.getLanguages().then(res => {
            if (res.data?.languages) {
                const active = res.data.languages.filter(l => l.is_active);
                setAvailableLanguages(active);
            }
        });
    }, [fetchMenu, language]);

    // Idle Timer
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const resetTimer = () => {
            clearTimeout(timer);
            if (appState !== 'idle') {
                timer = setTimeout(() => setAppState('idle'), IDLE_TIMEOUT);
            }
        };
        window.addEventListener('click', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        return () => {
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('touchstart', resetTimer);
            clearTimeout(timer);
        };
    }, [appState]);

    // Cart Logic
    const addToCart = (product: Product, quantity = 1, notes: string[] = [], priceModifier = 0, event?: React.MouseEvent) => {
        // Animation effect
        if (event) {
            const x = event.clientX;
            const y = event.clientY;
            createConfetti(x, y);
        }

        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) {
                return prev.map(i => i.product.id === product.id
                    ? { ...i, quantity: i.quantity + quantity }
                    : i
                );
            }
            return [...prev, { product, quantity, notes, notesPriceModifier: priceModifier }];
        });

        // Haptic
        if (navigator.vibrate) navigator.vibrate(50);

        // Close modal
        setSelectedProduct(null);
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const createConfetti = (x: number, y: number) => {
        const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
        const newParticles = Array.from({ length: 8 }).map(() => ({
            id: Math.random(),
            x,
            y,
            color: colors[Math.floor(Math.random() * colors.length)]
        }));
        setConfettiParticles(prev => [...prev, ...newParticles]);
        setTimeout(() => {
            setConfettiParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
        }, 1000);
    };

    const scrollToCategory = (id: string) => {
        const el = document.getElementById(id === 'featured' ? 'category-featured' : `category-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveCategory(id);
        }
    };

    // Submit Order
    const handleSubmitOrder = async () => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            // API call placeholder
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            // TODO: Call real API
            setCart([]);
            setShowCart(false);
            setIsOrderSuccess(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Pull to Refresh
    const handleTouchStart = (e: React.TouchEvent) => {
        if (contentRef.current?.scrollTop === 0) {
            touchStartRef.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartRef.current > 0) {
            const pull = e.touches[0].clientY - touchStartRef.current;
            if (pull > 0) {
                setPullDistance(pull);
                setIsPulling(true);
            }
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 80) {
            fetchMenu(language);
        }
        setIsPulling(false);
        setPullDistance(0);
        touchStartRef.current = 0;
    };

    const filteredCategories = categories.map(cat => ({
        ...cat,
        products: cat.products.filter(p =>
            getTranslatedField(p, 'name', language).toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.products.length > 0);

    if (loading) return <SkeletonMenu />;

    // KIOSK MODE: If table is closed, show Screensaver to start new session
    if (isGuestMode && isKioskMode && tableId) {
        return (
            <Screensaver
                branding={branding}
                slideshow={slideshow}
                tableId={tableId}
                onStart={() => fetchMenu(language)}
            />
        );
    }

    // GUEST MODE: If table is closed (and not kiosk), show Guest Landing
    if (isGuestMode && !isKioskMode) {
        return (
            <GuestLanding
                branding={branding}
                onViewMenu={() => setIsGuestMode(false)} // Allow viewing menu in read-only
                onBookTable={() => alert('Vui lòng gọi 0909-xxx-xxx để đặt bàn!')}
            />
        );
    }

    if (error) {
        return (
            <div className={`fixed inset-0 ${GRADIENTS.primary} flex items-center justify-center`}>
                <div className="text-center">
                    <p className="text-xl text-white mb-6">{t.error}</p>
                    <button onClick={() => fetchMenu(language)} className="px-8 py-3 bg-amber-500 text-black font-semibold rounded-full">
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 ${GRADIENTS.primary} flex overflow-hidden`}>
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/20 rounded-full blur-[100px]" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px]" />
            </div>

            {/* Confetti */}
            {confettiParticles.map(p => (
                <div key={p.id} className="confetti-particle" style={{ left: p.x, top: p.y, backgroundColor: p.color, width: 8, height: 8 }} />
            ))}

            {/* Pull Indicator */}
            {pullDistance > 0 && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 py-4" style={{ transform: `translateY(${Math.min(pullDistance, 80)}px)` }}>
                    <RefreshCw className={`w-6 h-6 text-amber-400 ${isPulling ? 'animate-spin' : ''}`} />
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-col h-full relative z-10 w-full">
                {/* Header */}
                <div className="shrink-0 px-4 py-4 z-40">
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl border-2 border-amber-500/40 bg-stone-900/80 backdrop-blur-xl shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                            <span className="text-xl">{branding.icon}</span>
                        </div>

                        <div className="flex-1 relative mx-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder={t.search}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 bg-white/10 rounded-xl border border-white/10 text-white outline-none text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowQuickActions(true)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-rose-400">
                                <Bell className="w-5 h-5" />
                            </button>
                            <button onClick={() => setShowHistory(true)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
                                <Clock className="w-5 h-5" />
                            </button>
                            <button onClick={() => setShowLanguageModal(true)} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                                {(LANG_LABELS[language] || { flag: '🌐' }).flag}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Desktop Sidebar (Hidden on mobile) */}
                    <div className="hidden lg:flex flex-col w-64 bg-stone-900/40 border-r border-white/5 py-4">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg ${activeCategory === cat.id ? 'text-amber-50 bg-white/5' : 'text-stone-400 hover:text-stone-200'}`}
                            >
                                <span className="text-xl">{cat.icon || '🍜'}</span>
                                <span className="text-sm font-medium">{cat.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Scrollable Content */}
                    <div
                        ref={contentRef}
                        className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Featured */}
                        {featured.length > 0 && !searchQuery && (
                            <div id="category-featured" className="mb-8 mt-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-amber-400" />
                                    <h2 className="text-lg font-bold text-amber-100">{t.featured}</h2>
                                </div>
                                <div className="flex gap-4 overflow-x-auto snap-x no-scrollbar -mx-4 px-4 pb-4">
                                    {featured.map(product => (
                                        <div
                                            key={product.id}
                                            className="flex-shrink-0 w-[85%] md:w-[45%] snap-center relative rounded-3xl overflow-hidden bg-stone-800 border border-white/10 shadow-xl"
                                            onClick={() => setSelectedProduct(product)}
                                        >
                                            <div className="aspect-[4/3] relative">
                                                <img
                                                    src={getImageUrl(product.image_url) || ''}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                                <div className="absolute top-4 left-4 px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full flex gap-1 items-center">
                                                    <Star size={12} fill="black" /> HOT
                                                </div>
                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <h3 className="text-white font-bold text-lg">{getTranslatedField(product, 'name', language)}</h3>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <span className="text-amber-400 font-bold">¥{product.price.toLocaleString()}</span>
                                                        <button
                                                            onClick={(e) => addToCart(product, 1, [], 0, e)}
                                                            className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-black"
                                                        >
                                                            <Plus size={16} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Categories */}
                        <div className="space-y-8">
                            {filteredCategories.map(cat => (
                                <CategorySection
                                    key={cat.id}
                                    category={cat}
                                    language={language}
                                    getImageUrl={getImageUrl}
                                    onAddToCart={addToCart}
                                    onProductClick={setSelectedProduct}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Floating Menu Button (Mobile) */}
                <button
                    onClick={() => setShowCategoryMenu(true)}
                    className="lg:hidden fixed left-0 top-1/2 z-40 py-3 px-2 bg-stone-900/80 rounded-r-xl border border-amber-500/30 text-amber-400"
                >
                    <Menu size={20} />
                </button>

                {/* Mobile Sidebar Drawer */}
                <AnimatePresence>
                    {showCategoryMenu && (
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            className="fixed inset-y-0 left-0 w-64 bg-stone-900 z-50 p-4 border-r border-white/10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">Thực đơn</h2>
                                <button onClick={() => setShowCategoryMenu(false)} className="text-white"><X size={24} /></button>
                            </div>
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            scrollToCategory(cat.id);
                                            setShowCategoryMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-stone-400 hover:bg-white/5"
                                    >
                                        <span className="text-xl">{cat.icon || '🍜'}</span>
                                        <span className="font-medium">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Cart Button */}
                <AnimatePresence>
                    {cart.length > 0 && (
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            onClick={() => setShowCart(true)}
                            className="fixed bottom-6 right-6 w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg z-40 text-black"
                        >
                            <ShoppingCart size={28} />
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-stone-900">
                                {cart.reduce((sum, i) => sum + i.quantity, 0)}
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* Modals */}
            <ProductDetailModal
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onAddToCart={addToCart}
                getImageUrl={getImageUrl}
                language={language}
            />

            <CartDrawer
                isOpen={showCart}
                onClose={() => setShowCart(false)}
                cart={cart}
                onUpdateQuantity={updateCartQuantity}
                onRequestBill={handleSubmitOrder}
                getImageUrl={getImageUrl}
                language={language}
                t={t}
            />

            <SuccessCelebration
                isOpen={isOrderSuccess}
                onClose={() => setIsOrderSuccess(false)}
                title="Đã gửi đơn hàng!"
                message="Cảm ơn quý khách!"
                subMessage="Món ăn sẽ được phục vụ trong giây lát."
            />
        </div>
    );
}
