import React, { useState, useEffect } from 'react';
import { api, type Product } from '../../services/api';
import { X, Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

interface ComboEditorProps {
    comboProduct: Product;
    isOpen: boolean;
    onClose: () => void;
    allProducts: Product[]; // Pass all products to select from
}

interface ComboItem {
    id: string; // Product ID (for display lookup)
    product_id: string; // For API
    quantity: number;
    name_vi?: string;
    price?: number;
}

export default function ComboEditor({ comboProduct, isOpen, onClose, allProducts }: ComboEditorProps) {
    const [items, setItems] = useState<ComboItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && comboProduct) {
            loadComboItems();
        }
    }, [isOpen, comboProduct]);

    const loadComboItems = async () => {
        setLoading(true);
        try {
            const res = await api.getComboItems(comboProduct.id);
            if (res.data && res.data.items) {
                // Map API response to local state
                // API returns: { id (included_prod_id), name_vi, price, quantity }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
                setItems(res.data.items.map((i: any) => ({
                    id: i.id,
                    product_id: i.id,
                    quantity: i.quantity,
                    name_vi: i.name_vi,
                    price: i.price
                })));
            }
        } catch (error) {
            console.error('Failed to load combo items', error);
            // Ignore 404/400 if just no items yet
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = (product: Product) => {
        const existing = items.find(i => i.product_id === product.id);
        if (existing) {
            // Increment
            setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            // Add new
            setItems([...items, {
                id: product.id,
                product_id: product.id,
                quantity: 1,
                name_vi: product.name_vi,
                price: product.price
            }]);
        }
    };

    const handleUpdateQuantity = (productId: string, delta: number) => {
        setItems(items.map(i => {
            if (i.product_id === productId) {
                const newQty = i.quantity + delta;
                return newQty > 0 ? { ...i, quantity: newQty } : i;
            }
            return i;
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(i => i.product_id !== productId));
    };

    const handleSave = async () => {
        try {
            const payload = items.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity
            }));
            await api.updateComboItems(comboProduct.id, payload);
            toast.success('Đã lưu combo!');
            onClose();
        } catch (error) {
            console.error('Failed to save combo', error);
            toast.error('Lỗi lưu combo');
        }
    };

    if (!isOpen) return null;

    // Filter products to pick from (exclude generic ones or the combo itself)
    const availableProducts = allProducts.filter(p =>
        p.id !== comboProduct.id && // Don't include itself
        !p.is_combo && // Don't nest combos (simplification)
        p.name_vi.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Cấu hình Combo: {comboProduct.name_vi}</h2>
                        <p className="text-sm text-slate-500">Chọn các món có trong combo này</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Product Selector */}
                    <div className="w-1/2 border-r flex flex-col">
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Tìm món thêm vào combo..."
                                    className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {availableProducts.map(product => (
                                <div key={product.id}
                                    onClick={() => handleAddItem(product)}
                                    className="flex items-center gap-3 p-2 hover:bg-blue-50 cursor-pointer rounded-lg border border-transparent hover:border-blue-100 transition-colors group">
                                    {product.image_url ? (
                                        <img src={api.getUploadUrl(product.image_url)} className="w-10 h-10 rounded object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 bg-slate-200 rounded"></div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-medium text-sm text-slate-700 group-hover:text-blue-700">{product.name_vi}</p>
                                        <p className="text-xs text-slate-500">¥{product.price.toLocaleString()}</p>
                                    </div>
                                    <button className="text-blue-500 opacity-0 group-hover:opacity-100">
                                        <Plus size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Selected Items */}
                    <div className="w-1/2 flex flex-col bg-slate-50">
                        <div className="p-3 border-b bg-white">
                            <h3 className="font-semibold text-slate-700">Các món đã chọn ({items.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {loading ? (
                                <div className="text-center py-10 text-slate-500">Đang tải...</div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                                    <span className="text-4xl mb-2">🍽️</span>
                                    <p>Chưa có món nào trong combo</p>
                                    <p className="text-sm">Chọn món từ danh sách bên trái</p>
                                </div>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border flex items-center gap-3">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{item.name_vi}</p>
                                            <p className="text-xs text-slate-500">x ¥{item.price?.toLocaleString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                            <button
                                                onClick={() => handleUpdateQuantity(item.product_id, -1)}
                                                className="w-6 h-6 flex items-center justify-center hover:bg-white rounded"
                                            >-</button>
                                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => handleUpdateQuantity(item.product_id, 1)}
                                                className="w-6 h-6 flex items-center justify-center hover:bg-white rounded"
                                            >+</button>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.product_id)}
                                            className="text-red-400 hover:text-red-600 p-2"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Summary Footer */}
                        <div className="p-4 bg-white border-t">
                            <div className="flex justify-between items-center mb-4 text-sm text-slate-600">
                                <span>Tổng giá trị các món:</span>
                                <span className="font-bold text-slate-800">
                                    ¥{items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-slate-50">Hủy</button>
                                <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Lưu Combo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
