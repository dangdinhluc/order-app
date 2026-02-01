import { useState, useEffect } from 'react';
import { Settings2, Plus, Trash2, Loader2, Check, Search } from 'lucide-react';

interface QuickNote {
    id?: string;
    label: string;
    price_modifier: number;
    sort_order: number;
}

interface Product {
    id: string;
    name: string;
    image_url: string | null;
    category_name: string;
}

const API_URL = import.meta.env.VITE_API_URL || '';

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
};

export default function ProductOptionsSettings() {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [notes, setNotes] = useState<QuickNote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newNote, setNewNote] = useState({ label: '', price_modifier: 0 });

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings/products-featured`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.data?.products) {
                setProducts(data.data.products);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadNotes = async (productId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/settings/quick-notes/${productId}`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.data?.notes) {
                setNotes(data.data.notes);
            } else {
                setNotes([]);
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            setNotes([]);
        }
    };

    const handleSelectProduct = async (product: Product) => {
        setSelectedProduct(product);
        await loadNotes(product.id);
    };

    const handleAddNote = async () => {
        if (!selectedProduct || !newNote.label.trim()) return;

        setIsSaving(true);
        try {
            await fetch(`${API_URL}/api/settings/quick-notes`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    label: newNote.label,
                    price_modifier: newNote.price_modifier,
                    sort_order: notes.length
                })
            });
            await loadNotes(selectedProduct.id);
            setNewNote({ label: '', price_modifier: 0 });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error adding note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm('Xóa tùy chọn này?')) return;

        try {
            await fetch(`${API_URL}/api/settings/quick-notes/${noteId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (selectedProduct) {
                await loadNotes(selectedProduct.id);
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const presetOptions = [
        { label: 'Size lớn', price: 30 },
        { label: 'Size nhỏ', price: -20 },
        { label: 'Không hành', price: 0 },
        { label: 'Thêm rau', price: 10 },
        { label: 'Ít đá', price: 0 },
        { label: 'Ít đường', price: 0 },
        { label: 'Thêm thịt', price: 50 },
        { label: 'Cay nhiều', price: 0 },
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-amber-600" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                    <Settings2 className="text-amber-600" size={24} />
                    Tùy chọn món ăn
                </h3>
                <p className="text-slate-500">Cài đặt các lựa chọn như size, không hành, thêm topping... cho từng món</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Product List */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm món..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {filteredProducts.map(product => (
                            <button
                                key={product.id}
                                onClick={() => handleSelectProduct(product)}
                                className={`w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition border-b border-slate-50 ${selectedProduct?.id === product.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
                                    }`}
                            >
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">🍜</div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-800 truncate">{product.name}</p>
                                    <p className="text-xs text-slate-500">{product.category_name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Notes Editor */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    {selectedProduct ? (
                        <>
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                                {selectedProduct.image_url ? (
                                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-14 h-14 rounded-xl object-cover" />
                                ) : (
                                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-3xl">🍜</div>
                                )}
                                <div>
                                    <h4 className="font-bold text-slate-800">{selectedProduct.name}</h4>
                                    <p className="text-sm text-slate-500">Cài đặt tùy chọn</p>
                                </div>
                            </div>

                            {/* Current Notes */}
                            <div className="space-y-2 mb-6">
                                <p className="text-sm font-medium text-slate-600">Các tùy chọn hiện tại:</p>
                                {notes.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {notes.map(note => (
                                            <div
                                                key={note.id}
                                                className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-800 rounded-xl border border-amber-200"
                                            >
                                                <span className="font-medium">{note.label}</span>
                                                {note.price_modifier !== 0 && (
                                                    <span className="text-amber-600 text-sm">
                                                        {note.price_modifier > 0 ? '+' : ''}¥{note.price_modifier}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteNote(note.id!)}
                                                    className="p-1 hover:bg-amber-200/50 rounded-full transition"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 italic">Chưa có tùy chọn nào</p>
                                )}
                            </div>

                            {/* Preset Quick Add */}
                            <div className="mb-6">
                                <p className="text-sm font-medium text-slate-600 mb-2">Thêm nhanh:</p>
                                <div className="flex flex-wrap gap-2">
                                    {presetOptions.map(preset => (
                                        <button
                                            key={preset.label}
                                            onClick={() => setNewNote({ label: preset.label, price_modifier: preset.price })}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition"
                                        >
                                            {preset.label}
                                            {preset.price !== 0 && (
                                                <span className="ml-1 text-slate-500">
                                                    ({preset.price > 0 ? '+' : ''}¥{preset.price})
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Add New Note */}
                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <input
                                    type="text"
                                    placeholder="Tên tùy chọn..."
                                    value={newNote.label}
                                    onChange={(e) => setNewNote({ ...newNote, label: e.target.value })}
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                                <input
                                    type="number"
                                    placeholder="Giá"
                                    value={newNote.price_modifier || ''}
                                    onChange={(e) => setNewNote({ ...newNote, price_modifier: parseInt(e.target.value) || 0 })}
                                    className="w-24 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNote.label.trim() || isSaving}
                                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-medium transition"
                                >
                                    {isSaving ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : saveSuccess ? (
                                        <Check size={18} />
                                    ) : (
                                        <Plus size={18} />
                                    )}
                                    Thêm
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <Settings2 className="text-slate-400" size={32} />
                            </div>
                            <p className="text-slate-500">Chọn một món từ danh sách bên trái</p>
                            <p className="text-slate-400 text-sm">để cài đặt các tùy chọn</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
