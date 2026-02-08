import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import type { Product, Category, Badge, Station } from '../../services/api';
import { Plus, Pencil, Trash2, Search, Image as ImageIcon, Layers, List as ListIcon, X, Tag, Download, FileUp, Layout } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ComboEditor from './ComboEditor';
import ProductOptionsSettings from './settings/v3/ProductOptionsSettings';
import LanguageSettings from './settings/v3/LanguageSettings';
import { Settings2, Globe } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import ProductForm from '../../components/admin/ProductForm';
import CategoryManager from '../../components/admin/CategoryManager';
import MenuVisibilityConfig from './MenuVisibilityConfig';
import * as XLSX from 'xlsx';

export default function MenuManager() {
    const { } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [isDisplayConfigOpen, setIsDisplayConfigOpen] = useState(false);
    const [isVisibilityConfigOpen, setIsVisibilityConfigOpen] = useState(false);

    // Column Visibility State
    const [hiddenColumns, setHiddenColumns] = useState<string[]>(['name_ja', 'name_en', 'image_url', 'badges', 'visibility']);

    // Modal states
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Combo Editor
    const [isComboEditorOpen, setIsComboEditorOpen] = useState(false);
    const [selectedComboProduct, setSelectedComboProduct] = useState<Product | null>(null);

    // Category Management
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

    // Badge Management
    const [badgeForm, setBadgeForm] = useState<Partial<Badge>>({ name_vi: '', color: 'red' });
    const [editingBadge, setEditingBadge] = useState<Badge | null>(null);

    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Delete confirmation states
    const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
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
    const handleSaveProduct = async (data: Partial<Product>) => {
        try {
            if (editingProduct) {
                await api.updateProduct(editingProduct.id, data);
            } else {
                await api.createProduct(data);
            }

            setIsProductModalOpen(false);
            setEditingProduct(null);
            loadData();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        setIsProductModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const openComboEditor = (product: Product) => {
        setSelectedComboProduct(product);
        setIsComboEditorOpen(true);
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
            console.error('Lỗi xóa badge', error);
            alert('Lỗi xóa badge');
        } finally {
            setDeleteBadgeId(null);
        }
    };

    const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'gray', 'orange', 'pink'];

    const toggleColumn = (column: string) => {
        setHiddenColumns(prev =>
            prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
        );
    };

    // const toggleProductVisibility = async (product: Product, field: 'display_in_menu' | 'display_in_pos' | 'display_in_kiosk') => {
    //     try {
    //         const newValue = !product[field];
    //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //         const updateData: any = {};
    //         updateData[field] = newValue;

    //         // Optimistic update
    //         setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updateData } : p));

    //         await api.updateProduct(product.id, updateData);
    //     } catch (error) {
    //         console.error('Failed to update visibility', error);
    //         // Revert on error
    //         loadData();
    //     }
    // };

    // Excel Export
    const handleExportExcel = async () => {
        setLoading(true);
        try {
            // Fetch Quick Notes for all products
            const notesMap = new Map<string, string>();
            const chunk = (arr: Product[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
            const batches = chunk(products, 5); // Process 5 products at a time to avoid rate limits

            for (const batch of batches) {
                await Promise.all(batch.map(async (p) => {
                    try {
                        const res = await api.getQuickNotes(p.id);
                        if (res.data?.notes && res.data.notes.length > 0) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const noteStr = res.data.notes.map((n: any) => {
                                const price = n.price_modifier ? `(${n.price_modifier > 0 ? '+' : ''}${n.price_modifier})` : '';
                                return `${n.label}${price}`;
                            }).join('; ');
                            notesMap.set(p.id, noteStr);
                        }
                    } catch (e) {
                        console.error(`Failed to fetch notes for ${p.id}`, e);
                    }
                }));
            }

            const exportData = products.map(p => ({
                'Tên món': p.name_vi,
                'Tên tiếng Nhật': p.name_ja || '',
                'Tên tiếng Anh': p.name_en || '',
                'Danh mục': categories.find(c => c.id === p.category_id)?.name_vi || '',
                'Giá': p.price,
                'SKU': p.sku || '',
                'Tùy chọn': notesMap.get(p.id) || '',
                'Link ảnh': p.image_url || '',
                'Còn hàng': p.is_available ? 'Có' : 'Không',
                'Best Seller': p.is_best_seller ? 'Có' : 'Không',
                'Chef Choice': p.is_chef_choice ? 'Có' : 'Không',
                'Hiển thị Menu': p.display_in_menu !== false ? 'Có' : 'Không',
                'Hiển thị POS': p.display_in_pos !== false ? 'Có' : 'Không',
                'Hiển thị Kiosk': p.display_in_kiosk !== false ? 'Có' : 'Không',
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
        } catch (error) {
            console.error('Export failed:', error);
            alert('Lỗi xuất file Excel');
        } finally {
            setLoading(false);
        }
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
            const currentCategories = [...categories];

            for (const row of rows) {
                const nameVi = row['Tên món'] || row['name_vi'] || row['Tên'];
                if (!nameVi) continue;

                const categoryName = row['Danh mục'] || row['category'] || '';
                let categoryId = undefined;

                if (categoryName) {
                    let category = currentCategories.find(c => c.name_vi.toLowerCase() === categoryName.toLowerCase());

                    if (!category) {
                        try {
                            const newCatRes = await api.createCategory({
                                name_vi: categoryName,
                                sort_order: currentCategories.length
                            });
                            if (newCatRes.data) {
                                category = newCatRes.data.category;
                                currentCategories.push(category);
                            }
                        } catch (err) {
                            console.error('Failed to auto-create category:', categoryName, err);
                        }
                    }
                    categoryId = category?.id;
                }

                const productData: Partial<Product> = {
                    name_vi: nameVi,
                    name_ja: row['Tên tiếng Nhật'] || row['name_ja'] || '',
                    name_en: row['Tên tiếng Anh'] || row['name_en'] || '',
                    category_id: categoryId,
                    price: Number(row['Giá'] || row['price'] || 0),
                    sku: (row['SKU'] || row['sku'] || '').toString(),
                    image_url: row['Link ảnh'] || row['image_url'] || '',
                    is_available: (row['Còn hàng'] || row['is_available'] || 'Có').toString().toLowerCase() !== 'không',
                    is_best_seller: (row['Best Seller'] || row['is_best_seller'] || '').toString().toLowerCase() === 'có',
                    is_chef_choice: (row['Chef Choice'] || row['is_chef_choice'] || '').toString().toLowerCase() === 'có',
                    is_combo: (row['Là Combo'] || row['is_combo'] || '').toString().toLowerCase() === 'có',
                    display_in_menu: (row['Hiển thị Menu'] || row['display_in_menu'] || 'Có').toString().toLowerCase() !== 'không',
                    display_in_pos: (row['Hiển thị POS'] || row['display_in_pos'] || 'Có').toString().toLowerCase() !== 'không',
                    display_in_kiosk: (row['Hiển thị Kiosk'] || row['display_in_kiosk'] || 'Có').toString().toLowerCase() !== 'không',
                };

                // Check if product exists by SKU or name
                const existingProduct = products.find(
                    p => (productData.sku && p.sku === productData.sku) || p.name_vi === productData.name_vi
                );

                let targetProductId = existingProduct?.id;

                try {
                    if (existingProduct) {
                        await api.updateProduct(existingProduct.id, productData);
                        updated++;
                    } else {
                        const res = await api.createProduct(productData);
                        if (res.data) {
                            targetProductId = res.data.product.id;
                            created++;
                        }
                    }

                    // Process Options (Tùy chọn)
                    const optionsStr = row['Tùy chọn'] || '';
                    if (targetProductId && optionsStr) {
                        // Parse options: "Size L(+10); Topping A"
                        const newOptions = optionsStr.split(';').map((s: string) => {
                            s = s.trim();
                            const match = s.match(/^(.*?)(?:\(([-+]?\d+)\))?$/);
                            if (!match) return null;
                            const label = match[1].trim();
                            const price = match[2] ? parseInt(match[2]) : 0;
                            return label ? { label, price_modifier: price } : null;
                        }).filter(Boolean);

                        // Sync options
                        if (newOptions.length > 0) {
                            // Get existing to find duplicates or just simple delete all and add
                            // Simple strategy: Delete all existing notes for this product and re-add
                            const notesRes = await api.getQuickNotes(targetProductId);
                            if (notesRes.data?.notes) {
                                for (const n of notesRes.data.notes) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    await api.deleteQuickNote((n as any).id);
                                }
                            }

                            for (let i = 0; i < newOptions.length; i++) {
                                const opt = newOptions[i];
                                if (opt) {
                                    await api.addQuickNote(targetProductId, opt.label, opt.price_modifier, i);
                                }
                            }
                        }
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
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý Thực đơn</h1>
                    <p className="text-sm text-slate-500">Quản lý món ăn, tùy chọn và ngôn ngữ hiển thị</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setIsOptionsModalOpen(true)}
                        className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-2"
                        title="Cấu hình tùy chọn (Size, Topping...)"
                    >
                        <Settings2 size={16} />
                        <span className="hidden md:inline">Tùy chọn</span>
                    </button>
                    <button
                        onClick={() => setIsLanguageModalOpen(true)}
                        className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 transition-all flex items-center gap-2"
                        title="Cấu hình ngôn ngữ hiển thị"
                    >
                        <Globe size={16} />
                        <span className="hidden md:inline">Ngôn ngữ</span>
                    </button>
                </div>

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
                        onClick={() => setIsVisibilityConfigOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        title="Cấu hình hiển thị (Menu/POS/Kiosk)"
                    >
                        <Settings2 size={20} className="text-blue-600" />
                        <span className="hidden lg:inline">Cấu hình Menu</span>
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
            <div className="flex gap-4 flex-wrap mb-6">
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
                                {!hiddenColumns.includes('image_url') && <th className="p-4 font-semibold text-slate-600 w-20">Hình ảnh</th>}
                                <th className="p-4 font-semibold text-slate-600 min-w-[200px]">Tên món</th>
                                {!hiddenColumns.includes('name_ja') && <th className="p-4 font-semibold text-slate-600">Tên Nhật</th>}
                                {!hiddenColumns.includes('name_en') && <th className="p-4 font-semibold text-slate-600">Tên Anh</th>}
                                <th className="p-4 font-semibold text-slate-600 hidden md:table-cell">Danh mục</th>
                                <th className="p-4 font-semibold text-slate-600 whitespace-nowrap">Giá</th>
                                {!hiddenColumns.includes('badges') && <th className="p-4 font-semibold text-slate-600 hidden lg:table-cell">Badges</th>}
                                {/* <th className="p-4 font-semibold text-slate-600 whitespace-nowrap">Hiển thị</th> */}
                                <th className="p-4 font-semibold text-slate-600 whitespace-nowrap">Trạng thái</th>
                                <th className="p-4 font-semibold text-slate-600 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-slate-50">
                                    {!hiddenColumns.includes('image_url') && (
                                        <td className="p-4">
                                            {product.image_url ? (
                                                <img src={api.getUploadUrl(product.image_url)} alt={product.name_vi} className="w-12 h-12 object-cover rounded-lg" />
                                            ) : (
                                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                    <ImageIcon size={20} />
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td className="p-4 font-medium">
                                        <div>{product.name_vi}</div>
                                        <div className="text-xs text-slate-400 md:hidden mt-1">
                                            {categories.find(c => c.id === product.category_id)?.name_vi}
                                        </div>
                                    </td>
                                    {!hiddenColumns.includes('name_ja') && <td className="p-4 text-slate-500">{product.name_ja}</td>}
                                    {!hiddenColumns.includes('name_en') && <td className="p-4 text-slate-500">{product.name_en}</td>}
                                    <td className="p-4 text-slate-500 hidden md:table-cell">
                                        {categories.find(c => c.id === product.category_id)?.name_vi || '-'}
                                    </td>
                                    <td className="p-4 font-medium text-blue-600 whitespace-nowrap">
                                        ¥{Math.round(product.price).toLocaleString()}
                                    </td>
                                    {!hiddenColumns.includes('badges') && (
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
                                    )}
                                    {/* <td className="p-4 whitespace-nowrap">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleProductVisibility(product, 'display_in_menu')}
                                                className={`p-1.5 rounded-md transition-colors ${product.display_in_menu !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                                                title="Hiển thị trên Menu Khách"
                                            >
                                                Menu
                                            </button>
                                            <button
                                                onClick={() => toggleProductVisibility(product, 'display_in_pos')}
                                                className={`p-1.5 rounded-md transition-colors ${product.display_in_pos !== false ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}
                                                title="Hiển thị trên POS"
                                            >
                                                POS
                                            </button>
                                        </div>
                                    </td> */}
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

            {/* Options Modal */}
            {
                isOptionsModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Settings2 className="text-amber-600" />
                                    Quản lý Tùy chọn Món (Size, Topping)
                                </h2>
                                <button
                                    onClick={() => setIsOptionsModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-slate-50/50">
                                <ProductOptionsSettings />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Menu Visibility Config Modal */}
            <MenuVisibilityConfig
                isOpen={isVisibilityConfigOpen}
                onClose={() => setIsVisibilityConfigOpen(false)}
                onSave={loadData}
            />

            {/* Language Modal */}
            {
                isLanguageModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Globe className="text-blue-600" />
                                    Cấu hình Ngôn ngữ
                                </h2>
                                <button
                                    onClick={() => setIsLanguageModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
                                <LanguageSettings />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Product Modal */}
            {
                isProductModalOpen && (
                    <ProductForm
                        initialData={editingProduct || undefined}
                        categories={categories}
                        badges={badges}
                        stations={stations}
                        onSubmit={handleSaveProduct}
                        onCancel={() => setIsProductModalOpen(false)}
                    />
                )
            }

            {/* Combo Editor Modal */}
            {
                selectedComboProduct && (
                    <ComboEditor
                        isOpen={isComboEditorOpen}
                        onClose={() => setIsComboEditorOpen(false)}
                        comboProduct={selectedComboProduct}
                        allProducts={products}
                    />
                )
            }

            {/* Badge Manager Modal */}
            {
                isBadgeModalOpen && (
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
                )
            }

            {/* Category Manager Modal */}
            {
                isCategoryModalOpen && (
                    <CategoryManager
                        onClose={() => {
                            setIsCategoryModalOpen(false);
                            loadData(); // Reload data to reflect category changes
                        }}
                    />
                )
            }

            {/* Display Config Modal */}
            {
                isDisplayConfigOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Layout size={20} className="text-blue-600" />
                                    Cấu hình hiển thị cột
                                </h2>
                                <button onClick={() => setIsDisplayConfigOpen(false)}><X size={20} /></button>
                            </div>
                            <div className="p-4 space-y-3">
                                <p className="text-sm text-slate-500 mb-2">Chọn các cột bạn muốn hiển thị:</p>

                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenColumns.includes('image_url')}
                                        onChange={() => toggleColumn('image_url')}
                                        className="w-5 h-5 rounded text-blue-600"
                                    />
                                    <span className="font-medium">Hình ảnh món</span>
                                </label>

                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenColumns.includes('name_ja')}
                                        onChange={() => toggleColumn('name_ja')}
                                        className="w-5 h-5 rounded text-blue-600"
                                    />
                                    <span className="font-medium">Tên tiếng Nhật</span>
                                </label>

                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenColumns.includes('name_en')}
                                        onChange={() => toggleColumn('name_en')}
                                        className="w-5 h-5 rounded text-blue-600"
                                    />
                                    <span className="font-medium">Tên tiếng Anh</span>
                                </label>

                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!hiddenColumns.includes('badges')}
                                        onChange={() => toggleColumn('badges')}
                                        className="w-5 h-5 rounded text-blue-600"
                                    />
                                    <span className="font-medium">Badges (Nhãn)</span>
                                </label>
                            </div>
                            <div className="p-4 border-t bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setIsDisplayConfigOpen(false)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Confirm Modal */}
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

        </div >
    );
}
