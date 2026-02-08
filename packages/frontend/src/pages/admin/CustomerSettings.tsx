import React, { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon, Loader2, Plus, Trash2, Star, ImagePlus, StickyNote, Smartphone, Eye, EyeOff, ChevronDown, ChevronRight, Edit2, Tag } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ServiceButton {
    id: string;
    label: string;
    icon: string;
    type: string;
}

interface CustomerSettingsState {
    customer_banner_url: string;
    customer_logo_url: string;
    customer_primary_color: string;
    customer_welcome_heading: string;
    customer_welcome_message: string;
    customer_service_buttons: ServiceButton[];
}

interface SlideshowImage {
    id: string;
    image_url: string;
    title: string;
    sort_order: number;
}

interface Product {
    id: string;
    name: string;
    price: number;
    image_url: string;
    is_featured: boolean;
    featured_badge: string | null;
    featured_order: number | null;
    category_name: string;
}

interface QuickNote {
    id: string;
    product_id: string;
    label: string;
    price_modifier: number;
    sort_order: number;
}

interface TabletProduct {
    id: string;
    name: string;
    image_url: string;
    is_tablet_visible: boolean;
}

interface TabletCategory {
    id: string;
    name: string;
    is_tablet_visible: boolean;
    products: TabletProduct[];
}

interface Badge {
    id: string;
    name_vi: string;
    name_en?: string;
    color: string;
    icon?: string;
    sort_order: number;
}

const DEFAULT_SERVICE_BUTTONS: ServiceButton[] = [
    { id: 'water', label: 'Thêm đá/nước', icon: '🧊', type: 'water' },
    { id: 'grill', label: 'Thay vỉ nướng', icon: '🔥', type: 'grill_change' },
    { id: 'utensils', label: 'Lấy chén bát', icon: '🥢', type: 'utensils' },
    { id: 'bill', label: 'Thanh toán', icon: '🧾', type: 'bill' },
];

const DEFAULT_SETTINGS: CustomerSettingsState = {
    customer_banner_url: '',
    customer_logo_url: '',
    customer_primary_color: '#EF4444',
    customer_welcome_heading: 'Chào mừng quý khách',
    customer_welcome_message: 'Vui lòng quét mã QR trên bàn để gọi món',
    customer_service_buttons: DEFAULT_SERVICE_BUTTONS,
};

type TabType = 'general' | 'v3-slideshow' | 'v3-featured' | 'v3-notes' | 'v3-menu';

const CustomerSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [settings, setSettings] = useState<CustomerSettingsState>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    // V3 States
    const [slideshowImages, setSlideshowImages] = useState<SlideshowImage[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
    const [tabletMenu, setTabletMenu] = useState<TabletCategory[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [selectedProductForNotes, setSelectedProductForNotes] = useState<string | null>(null);
    const [loadingV3, setLoadingV3] = useState(false);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [showBadgeManager, setShowBadgeManager] = useState(false);
    const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
    const [newBadge, setNewBadge] = useState({ name_vi: '', color: '#EF4444', icon: '' });
    const [deletingBadgeId, setDeletingBadgeId] = useState<string | null>(null);

    // New button form
    const [newButton, setNewButton] = useState<ServiceButton>({ id: '', label: '', icon: '', type: 'service' });
    // New note form
    const [newNote, setNewNote] = useState({ label: '', price_modifier: 0 });

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'v3-slideshow' && slideshowImages.length === 0) {
            loadSlideshow();
        }
        if (activeTab === 'v3-featured' && products.length === 0) {
            loadProducts();
            loadBadges();
        }
        if (activeTab === 'v3-notes' && products.length === 0) {
            loadProducts();
        }
        if (activeTab === 'v3-menu' && tabletMenu.length === 0) {
            loadTabletMenu();
        }
    }, [activeTab]);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const res = await api.getSettings();
            if (res.data) {
                setSettings(prev => ({
                    ...prev,
                    ...res.data,
                    customer_service_buttons: res.data?.customer_service_buttons || DEFAULT_SERVICE_BUTTONS
                }));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            toast.error('Không thể tải cài đặt');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSlideshow = async () => {
        setLoadingV3(true);
        try {
            const res = await api.getSlideshow();
            setSlideshowImages(res.data?.images || []);
        } catch (error) {
            console.error('Error loading slideshow:', error);
        } finally {
            setLoadingV3(false);
        }
    };

    const loadProducts = async () => {
        setLoadingV3(true);
        try {
            const res = await api.getFeaturedProducts();
            setProducts(res.data?.products || []);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoadingV3(false);
        }
    };

    const loadBadges = async () => {
        try {
            const res = await api.getBadges();
            setBadges(res.data?.badges || []);
        } catch (error) {
            console.error('Error loading badges:', error);
        }
    };

    const loadQuickNotes = async (productId: string) => {
        try {
            const res = await api.getQuickNotes(productId);
            setQuickNotes(res.data?.notes || []);
        } catch (error) {
            console.error('Error loading quick notes:', error);
        }
    };

    const loadTabletMenu = async () => {
        setLoadingV3(true);
        try {
            const res = await api.getTabletMenu();
            setTabletMenu(res.data?.categories || []);
        } catch (error) {
            console.error('Error loading tablet menu:', error);
        } finally {
            setLoadingV3(false);
        }
    };

    const handleToggleMenuVisibility = async (type: 'category' | 'product', id: string, currentStatus: boolean, parentId?: string) => {
        try {
            await api.toggleTabletMenuVisibility(type, id, !currentStatus);

            // Optimistic update
            if (type === 'category') {
                setTabletMenu(prev => prev.map(c =>
                    c.id === id ? { ...c, is_tablet_visible: !currentStatus } : c
                ));
            } else if (type === 'product' && parentId) {
                setTabletMenu(prev => prev.map(c => {
                    if (c.id === parentId) {
                        return {
                            ...c,
                            products: c.products.map(p =>
                                p.id === id ? { ...p, is_tablet_visible: !currentStatus } : p
                            )
                        };
                    }
                    return c;
                }));
            }
            toast.success(currentStatus ? 'Đã ẩn khỏi tablet' : 'Đã hiển thị trên tablet');
        } catch (error) {
            console.error('Error toggling visibility:', error);
            toast.error('Lỗi cập nhật');
        }
    };

    const toggleCategoryExpand = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.updateSettings(settings);
            toast.success('Đã lưu cài đặt');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Không thể lưu cài đặt');
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof CustomerSettingsState) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField(field);
        try {
            const res = await api.uploadSettingsImage(file);
            if (res.data && res.data.imageUrl) {
                setSettings(prev => ({
                    ...prev,
                    [field]: res.data!.imageUrl,
                }));
                toast.success('Đã tải lên hình ảnh');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Lỗi tải lên hình ảnh');
        } finally {
            setUploadingField(null);
            e.target.value = '';
        }
    };

    const handleSlideshowUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingField('slideshow');
        try {
            const res = await api.uploadSettingsImage(file);
            if (res.data && res.data.imageUrl) {
                await api.addSlideshowImage(res.data.imageUrl, '', slideshowImages.length);
                toast.success('Đã thêm ảnh slideshow');
                loadSlideshow();
            }
        } catch (error) {
            console.error('Error uploading slideshow:', error);
            toast.error('Lỗi tải lên');
        } finally {
            setUploadingField(null);
            e.target.value = '';
        }
    };

    const handleDeleteSlideshow = async (id: string) => {
        try {
            await api.deleteSlideshowImage(id);
            setSlideshowImages(prev => prev.filter(s => s.id !== id));
            toast.success('Đã xóa');
        } catch (error) {
            console.error('Error deleting slideshow:', error);
            toast.error('Lỗi xóa ảnh');
        }
    };

    const handleToggleFeatured = async (product: Product) => {
        try {
            await api.setProductFeatured(product.id, !product.is_featured);
            setProducts(prev => prev.map(p =>
                p.id === product.id ? { ...p, is_featured: !p.is_featured } : p
            ));
            toast.success(product.is_featured ? 'Đã bỏ nổi bật' : 'Đã đánh dấu nổi bật');
        } catch (error) {
            console.error('Error toggling featured:', error);
            toast.error('Lỗi cập nhật');
        }
    };

    const handleSetBadge = async (productId: string, badge: string | null) => {
        try {
            await api.setProductBadge(productId, badge);
            setProducts(prev => prev.map(p =>
                p.id === productId ? { ...p, featured_badge: badge } : p
            ));
            toast.success('Đã cập nhật badge');
        } catch (error) {
            console.error('Error setting badge:', error);
            toast.error('Lỗi cập nhật');
        }
    };

    const handleAddBadge = async () => {
        if (!newBadge.name_vi) return;
        try {
            await api.createBadge({
                name_vi: newBadge.name_vi,
                color: newBadge.color,
                icon: newBadge.icon || undefined,
                sort_order: badges.length,
            });
            toast.success('Đã thêm badge mới');
            loadBadges();
            setNewBadge({ name_vi: '', color: '#EF4444', icon: '' });
        } catch (error) {
            console.error('Error adding badge:', error);
            toast.error('Lỗi thêm badge');
        }
    };

    const handleUpdateBadge = async () => {
        if (!editingBadge) return;
        try {
            await api.updateBadge(editingBadge.id, {
                name_vi: editingBadge.name_vi,
                color: editingBadge.color,
                icon: editingBadge.icon || undefined,
            });
            toast.success('Đã cập nhật badge');
            loadBadges();
            setEditingBadge(null);
        } catch (error) {
            console.error('Error updating badge:', error);
            toast.error('Lỗi cập nhật badge');
        }
    };

    const handleDeleteBadge = async (badgeId: string) => {
        setDeletingBadgeId(badgeId);
    };

    const confirmDeleteBadge = async () => {
        if (!deletingBadgeId) return;
        try {
            await api.deleteBadge(deletingBadgeId);
            toast.success('Đã xóa badge');
            loadBadges();
        } catch (error) {
            console.error('Error deleting badge:', error);
            toast.error('Lỗi xóa badge');
        } finally {
            setDeletingBadgeId(null);
        }
    };

    const handleAddQuickNote = async () => {
        if (!selectedProductForNotes || !newNote.label) return;
        try {
            await api.addQuickNote(selectedProductForNotes, newNote.label, newNote.price_modifier, quickNotes.length);
            toast.success('Đã thêm ghi chú nhanh');
            loadQuickNotes(selectedProductForNotes);
            setNewNote({ label: '', price_modifier: 0 });
        } catch (error) {
            console.error('Error adding quick note:', error);
            toast.error('Lỗi thêm ghi chú');
        }
    };

    const handleDeleteQuickNote = async (noteId: string) => {
        try {
            await api.deleteQuickNote(noteId);
            setQuickNotes(prev => prev.filter(n => n.id !== noteId));
            toast.success('Đã xóa');
        } catch (error) {
            console.error('Error deleting quick note:', error);
            toast.error('Lỗi xóa');
        }
    };

    const handleChange = (field: keyof CustomerSettingsState, value: string) => {
        setSettings(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleAddButton = () => {
        if (!newButton.label || !newButton.icon) return;
        setSettings(prev => ({
            ...prev,
            customer_service_buttons: [...prev.customer_service_buttons, { ...newButton, id: Date.now().toString() }]
        }));
        setNewButton({ id: '', label: '', icon: '', type: 'service' });
    };

    const handleDeleteButton = (id: string) => {
        setSettings(prev => ({
            ...prev,
            customer_service_buttons: prev.customer_service_buttons.filter(b => b.id !== id)
        }));
    };

    const getImageUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${API_BASE}${path}`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const TABS = [
        { id: 'general' as TabType, label: '⚙️ Cài đặt chung', icon: null },
        { id: 'v3-slideshow' as TabType, label: '🖼️ Slideshow', icon: ImagePlus },
        { id: 'v3-featured' as TabType, label: '⭐ Món nổi bật', icon: Star },
        { id: 'v3-notes' as TabType, label: '📝 Ghi chú nhanh', icon: StickyNote },
        { id: 'v3-menu' as TabType, label: '📱 Menu Tablet', icon: Smartphone },
    ];

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Cài đặt giao diện khách hàng</h1>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>Lưu thay đổi</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b pb-2 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Branding Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Thương hiệu & Hình ảnh</h2>

                            {/* Banner Upload */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Ảnh bìa (Banner)</label>
                                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors text-center">
                                    {settings.customer_banner_url ? (
                                        <div className="relative w-full h-48 mb-4">
                                            <img
                                                src={getImageUrl(settings.customer_banner_url)}
                                                alt="Banner Preview"
                                                className="w-full h-full object-cover rounded-md"
                                            />
                                            <button
                                                onClick={() => handleChange('customer_banner_url', '')}
                                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            >
                                                X
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="py-8 flex flex-col items-center text-gray-500">
                                            <ImageIcon className="w-12 h-12 mb-2" />
                                            <span className="text-sm">Chưa có ảnh bìa</span>
                                        </div>
                                    )}

                                    <div className="flex justify-center">
                                        <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center shadow-sm">
                                            {uploadingField === 'customer_banner_url' ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Upload className="w-4 h-4 mr-2" />
                                            )}
                                            <span>Tải ảnh lên</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'customer_banner_url')}
                                                disabled={uploadingField === 'customer_banner_url'}
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Đề xuất: 1200x400px (JPG, PNG)</p>
                                </div>
                            </div>

                            {/* Logo Upload */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Logo nhà hàng</label>
                                <div className="flex items-start space-x-4">
                                    <div className="w-24 h-24 border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden relative">
                                        {settings.customer_logo_url ? (
                                            <img
                                                src={getImageUrl(settings.customer_logo_url)}
                                                alt="Logo Preview"
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 inline-flex items-center shadow-sm">
                                            {uploadingField === 'customer_logo_url' ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Upload className="w-4 h-4 mr-2" />
                                            )}
                                            <span>Tải logo lên</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleImageUpload(e, 'customer_logo_url')}
                                                disabled={uploadingField === 'customer_logo_url'}
                                            />
                                        </label>
                                        {settings.customer_logo_url && (
                                            <button
                                                onClick={() => handleChange('customer_logo_url', '')}
                                                className="ml-2 text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Xóa
                                            </button>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2">Hiển thị ở góc trên màn hình gọi món.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Primary Color */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Màu chủ đạo</label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="color"
                                        value={settings.customer_primary_color}
                                        onChange={(e) => handleChange('customer_primary_color', e.target.value)}
                                        className="h-10 w-20 p-1 rounded border border-gray-300 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={settings.customer_primary_color}
                                            onChange={(e) => handleChange('customer_primary_color', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="#EF4444"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">Màu dùng cho các nút bấm chính và điểm nhấn.</p>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
                                <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Nội dung hiển thị</h2>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">Tiêu đề chào mừng</label>
                                        <input
                                            type="text"
                                            value={settings.customer_welcome_heading}
                                            onChange={(e) => handleChange('customer_welcome_heading', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                                            placeholder="Ví dụ: Chào mừng quý khách"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-gray-700">Thông điệp chào mừng</label>
                                        <textarea
                                            value={settings.customer_welcome_message}
                                            onChange={(e) => handleChange('customer_welcome_message', e.target.value)}
                                            rows={4}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                                            placeholder="Ví dụ: Vui lòng quét mã QR..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Service Buttons Configuration */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Nút Gọi Phục Vụ</h2>

                                <div className="space-y-4">
                                    {settings.customer_service_buttons.map((btn, index) => (
                                        <div key={btn.id || index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                                            <div className="w-10 h-10 flex items-center justify-center bg-white rounded border text-xl">
                                                {btn.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{btn.label}</p>
                                                <p className="text-xs text-gray-500">Type: {btn.type}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteButton(btn.id)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add New Button Form */}
                                    <div className="flex gap-2 items-end pt-4 border-t">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500">Tên nút</label>
                                            <input
                                                type="text"
                                                placeholder="Ví dụ: Xin nước"
                                                className="w-full text-sm p-2 border rounded"
                                                value={newButton.label}
                                                onChange={e => setNewButton({ ...newButton, label: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="text-xs text-gray-500">Icon</label>
                                            <input
                                                type="text"
                                                placeholder="🥤"
                                                className="w-full text-sm p-2 border rounded"
                                                value={newButton.icon}
                                                onChange={e => setNewButton({ ...newButton, icon: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs text-gray-500">Loại</label>
                                            <select
                                                className="w-full text-sm p-2 border rounded"
                                                value={newButton.type}
                                                onChange={e => setNewButton({ ...newButton, type: e.target.value })}
                                            >
                                                <option value="service">Service</option>
                                                <option value="bill">Bill</option>
                                                <option value="water">Water</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleAddButton}
                                            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 h-[38px] w-[38px] flex items-center justify-center"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Slideshow Tab */}
                {activeTab === 'v3-slideshow' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Ảnh Slideshow (Màn hình chờ)</h2>
                                <p className="text-sm text-gray-500">Ảnh sẽ hiển thị xen kẽ trên màn hình chờ của tablet</p>
                            </div>
                            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                                {uploadingField === 'slideshow' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ImagePlus className="w-4 h-4" />
                                )}
                                <span>Thêm ảnh</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleSlideshowUpload}
                                    disabled={uploadingField === 'slideshow'}
                                />
                            </label>
                        </div>

                        {loadingV3 ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : slideshowImages.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p>Chưa có ảnh slideshow nào</p>
                                <p className="text-sm">Thêm ảnh để hiển thị trên màn hình chờ</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {slideshowImages.map((img, i) => (
                                    <div key={img.id} className="relative group aspect-video rounded-lg overflow-hidden border">
                                        <img
                                            src={getImageUrl(img.image_url)}
                                            alt={img.title || `Slide ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => handleDeleteSlideshow(img.id)}
                                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                                            #{i + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Featured Products Tab */}
                {activeTab === 'v3-featured' && (
                    <div className="space-y-6">
                        {/* Badge Manager Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                        <Tag className="w-5 h-5 text-purple-600" />
                                        Quản lý Badge
                                    </h2>
                                    <p className="text-sm text-gray-500">Thêm, sửa, xóa các badge hiển thị trên món nổi bật</p>
                                </div>
                                <button
                                    onClick={() => setShowBadgeManager(!showBadgeManager)}
                                    className="text-sm px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100"
                                >
                                    {showBadgeManager ? 'Ẩn' : 'Hiện'} quản lý badge
                                </button>
                            </div>

                            {showBadgeManager && (
                                <div className="border-t pt-4 space-y-4">
                                    {/* Existing Badges */}
                                    <div className="flex flex-wrap gap-2">
                                        {badges.map(badge => (
                                            <div
                                                key={badge.id}
                                                className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                                                style={{ backgroundColor: badge.color + '20', borderColor: badge.color }}
                                            >
                                                {badge.icon && <span>{badge.icon}</span>}
                                                <span className="text-sm font-medium">{badge.name_vi}</span>
                                                <button
                                                    onClick={() => setEditingBadge(badge)}
                                                    className="p-1 hover:bg-white/50 rounded"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBadge(badge.id)}
                                                    className="p-1 hover:bg-red-100 rounded text-red-500"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {badges.length === 0 && (
                                            <p className="text-gray-500 text-sm">Chưa có badge nào. Thêm badge mới bên dưới.</p>
                                        )}
                                    </div>

                                    {/* Add/Edit Badge Form */}
                                    <div className="flex flex-wrap gap-2 items-end pt-4 border-t">
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="text-xs text-gray-500">Tên badge</label>
                                            <input
                                                type="text"
                                                placeholder="Ví dụ: Bán chạy"
                                                className="w-full text-sm p-2 border rounded"
                                                value={editingBadge ? editingBadge.name_vi : newBadge.name_vi}
                                                onChange={e => editingBadge
                                                    ? setEditingBadge({ ...editingBadge, name_vi: e.target.value })
                                                    : setNewBadge({ ...newBadge, name_vi: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="text-xs text-gray-500">Icon</label>
                                            <input
                                                type="text"
                                                placeholder="🔥"
                                                className="w-full text-sm p-2 border rounded text-center"
                                                value={editingBadge ? (editingBadge.icon || '') : newBadge.icon}
                                                onChange={e => editingBadge
                                                    ? setEditingBadge({ ...editingBadge, icon: e.target.value })
                                                    : setNewBadge({ ...newBadge, icon: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="w-16">
                                            <label className="text-xs text-gray-500">Màu</label>
                                            <input
                                                type="color"
                                                className="w-full h-[38px] p-1 border rounded cursor-pointer"
                                                value={editingBadge ? editingBadge.color : newBadge.color}
                                                onChange={e => editingBadge
                                                    ? setEditingBadge({ ...editingBadge, color: e.target.value })
                                                    : setNewBadge({ ...newBadge, color: e.target.value })
                                                }
                                            />
                                        </div>
                                        {editingBadge ? (
                                            <>
                                                <button
                                                    onClick={handleUpdateBadge}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                                                >
                                                    Cập nhật
                                                </button>
                                                <button
                                                    onClick={() => setEditingBadge(null)}
                                                    className="text-gray-600 px-4 py-2 rounded hover:bg-gray-100 text-sm"
                                                >
                                                    Hủy
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleAddBadge}
                                                className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 flex items-center gap-1"
                                            >
                                                <Plus size={18} />
                                                <span className="text-sm">Thêm</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Featured Products */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-800">Món ăn nổi bật</h2>
                                <p className="text-sm text-gray-500">Chọn các món để hiển thị ở mục "Món đặc biệt" trên menu khách</p>
                            </div>

                            {loadingV3 ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map(product => (
                                        <div
                                            key={product.id}
                                            className={`relative p-4 rounded-lg border-2 transition-all ${product.is_featured
                                                ? 'border-amber-400 bg-amber-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                                    {product.image_url ? (
                                                        <img
                                                            src={getImageUrl(product.image_url)}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl">🍜</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                                                    <p className="text-xs text-gray-500">{product.category_name}</p>
                                                    <p className="text-sm font-bold text-amber-600 mt-1">¥{product.price.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between">
                                                <button
                                                    onClick={() => handleToggleFeatured(product)}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${product.is_featured
                                                        ? 'bg-amber-500 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    <Star className="w-3 h-3" />
                                                    {product.is_featured ? 'Đang nổi bật' : 'Đánh dấu nổi bật'}
                                                </button>

                                                {product.is_featured && (
                                                    <select
                                                        value={product.featured_badge || ''}
                                                        onChange={e => handleSetBadge(product.id, e.target.value || null)}
                                                        className="text-xs p-1.5 border rounded"
                                                    >
                                                        <option value="">Không có badge</option>
                                                        {badges.map(badge => (
                                                            <option key={badge.id} value={badge.name_vi}>
                                                                {badge.icon} {badge.name_vi}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Quick Notes Tab */}
                {activeTab === 'v3-notes' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Product List */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Chọn món để quản lý ghi chú</h2>

                            {loadingV3 ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {products.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => {
                                                setSelectedProductForNotes(product.id);
                                                loadQuickNotes(product.id);
                                            }}
                                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${selectedProductForNotes === product.id
                                                ? 'bg-blue-50 border-2 border-blue-500'
                                                : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                                }`}
                                        >
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                                                {product.image_url ? (
                                                    <img src={getImageUrl(product.image_url)} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xl">🍜</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-gray-900 line-clamp-1">{product.name}</p>
                                                <p className="text-xs text-gray-500">{product.category_name}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Notes Editor */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">Ghi chú nhanh</h2>

                            {!selectedProductForNotes ? (
                                <div className="text-center py-12 text-gray-500">
                                    <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p>Chọn một món từ danh sách bên trái</p>
                                    <p className="text-sm">để quản lý ghi chú nhanh</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Existing Notes */}
                                    <div className="space-y-2">
                                        {quickNotes.map(note => (
                                            <div key={note.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{note.label}</p>
                                                    {note.price_modifier !== 0 && (
                                                        <p className={`text-xs ${note.price_modifier > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {note.price_modifier > 0 ? '+' : ''}¥{note.price_modifier}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteQuickNote(note.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        {quickNotes.length === 0 && (
                                            <p className="text-sm text-gray-500 text-center py-4">
                                                Chưa có ghi chú nhanh nào
                                            </p>
                                        )}
                                    </div>

                                    {/* Add New Note */}
                                    <div className="border-t pt-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">Thêm ghi chú mới</h3>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Ví dụ: Không cay, Thêm phô mai..."
                                                className="flex-1 p-2 border rounded-lg text-sm"
                                                value={newNote.label}
                                                onChange={e => setNewNote({ ...newNote, label: e.target.value })}
                                            />
                                            <input
                                                type="number"
                                                placeholder="Phụ phí"
                                                className="w-24 p-2 border rounded-lg text-sm"
                                                value={newNote.price_modifier || ''}
                                                onChange={e => setNewNote({ ...newNote, price_modifier: parseInt(e.target.value) || 0 })}
                                            />
                                            <button
                                                onClick={handleAddQuickNote}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Phụ phí: Số dương = tăng giá, số âm = giảm giá, 0 = không đổi
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tablet Menu Tab */}
                {activeTab === 'v3-menu' && (
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-800">Cấu hình Menu Tablet</h2>
                            <p className="text-sm text-gray-500">Ẩn/hiện các nhóm món và món ăn trên tablet khách hàng</p>
                        </div>

                        {loadingV3 ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tabletMenu.map(category => (
                                    <div key={category.id} className="border rounded-lg overflow-hidden">
                                        {/* Category Header */}
                                        <div className="flex items-center justify-between p-4 bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleCategoryExpand(category.id)}
                                                    className="p-1 hover:bg-gray-200 rounded"
                                                >
                                                    {expandedCategories.has(category.id) ? (
                                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                                    )}
                                                </button>
                                                <span className="font-medium text-gray-900">{category.name}</span>
                                                <span className="text-xs text-gray-500">({category.products.length} món)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${category.is_tablet_visible ? 'text-green-600' : 'text-gray-400'}`}>
                                                    {category.is_tablet_visible ? 'Đang hiện' : 'Đang ẩn'}
                                                </span>
                                                <button
                                                    onClick={() => handleToggleMenuVisibility('category', category.id, category.is_tablet_visible)}
                                                    className={`p-2 rounded-full transition-colors ${category.is_tablet_visible
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                        }`}
                                                >
                                                    {category.is_tablet_visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Products List (Expanded) */}
                                        {expandedCategories.has(category.id) && (
                                            <div className="bg-white border-t p-4 space-y-2">
                                                {category.products.map(product => (
                                                    <div key={product.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden">
                                                                {product.image_url ? (
                                                                    <img src={getImageUrl(product.image_url)} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="flex items-center justify-center w-full h-full text-base">🍜</div>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-gray-700">{product.name}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleToggleMenuVisibility('product', product.id, product.is_tablet_visible, category.id)}
                                                            className={`p-1.5 rounded transition-colors ${product.is_tablet_visible
                                                                ? 'text-blue-600 hover:bg-blue-50'
                                                                : 'text-gray-400 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {product.is_tablet_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Delete Badge Confirmation Modal */}
            {deletingBadgeId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Xác nhận xóa</h3>
                        <p className="text-gray-600 mb-4">Bạn có chắc chắn muốn xóa badge này?</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeletingBadgeId(null)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmDeleteBadge}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CustomerSettings;
