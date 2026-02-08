import { useState, useEffect } from 'react';
import { X, Smartphone, Monitor, SquareTerminal, Save, Copy } from 'lucide-react';
import { api, type Category, type Product } from '../../services/api';
import { useToast } from '../../components/Toast';

interface MenuVisibilityConfigProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

type VisibilityField = 'menu' | 'pos' | 'kiosk';

export default function MenuVisibilityConfig({ isOpen, onClose, onSave }: MenuVisibilityConfigProps) {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Local state for tracking changes
    const [visibilityState, setVisibilityState] = useState<{
        categories: Record<string, { menu: boolean; pos: boolean; kiosk: boolean }>;
        products: Record<string, { menu: boolean; pos: boolean; kiosk: boolean }>;
    }>({ categories: {}, products: {} });

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [catRes, prodRes] = await Promise.all([
                api.getCategories(),
                api.getProducts()
            ]);

            if (catRes.success && catRes.data && prodRes.success && prodRes.data) {
                setCategories(catRes.data.categories);
                setProducts(prodRes.data.products);

                // Initialize visibility state
                const initialCategories: Record<string, { menu: boolean; pos: boolean; kiosk: boolean }> = {};
                catRes.data.categories.forEach(c => {
                    initialCategories[c.id] = {
                        menu: c.display_in_menu !== false,
                        pos: c.display_in_pos !== false,
                        kiosk: c.display_in_kiosk !== false
                    };
                });

                const initialProducts: Record<string, { menu: boolean; pos: boolean; kiosk: boolean }> = {};
                prodRes.data.products.forEach(p => {
                    initialProducts[p.id] = {
                        menu: p.display_in_menu !== false,
                        pos: p.display_in_pos !== false,
                        kiosk: p.display_in_kiosk !== false
                    };
                });

                setVisibilityState({
                    categories: initialCategories,
                    products: initialProducts
                });
            }
        } catch (err) {
            console.error('Failed to load menu data:', err);
            error('Không thể tải dữ liệu menu');
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    };

    const handleCategoryChange = (catId: string, field: VisibilityField) => {
        setVisibilityState(prev => {
            const currentVal = prev.categories[catId]?.[field] ?? true;
            return {
                ...prev,
                categories: {
                    ...prev.categories,
                    [catId]: {
                        ...prev.categories[catId],
                        [field]: !currentVal
                    }
                }
            };
        });
    };

    const handleProductChange = (prodId: string, field: VisibilityField) => {
        setVisibilityState(prev => {
            const currentVal = prev.products[prodId]?.[field] ?? true;
            return {
                ...prev,
                products: {
                    ...prev.products,
                    [prodId]: {
                        ...prev.products[prodId],
                        [field]: !currentVal
                    }
                }
            };
        });
    };

    // Apply category setting to all products in that category
    const applyCategoryToProducts = (catId: string, field: VisibilityField) => {
        const categoryVal = visibilityState.categories[catId]?.[field];
        if (categoryVal === undefined) return;

        const catProducts = products.filter(p => p.category_id === catId);

        setVisibilityState(prev => {
            const newProducts = { ...prev.products };
            catProducts.forEach(p => {
                newProducts[p.id] = {
                    ...newProducts[p.id],
                    [field]: categoryVal
                };
            });
            return { ...prev, products: newProducts };
        });
        success('Đã áp dụng cho tất cả món trong nhóm');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Update Categories
            const categoryPromises = categories.map(c => {
                const state = visibilityState.categories[c.id];
                if (!state) return Promise.resolve();

                return api.updateCategory(c.id, {
                    display_in_menu: state.menu,
                    display_in_pos: state.pos,
                    display_in_kiosk: state.kiosk
                });
            });

            // 2. Update Products
            const productPromises = products.map(p => {
                const state = visibilityState.products[p.id];
                if (!state) return Promise.resolve();

                return api.updateProduct(p.id, {
                    display_in_menu: state.menu,
                    display_in_pos: state.pos,
                    display_in_kiosk: state.kiosk
                });
            });

            await Promise.all([...categoryPromises, ...productPromises]);
            success('Lưu cấu hình thành công');
            onSave?.();
            onClose();
        } catch (err) {
            console.error('Failed to save visibility settings:', err);
            error('Lỗi khi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const visibilityFields: VisibilityField[] = ['menu', 'pos', 'kiosk'];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">Cấu hình Hiển thị Menu</h2>
                        <p className="text-sm text-gray-500">Quản lý hiển thị cho Nhóm món và Món ăn trên các kênh</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 pl-6 font-medium text-gray-600">Tên Nhóm / Món</th>
                                    <th className="p-4 w-32 text-center text-gray-600">
                                        <div className="flex flex-col items-center gap-1">
                                            <Smartphone size={20} className="text-blue-600" />
                                            <span className="text-xs">Menu Khách</span>
                                        </div>
                                    </th>
                                    <th className="p-4 w-32 text-center text-gray-600">
                                        <div className="flex flex-col items-center gap-1">
                                            <Monitor size={20} className="text-orange-600" />
                                            <span className="text-xs">POS Order</span>
                                        </div>
                                    </th>
                                    <th className="p-4 w-32 text-center text-gray-600">
                                        <div className="flex flex-col items-center gap-1">
                                            <SquareTerminal size={20} className="text-purple-600" />
                                            <span className="text-xs">Kiosk</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categories.map(category => (
                                    <>
                                        {/* Category Row */}
                                        <tr key={category.id} className="bg-gray-50/80 hover:bg-gray-100">
                                            <td className="p-3 pl-4">
                                                <button
                                                    onClick={() => toggleCategory(category.id)}
                                                    className="flex items-center gap-2 font-semibold text-gray-800 w-full text-left"
                                                >
                                                    <span className={`transform transition-transform ${expandedCategories.has(category.id) ? 'rotate-90' : ''}`}>
                                                        ▶
                                                    </span>
                                                    {category.name_vi}
                                                    <span className="text-xs font-normal text-gray-500 ml-2">
                                                        ({products.filter(p => p.category_id === category.id).length} món)
                                                    </span>
                                                </button>
                                            </td>
                                            {/* Category Toggles */}
                                            {visibilityFields.map(field => (
                                                <td key={field} className="p-3 text-center">
                                                    <div className="flex items-center justify-center gap-2 group relative">
                                                        <input
                                                            type="checkbox"
                                                            checked={visibilityState.categories[category.id]?.[field] ?? true}
                                                            onChange={() => handleCategoryChange(category.id, field)}
                                                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                        {/* Quick apply to children button */}
                                                        <button
                                                            onClick={() => applyCategoryToProducts(category.id, field)}
                                                            title="Áp dụng cho tất cả món trong nhóm"
                                                            className="opacity-0 group-hover:opacity-100 absolute -right-4 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>

                                        {/* Products Rows (Collapsible) */}
                                        {expandedCategories.has(category.id) && products
                                            .filter(p => p.category_id === category.id)
                                            .map(product => (
                                                <tr key={product.id} className="border-b last:border-0 hover:bg-blue-50/30">
                                                    <td className="p-3 pl-12 text-sm text-gray-700 border-l-4 border-l-transparent hover:border-l-blue-200">
                                                        {product.name_vi}
                                                        {product.is_combo && <span className="ml-2 text-[10px] bg-orange-100 text-orange-800 px-1 rounded">Combo</span>}
                                                    </td>
                                                    {visibilityFields.map(field => (
                                                        <td key={field} className="p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={visibilityState.products[product.id]?.[field] ?? true}
                                                                onChange={() => handleProductChange(product.id, field)}
                                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        }
                                    </>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                        disabled={saving}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <Save size={18} />
                        )}
                        Lưu Thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
}
