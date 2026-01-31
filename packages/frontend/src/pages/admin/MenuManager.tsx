import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import type { Product, Category, Badge, Station } from '../../services/api';
import { Plus, Pencil, Trash2, Search, Upload, Image as ImageIcon, Layers, List as ListIcon, X, Tag, Barcode, Link as LinkIcon, Download, FileUp, ChefHat } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ComboEditor from './ComboEditor';
import ConfirmModal from '../../components/ConfirmModal';
import * as XLSX from 'xlsx';

export default function MenuManager() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Partial<Product>>({
        name_vi: '',
        price: 0,
        category_id: '',
        is_available: true,
        is_best_seller: false,
        is_chef_choice: false,
        is_combo: false,
        display_in_kitchen: true,
        sku: '',
        badge_ids: [],
        station_ids: [],
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageInputType, setImageInputType] = useState<'file' | 'url'>('file');
    const [imageUrlInput, setImageUrlInput] = useState('');

    // Combo Editor
    const [isComboEditorOpen, setIsComboEditorOpen] = useState(false);
    const [selectedComboProduct, setSelectedComboProduct] = useState<Product | null>(null);

    // Category Management
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryForm, setCategoryForm] = useState<Partial<Category>>({
        name_vi: '',
        sort_order: 0,
    });

    // Badge Management
    const [badgeForm, setBadgeForm] = useState<Partial<Badge>>({ name_vi: '', color: 'red' });
    const [editingBadge, setEditingBadge] = useState<Badge | null>(null);

    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Delete confirmation states
    const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
    const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
    const [deleteBadgeId, setDeleteBadgeId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [catRes, prodRes, badgeRes, stationRes] = await Promise.all([
                api.getCategories(),
                api.getProducts(),
                api.getBadges(),
                api.getActiveStations()
            ]);
            if (catRes.data) setCategories(catRes.data.categories);
            if (prodRes.data) setProducts(prodRes.data.products);
            if (badgeRes.data) setBadges(badgeRes.data.badges);
            if (stationRes.data) setStations(stationRes.data.stations);
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtered Products
    const filteredProducts = products.filter(p => {
        const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
        const matchesSearch = p.name_vi.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Handlers
    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let imageUrl = editingProduct?.image_url;

            // Handle Image
            if (imageInputType === 'file' && imageFile) {
                const uploadRes = await api.uploadImage(imageFile);
                if (uploadRes.data) {
                    imageUrl = uploadRes.data.imageUrl;
                }
            } else if (imageInputType === 'url') {
                imageUrl = imageUrlInput;
            }

            const productData = {
                ...formData,
                image_url: imageUrl || undefined,
                // Fix: convert empty strings to undefined to avoid validation errors
                category_id: formData.category_id || undefined,
                sku: formData.sku?.trim() || undefined,
                price: Number(formData.price),
            };

            if (editingProduct) {
                await api.updateProduct(editingProduct.id, productData);
            } else {
                await api.createProduct(productData);
            }

            setIsProductModalOpen(false);
            setEditingProduct(null);
            setImageFile(null);
            setFormData({ name_vi: '', price: 0, category_id: '', is_available: true, is_best_seller: false, is_chef_choice: false, is_combo: false, sku: '', badge_ids: [] });
            loadData();
        } catch (error: any) {
            console.error('Failed to save product', error);
            const msg = error.response?.data?.message || error.message || 'Lỗi không xác định';
            alert(`Lỗi lưu sản phẩm: ${msg}`);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        setDeleteProductId(id);
    };

    const confirmDeleteProduct = async () => {
        if (!deleteProductId) return;
        try {
            await api.deleteProduct(deleteProductId);
            loadData();
        } catch (error) {
            alert('Failed to delete product');
        } finally {
            setDeleteProductId(null);
        }
    };

    const openEditModal = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            category_id: product.category_id || '',
            name_vi: product.name_vi,
            name_ja: product.name_ja || '',
            name_en: product.name_en || '',
            price: product.price,
            sku: product.sku || '',
            is_best_seller: product.is_best_seller,
            is_chef_choice: product.is_chef_choice,
            is_combo: product.is_combo,
            display_in_kitchen: product.display_in_kitchen ?? true,
            badge_ids: product.badges?.map(b => b.id) || [],
            station_ids: product.stations?.map(s => s.id) || [],
            image_url: product.image_url,
        });

        // Handle image input state
        if (product.image_url && product.image_url.startsWith('http')) {
            setImageInputType('url');
            setImageUrlInput(product.image_url);
        } else {
            setImageInputType('file');
            setImageUrlInput('');
        }

        setImageFile(null);
        setIsProductModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setFormData({
            name_vi: '',
            price: 0,
            category_id: categories[0]?.id || '',
            is_available: true,
            is_best_seller: false,
            is_chef_choice: false,
            is_combo: false,
            sku: '',
            badge_ids: [],
            station_ids: [],
        });
        setImageFile(null);
        setImageInputType('file');
        setImageUrlInput('');
        setIsProductModalOpen(true);
    };

    const openComboEditor = (product: Product) => {
        setSelectedComboProduct(product);
        setIsComboEditorOpen(true);
    };

    // Category Handlers
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await api.updateCategory(editingCategory.id, categoryForm);
            } else {
                await api.createCategory(categoryForm);
            }
            // Reset form
            setCategoryForm({ name_vi: '', sort_order: 0 });
            setEditingCategory(null);
            // Reload
            const res = await api.getCategories();
            if (res.data) setCategories(res.data.categories);
        } catch (error) {
            alert('Lỗi lưu danh mục');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        setDeleteCategoryId(id);
    };

    const confirmDeleteCategory = async () => {
        if (!deleteCategoryId) return;
        try {
            await api.deleteCategory(deleteCategoryId);
            const res = await api.getCategories();
            if (res.data) setCategories(res.data.categories);
        } catch (error) {
            alert('Lỗi xóa danh mục');
        } finally {
            setDeleteCategoryId(null);
        }
    };

    const startEditCategory = (category: Category) => {
        setEditingCategory(category);
        setCategoryForm({
            name_vi: category.name_vi,
            sort_order: category.sort_order
        });
    };

    const cancelEditCategory = () => {
        setEditingCategory(null);
        setCategoryForm({ name_vi: '', sort_order: 0 });
    };

    if (loading) return <div>Loading...</div>;

    // --- Badge Management ---

    const handleSaveBadge = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBadge) {
                await api.updateBadge(editingBadge.id, badgeForm);
            } else {
                await api.createBadge(badgeForm);
            }
            // Reset
            setBadgeForm({ name_vi: '', color: 'red' });
            setEditingBadge(null);
            // Reload
            const res = await api.getBadges();
            if (res.data) setBadges(res.data.badges);
        } catch (error) {
            alert('Lỗi lưu badge');
        }
    };

    const handleDeleteBadge = async (id: string) => {
        setDeleteBadgeId(id);
    };

    const confirmDeleteBadge = async () => {
        if (!deleteBadgeId) return;
        try {
            await api.deleteBadge(deleteBadgeId);
            const res = await api.getBadges();
            if (res.data) setBadges(res.data.badges);
        } catch (error) {
            alert('Lỗi xóa badge');
        } finally {
            setDeleteBadgeId(null);
        }
    };

    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'gray', 'orange', 'pink'];

    // Excel Export
    const handleExportExcel = () => {
        const exportData = products.map(p => ({
            'Tên món': p.name_vi,
            'Tên tiếng Nhật': p.name_ja || '',
            'Tên tiếng Anh': p.name_en || '',
            'Danh mục': categories.find(c => c.id === p.category_id)?.name_vi || '',
            'Giá': p.price,
            'SKU': p.sku || '',
            'Link ảnh': p.image_url || '',
            'Còn hàng': p.is_available ? 'Có' : 'Không',
            'Best Seller': p.is_best_seller ? 'Có' : 'Không',
            'Chef Choice': p.is_chef_choice ? 'Có' : 'Không',
            'Là Combo': p.is_combo ? 'Có' : 'Không',
        }));

        // Create worksheet and workbook
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Menu');

        // Generate filename
        const filename = `thuc-don-${new Date().toISOString().split('T')[0]}.xlsx`;

        // Create Excel buffer and download via Blob
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
        });

        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Cleanup after delay
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }, 100);
    };

    // Excel Import
    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

            let created = 0, updated = 0, errors = 0;

            for (const row of rows) {
                const nameVi = row['Tên món'] || row['name_vi'] || row['Tên'];
                if (!nameVi) continue;

                const categoryName = row['Danh mục'] || row['category'] || '';
                const category = categories.find(c => c.name_vi.toLowerCase() === categoryName.toLowerCase());

                const productData: Partial<Product> = {
                    name_vi: nameVi,
                    name_ja: row['Tên tiếng Nhật'] || row['name_ja'] || '',
                    name_en: row['Tên tiếng Anh'] || row['name_en'] || '',
                    category_id: category?.id,
                    price: Number(row['Giá'] || row['price'] || 0),
                    sku: row['SKU'] || row['sku'] || '',
                    image_url: row['Link ảnh'] || row['image_url'] || '',
                    is_available: (row['Còn hàng'] || row['is_available'] || 'Có').toString().toLowerCase() !== 'không',
                    is_best_seller: (row['Best Seller'] || row['is_best_seller'] || '').toString().toLowerCase() === 'có',
                    is_chef_choice: (row['Chef Choice'] || row['is_chef_choice'] || '').toString().toLowerCase() === 'có',
                    is_combo: (row['Là Combo'] || row['is_combo'] || '').toString().toLowerCase() === 'có',
                };

                // Check if product exists by SKU or name
                const existingProduct = products.find(
                    p => (productData.sku && p.sku === productData.sku) || p.name_vi === productData.name_vi
                );

                try {
                    if (existingProduct) {
                        await api.updateProduct(existingProduct.id, productData);
                        updated++;
                    } else {
                        await api.createProduct(productData);
                        created++;
                    }
                } catch (err) {
                    console.error('Import error for:', nameVi, err);
                    errors++;
                }
            }

            alert(`Import hoàn tất!\n✓ Tạo mới: ${created}\n✓ Cập nhật: ${updated}\n✗ Lỗi: ${errors}`);
            loadData();
        } catch (err) {
            console.error('Import failed:', err);
            alert('Lỗi khi đọc file Excel. Vui lòng kiểm tra lại file.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Quản lý Thực đơn</h1>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    {/* Excel Export */}
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        title="Xuất danh sách món ra file Excel"
                    >
                        <Download size={20} />
                        <span className="hidden lg:inline">Xuất Excel</span>
                    </button>
                    {/* Excel Import */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx,.xls"
                        onChange={handleImportExcel}
                        className="hidden"
                        id="excel-import"
                    />
                    <label
                        htmlFor="excel-import"
                        className={`flex items-center gap-2 px-3 py-2 ${isImporting ? 'bg-gray-400' : 'bg-orange-500 hover:bg-orange-600'} text-white rounded-lg cursor-pointer transition`}
                        title="Nhập món từ file Excel"
                    >
                        <FileUp size={20} />
                        <span className="hidden lg:inline">{isImporting ? 'Đang nhập...' : 'Nhập Excel'}</span>
                    </label>
                    <button
                        onClick={() => setIsBadgeModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                        title="Quản lý Badges"
                    >
                        <Tag size={20} />
                        <span className="hidden lg:inline">Quản lý Badges</span>
                    </button>
                    <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        title="Quản lý Danh mục"
                    >
                        <ListIcon size={20} />
                        <span className="hidden lg:inline">Quản lý Danh mục</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition ml-auto md:ml-0"
                    >
                        <Plus size={20} />
                        <span className="font-medium">Thêm Món</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm món ăn..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                >
                    <option value="all">Tất cả Danh mục</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name_vi}</option>
                    ))}
                </select>
            </div>

            {/* Product List */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600 w-20">Hình ảnh</th>
                                <th className="p-4 font-semibold text-slate-600 min-w-[200px]">Tên món</th>
                                <th className="p-4 font-semibold text-slate-600 hidden md:table-cell">Danh mục</th>
                                <th className="p-4 font-semibold text-slate-600 whitespace-nowrap">Giá</th>
                                <th className="p-4 font-semibold text-slate-600 hidden lg:table-cell">Badges</th>
                                <th className="p-4 font-semibold text-slate-600 whitespace-nowrap">Trạng thái</th>
                                <th className="p-4 font-semibold text-slate-600 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        {product.image_url ? (
                                            <img src={api.getUploadUrl(product.image_url)} alt={product.name_vi} className="w-12 h-12 object-cover rounded-lg" />
                                        ) : (
                                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 font-medium">
                                        <div>{product.name_vi}</div>
                                        <div className="text-xs text-slate-400 md:hidden mt-1">
                                            {categories.find(c => c.id === product.category_id)?.name_vi}
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-500 hidden md:table-cell">
                                        {categories.find(c => c.id === product.category_id)?.name_vi || '-'}
                                    </td>
                                    <td className="p-4 font-medium text-blue-600 whitespace-nowrap">
                                        ¥{Math.round(product.price).toLocaleString()}
                                    </td>
                                    <td className="p-4 space-x-1 hidden lg:table-cell">
                                        {product.is_best_seller && (
                                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold">HOT</span>
                                        )}
                                        {product.is_chef_choice && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold">CHEF</span>
                                        )}
                                        {product.badges?.map(b => (
                                            <span key={b.id} className={`px-2 py-1 bg-${b.color}-100 text-${b.color}-600 text-xs rounded-full font-bold`}>
                                                {b.name_vi}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_available ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                            {product.is_available ? 'Còn hàng' : 'Hết hàng'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                                        <button onClick={() => openEditModal(product)} className="text-slate-400 hover:text-blue-600 inline-block p-1">
                                            <Pencil size={18} />
                                        </button>
                                        {product.is_combo && (
                                            <button
                                                onClick={() => openComboEditor(product)}
                                                className="text-purple-400 hover:text-purple-600 inline-block p-1"
                                                title="Cấu hình Combo"
                                            >
                                                <Layers size={18} />
                                            </button>
                                        )}
                                        <button onClick={() => handleDeleteProduct(product.id)} className="text-slate-400 hover:text-red-500 inline-block p-1">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-slate-500">Không tìm thấy món nào</div>
                )}
            </div>

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editingProduct ? 'Sửa Món' : 'Thêm Món Mới'}</h2>
                        <form onSubmit={handleSaveProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên món</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.name_vi}
                                    onChange={e => setFormData({ ...formData, name_vi: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="1"
                                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={Math.round(formData.price || 0)}
                                        onChange={e => setFormData({ ...formData, price: Math.round(Number(e.target.value)) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Danh mục</label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                    >
                                        <option value="">Chọn danh mục</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name_vi}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Image Upload / Link */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh</label>

                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={imageInputType === 'file'}
                                            onChange={() => setImageInputType('file')}
                                            className="text-blue-600"
                                        />
                                        <span>Upload file</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={imageInputType === 'url'}
                                            onChange={() => setImageInputType('url')}
                                            className="text-blue-600"
                                        />
                                        <span>Link ảnh</span>
                                    </label>
                                </div>

                                {imageInputType === 'file' ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="image-upload"
                                        />
                                        <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-500">
                                                {imageFile ? imageFile.name : (formData.image_url ? 'Đang có ảnh (Nhấn để thay đổi)' : 'Nhấn để tải ảnh lên')}
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center border rounded-lg px-3 py-2">
                                        <LinkIcon className="text-gray-400 mr-2" size={18} />
                                        <input
                                            type="text"
                                            value={imageUrlInput}
                                            onChange={(e) => setImageUrlInput(e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="flex-1 outline-none"
                                        />
                                    </div>
                                )}

                                {(imageFile || (imageInputType === 'url' && imageUrlInput) || formData.image_url) && (
                                    <div className="mt-2 text-center">
                                        <p className="text-xs text-green-600">Đã chọn ảnh</p>
                                    </div>
                                )}
                            </div>

                            {/* SKU */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mã sản phẩm (SKU/Barcode)</label>
                                <div className="flex items-center border rounded-lg px-3 py-2">
                                    <Barcode className="text-gray-400 mr-2" size={18} />
                                    <input
                                        type="text"
                                        name="sku"
                                        value={formData.sku || ''}
                                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="Scanned code or SKU"
                                        className="flex-1 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_available"
                                    checked={formData.is_available}
                                    onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                                    className="rounded text-blue-600"
                                />
                                <label htmlFor="is_available">Còn hàng để bán</label>
                            </div>

                            {/* Gửi vào bếp (KDS) */}
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.display_in_kitchen ?? true}
                                        onChange={(e) => setFormData({ ...formData, display_in_kitchen: e.target.checked })}
                                        className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500"
                                    />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">👨‍🍳</span>
                                        <div>
                                            <span className="text-sm font-bold text-slate-800">Gửi vào bếp (KDS)</span>
                                            <p className="text-xs text-slate-500">Bật nếu món cần bếp chế biến. Tắt cho đồ uống/sản phẩm không qua bếp.</p>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Station Selector */}
                            {formData.display_in_kitchen && stations.length > 0 && (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <label className="block text-sm font-bold text-slate-800 mb-2">
                                        <ChefHat size={16} className="inline mr-2" />
                                        Gửi vào Station nào?
                                    </label>
                                    <p className="text-xs text-slate-500 mb-3">Chọn một hoặc nhiều bếp/bar sẽ nhận món này</p>
                                    <div className="flex flex-wrap gap-2">
                                        {stations.map(station => {
                                            const isSelected = formData.station_ids?.includes(station.id);
                                            return (
                                                <button
                                                    key={station.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const currentIds = formData.station_ids || [];
                                                        const newIds = isSelected
                                                            ? currentIds.filter(id => id !== station.id)
                                                            : [...currentIds, station.id];
                                                        setFormData({ ...formData, station_ids: newIds });
                                                    }}
                                                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border-2 transition ${isSelected
                                                        ? 'border-current shadow-sm'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                        }`}
                                                    style={isSelected ? {
                                                        backgroundColor: station.color + '20',
                                                        borderColor: station.color,
                                                        color: station.color
                                                    } : {}}
                                                >
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: station.color }}
                                                    />
                                                    {station.name}
                                                    {isSelected && <X size={14} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {formData.station_ids?.length === 0 && (
                                        <p className="text-xs text-amber-600 mt-2">
                                            ⚠️ Chưa chọn station nào - món sẽ hiện trên tất cả màn hình bếp
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Badges Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gán Badges (Nhãn)</label>
                                <div className="flex flex-wrap gap-2">
                                    {badges.map(badge => {
                                        const isSelected = formData.badge_ids?.includes(badge.id);
                                        return (
                                            <button
                                                key={badge.id}
                                                type="button"
                                                onClick={() => {
                                                    const currentIds = formData.badge_ids || [];
                                                    const newIds = isSelected
                                                        ? currentIds.filter(id => id !== badge.id)
                                                        : [...currentIds, badge.id];
                                                    setFormData({ ...formData, badge_ids: newIds });
                                                }}
                                                className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 border ${isSelected
                                                    ? `bg-${badge.color}-100 border-${badge.color}-500 text-${badge.color}-700`
                                                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {badge.name_vi}
                                                {isSelected && <X size={14} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-2 border-t">
                                {/* Legacy checkboxes maintained for backward compat if needed, or remove them and rely on badges */}
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_combo}
                                        onChange={(e) => setFormData({ ...formData, is_combo: e.target.checked })}
                                        className="rounded text-blue-600"
                                    />
                                    <Layers size={16} className="text-purple-600" />
                                    <span>Là Combo/Set</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingProduct ? 'Lưu thay đổi' : 'Tạo món'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Combo Editor Modal */}
            {selectedComboProduct && (
                <ComboEditor
                    isOpen={isComboEditorOpen}
                    onClose={() => setIsComboEditorOpen(false)}
                    comboProduct={selectedComboProduct}
                    allProducts={products}
                />
            )}

            {/* Badge Manager Modal */}
            {isBadgeModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Quản lý Badges (Nhãn)</h2>
                            <button onClick={() => setIsBadgeModalOpen(false)}><X /></button>
                        </div>

                        <form onSubmit={handleSaveBadge} className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tên nhãn</label>
                                    <input
                                        type="text"
                                        value={badgeForm.name_vi}
                                        onChange={(e) => setBadgeForm({ ...badgeForm, name_vi: e.target.value })}
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="Ví dụ: Mới, Cay, ..."
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Màu sắc</label>
                                    <select
                                        value={badgeForm.color}
                                        onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })}
                                        className="w-full border rounded px-3 py-2"
                                    >
                                        {colors.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                {editingBadge && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingBadge(null);
                                            setBadgeForm({ name_vi: '', color: 'red' });
                                        }}
                                        className="px-4 py-2 text-gray-600"
                                    >
                                        Hủy
                                    </button>
                                )}
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                                    {editingBadge ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>

                        <div className="space-y-2">
                            {badges.map(badge => (
                                <div key={badge.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs bg-${badge.color}-100 text-${badge.color}-800`}>
                                            {badge.name_vi}
                                        </span>
                                        <span className="text-sm text-gray-500">Màu: {badge.color}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingBadge(badge);
                                                setBadgeForm(badge);
                                            }}
                                            className="p-1 hover:bg-gray-200 rounded"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteBadge(badge.id)}
                                            className="p-1 hover:bg-red-100 text-red-600 rounded"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Category Manager Modal start */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Quản lý Danh mục</h2>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Add/Edit Form */}
                        <div className="bg-slate-50 p-4 rounded-lg mb-6">
                            <h3 className="text-sm font-semibold mb-3 text-slate-700">
                                {editingCategory ? 'Chỉnh sửa Danh mục' : 'Thêm Danh mục Mới'}
                            </h3>
                            <form onSubmit={handleSaveCategory} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Tên danh mục</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={categoryForm.name_vi}
                                        onChange={e => setCategoryForm({ ...categoryForm, name_vi: e.target.value })}
                                        placeholder="Ví dụ: Món Chính"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs text-slate-500 mb-1">Thứ tự</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={categoryForm.sort_order}
                                        onChange={e => setCategoryForm({ ...categoryForm, sort_order: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    {editingCategory && (
                                        <button
                                            type="button"
                                            onClick={cancelEditCategory}
                                            className="px-3 py-2 text-sm border bg-white rounded hover:bg-slate-50"
                                        >
                                            Hủy
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                                    >
                                        {editingCategory ? 'Lưu' : 'Thêm'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Category List */}
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="p-3">Tên danh mục</th>
                                        <th className="p-3 w-20 text-center">Thứ tự</th>
                                        <th className="p-3 w-24 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {categories.map(cat => (
                                        <tr key={cat.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-700">{cat.name_vi}</td>
                                            <td className="p-3 text-center text-slate-500">{cat.sort_order}</td>
                                            <td className="p-3 text-right space-x-2">
                                                <button
                                                    onClick={() => startEditCategory(cat)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Sửa"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCategory(cat.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {categories.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-slate-400">
                                                Chưa có danh mục nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Product Confirmation */}
            <ConfirmModal
                isOpen={!!deleteProductId}
                title="Xóa món"
                message="Bạn có chắc muốn xóa món này không?"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDeleteProduct}
                onCancel={() => setDeleteProductId(null)}
            />

            {/* Delete Category Confirmation */}
            <ConfirmModal
                isOpen={!!deleteCategoryId}
                title="Xóa danh mục"
                message="Bạn có chắc muốn xóa danh mục này? (Các món trong danh mục sẽ vẫn tồn tại nhưng không thuộc danh mục nào)"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="warning"
                onConfirm={confirmDeleteCategory}
                onCancel={() => setDeleteCategoryId(null)}
            />

            {/* Delete Badge Confirmation */}
            <ConfirmModal
                isOpen={!!deleteBadgeId}
                title="Xóa badge"
                message="Bạn có chắc muốn xóa badge này?"
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
                onConfirm={confirmDeleteBadge}
                onCancel={() => setDeleteBadgeId(null)}
            />

        </div>
    );
}
