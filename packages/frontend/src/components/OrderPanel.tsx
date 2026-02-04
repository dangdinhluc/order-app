import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import type { Table, Category, Product, Order, OrderItem, AddItemRequest } from '../services/api';
import {
    X, Trash2, Receipt, CreditCard,
    QrCode, Users, Clock, Percent, PlusCircle, Loader2, Edit3, Plus, Minus, Scissors, Check, Search, Bell, Printer
} from 'lucide-react';
import FullscreenCheckout from './FullscreenCheckout';
import ProductCard from './ProductCard';
import { printReceipt } from '../utils/printReceipt';
import { useToast } from './Toast';


interface OrderPanelProps {
    table: Table;
    categories: Category[];
    products: Product[];
    onClose: () => void;
    orderType?: 'dine_in' | 'takeaway' | 'retail';
}

export default function OrderPanel({ table, categories, products, onClose, orderType = 'dine_in' }: OrderPanelProps) {
    // Helper to detect if this is a virtual table (takeaway/retail or selected from order list)
    const isVirtualTable = table.id.startsWith('takeaway-') || table.id.startsWith('retail-') || table.id.startsWith('order-');
    const toast = useToast();
    const [order, setOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showOpenItem, setShowOpenItem] = useState(false);
    const [openItemName, setOpenItemName] = useState('');
    const [openItemPrice, setOpenItemPrice] = useState('');
    const [openItemToKitchen, setOpenItemToKitchen] = useState(true);
    const [showPayment, setShowPayment] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    // Product modal states (for adding with note)
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productNote, setProductNote] = useState('');
    // Discount modal states
    const [showDiscount, setShowDiscount] = useState(false);
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
    const [discountValue, setDiscountValue] = useState('');
    const [discountReason, setDiscountReason] = useState('');
    // Split bill states
    const [splitMode, setSplitMode] = useState(false);
    const [selectedSplitItems, setSelectedSplitItems] = useState<Set<string>>(new Set());
    const [isSplitting, setIsSplitting] = useState(false);
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    // Kitchen send state
    const [isSendingToKitchen, setIsSendingToKitchen] = useState(false);
    // Edit item note state
    const [editingItemNote, setEditingItemNote] = useState<{ id: string; note: string; productName: string } | null>(null);
    // Mobile cart visibility
    const [showCart, setShowCart] = useState(false);
    // PIN verification for editing paid/cancelled orders
    const [pinVerified, setPinVerified] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    // Flag to prevent auto-create order during close (to avoid race condition)
    const isClosingRef = useRef(false);
    // Debt order state
    const [isMarkingDebt, setIsMarkingDebt] = useState(false);
    const [showDebtModal, setShowDebtModal] = useState(false);
    const [debtNote, setDebtNote] = useState('');
    // Refs to access current state in cleanup useEffect (closures would capture stale values)
    const orderRef = useRef<Order | null>(null);
    const orderItemsRef = useRef<OrderItem[]>([]);


    // Keep refs in sync with state
    useEffect(() => {
        orderRef.current = order;
    }, [order]);

    useEffect(() => {
        orderItemsRef.current = orderItems;
    }, [orderItems]);

    // Cleanup: delete empty virtual table orders when component unmounts
    useEffect(() => {
        return () => {
            // Only cleanup for virtual tables
            if (isVirtualTable && orderRef.current && orderItemsRef.current.length === 0) {
                // Fire and forget - we're unmounting so can't await
                api.deleteEmptyOrder(orderRef.current.id)
                    .then(() => console.log('Cleanup: auto-deleted empty order:', orderRef.current?.id))
                    .catch((err) => console.warn('Cleanup: could not delete empty order:', err));
            }
        };
    }, [isVirtualTable]); // isVirtualTable is stable for the component lifetime

    useEffect(() => {
        loadOrder();
    }, [table.id]);

    // NOTE: No auto-create - user clicks button to create order (prevents ghost orders)

    const loadOrder = async () => {
        setIsLoading(true);
        try {
            // First priority: if we already have an order, reload it (important for virtual tables)
            if (order?.id) {
                const response = await api.getOrder(order.id);
                if (response.data) {
                    setOrder(response.data.order);
                    setOrderItems(response.data.order.items || []);
                }
            }
            // Second priority: if table has current order, load it
            else if (table.current_order_id) {
                const response = await api.getOrder(table.current_order_id);
                if (response.data) {
                    setOrder(response.data.order);
                    setOrderItems(response.data.order.items || []);
                }
            } else if (table.status === 'available' && !isVirtualTable) {
                // Only reset for real tables that don't have an order
                // For virtual tables, the auto-create useEffect will handle it
                setOrder(null);
                setOrderItems([]);
            }
        } catch (error) {
            console.error('Error loading order:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle close with auto-delete for empty virtual table orders
    const handleClose = async () => {
        // Set flag to prevent useEffect from auto-creating a new order
        isClosingRef.current = true;

        // If this is a virtual table (takeaway/retail) and order exists but has no items, delete it
        if (isVirtualTable && order && orderItems.length === 0) {
            try {
                await api.deleteEmptyOrder(order.id);
                console.log('Auto-deleted empty order:', order.id);
                // Clear refs to prevent double-delete in cleanup effect
                orderRef.current = null;
                orderItemsRef.current = [];
            } catch (error) {
                // Silently ignore errors (order might have items added by another user, etc.)
                console.warn('Could not delete empty order:', error);
            }
        }
        onClose();
    };

    const handleOpenTable = async () => {
        try {
            setIsLoading(true);

            if (isVirtualTable) {
                // For takeaway/retail, create order directly without opening a table
                const orderResponse = await api.createOrder(undefined, orderType);
                if (orderResponse.data) {
                    setOrder(orderResponse.data.order);
                    setOrderItems([]);
                }
            } else {
                // For dine_in, open table first then create order
                await api.openTable(table.id);
                const orderResponse = await api.createOrder(table.id, orderType);
                if (orderResponse.data) {
                    setOrder(orderResponse.data.order);
                    setOrderItems([]);
                }
            }
        } catch (error) {
            console.error('Error opening table/order:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper: Check if order requires PIN for editing (paid/cancelled orders)
    const requirePinForEdit = (action: () => void) => {
        if (!order) return;

        // Open orders can be edited freely
        if (order.status === 'open') {
            action();
            return;
        }

        // Paid/cancelled orders require PIN verification
        if (pinVerified) {
            action();
            return;
        }

        // Show PIN modal and store the pending action
        setPendingAction(() => action);
        setShowPinModal(true);
    };

    // Verify PIN and execute pending action
    const handleVerifyPinAndExecute = async () => {
        try {
            const response = await api.verifyPin(pinInput);
            if (response.data?.verified) {
                setPinVerified(true);
                setShowPinModal(false);
                setPinInput('');
                // Execute the pending action
                if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                }
            } else {
                toast.error('PIN không đúng', 'Vui lòng nhập lại PIN chính xác');
            }
        } catch {
            toast.error('PIN không đúng', 'Vui lòng nhập lại PIN chính xác');
        }
    };

    // Print receipt for paid orders
    const handlePrintReceipt = () => {
        if (!order) return;

        const storeSettings = {
            store_name: 'Hybrid POS',
            store_name_ja: 'ハイブリッドPOS',
            address: '',
            phone: '',
            tax_rate: 10,
            currency: 'JPY',
        };
        const receiptSettings = {
            logo_url: '',
            header_text: 'Cảm ơn quý khách!',
            footer_text: 'Hẹn gặp lại!',
            show_table_time: true,
            show_order_number: true,
            font_size: 'medium' as const,
        };
        const printerSettings = {
            printer_type: 'browser' as const,
            paper_width: '80mm' as const,
        };

        printReceipt({
            order: {
                ...order,
                order_number: String(order.order_number),
                total: Number(order.total),
            },
            items: orderItems.map(i => ({
                id: i.id,
                product_id: i.product_id,
                product_name_vi: i.product_name_vi,
                product_name_ja: i.product_name_ja,
                open_item_name: i.open_item_name,
                quantity: i.quantity,
                unit_price: Number(i.unit_price),
                note: i.note,
            })),
            storeSettings,
            receiptSettings,
            printerSettings,
        });
    };

    // Quick add product (single click) - internal implementation
    const doQuickAddProduct = async (product: Product) => {
        if (!order) return;

        try {
            const itemData: AddItemRequest = {
                product_id: product.id,
                quantity: 1,
            };

            const response = await api.addOrderItem(order.id, itemData);
            if (response.data) {
                setOrderItems(prev => [...prev, response.data!.item]);
                const orderResponse = await api.getOrder(order.id);
                if (orderResponse.data) {
                    setOrder(orderResponse.data.order);
                }
            }
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    // Quick add with PIN check for non-open orders
    const handleQuickAddProduct = (product: Product) => {
        requirePinForEdit(() => doQuickAddProduct(product));
    };

    // Update quantity - internal implementation
    const doUpdateQuantity = async (item: OrderItem, quantity: number) => {
        if (!order || quantity < 1) return;
        try {
            await api.updateOrderItem(order.id, item.id, { quantity });
            setOrderItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity } : i));
            const res = await api.getOrder(order.id);
            if (res.data) setOrder(res.data.order);
        } catch (error) {
            console.error('Error updating quantity:', error);
        }
    };

    // Update quantity with PIN check
    const handleUpdateQuantity = (item: OrderItem, quantity: number) => {
        requirePinForEdit(() => doUpdateQuantity(item, quantity));
    };

    const calculateTemporaryTotal = () => {
        return orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    };

    const handleNoteOrder = () => {
        // Placeholder for order-level note
        toast.info('Đang phát triển', 'Chức năng ghi chú đơn hàng sẽ sớm ra mắt');
    };

    const handleEditNote = (item: OrderItem) => {
        setEditingItemNote({
            id: item.id,
            note: item.note || '',
            productName: item.product_name_vi || item.open_item_name || 'Món'
        });
    };

    const handleSaveNote = async () => {
        if (!order || !editingItemNote) return;
        try {
            await api.updateOrderItem(order.id, editingItemNote.id, { note: editingItemNote.note });

            // Update local state
            setOrderItems(prev => prev.map(i =>
                i.id === editingItemNote.id ? { ...i, note: editingItemNote.note } : i
            ));

            // Close modal
            setEditingItemNote(null);
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };


    // Open modal for adding with note (double click or long press)
    const handleOpenProductModal = (product: Product) => {
        setSelectedProduct(product);
        setProductQuantity(1);
        setProductNote('');
        setShowProductModal(true);
    };

    // Add product with quantity and note
    const handleAddProductWithNote = async () => {
        if (!order || !selectedProduct) return;

        try {
            const itemData: AddItemRequest = {
                product_id: selectedProduct.id,
                quantity: productQuantity,
                note: productNote || undefined,
            };

            const response = await api.addOrderItem(order.id, itemData);
            if (response.data) {
                setOrderItems(prev => [...prev, response.data!.item]);
                const orderResponse = await api.getOrder(order.id);
                if (orderResponse.data) {
                    setOrder(orderResponse.data.order);
                }
            }
            // Close modal
            setShowProductModal(false);
            setSelectedProduct(null);
            setProductNote('');
            setProductQuantity(1);
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    // Apply discount to order
    const handleApplyDiscount = async () => {
        if (!order || !discountValue) return;

        try {
            const response = await api.applyDiscount(
                order.id,
                discountType,
                parseFloat(discountValue),
                discountReason || undefined
            );

            if (response.data) {
                setOrder(response.data.order);
            }
            // Close modal
            setShowDiscount(false);
            setDiscountValue('');
            setDiscountReason('');
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: { code?: string } } } };
            if (err.response?.data?.error?.code === 'PIN_REQUIRED') {
                toast.warning('Cần xác thực', 'Giảm giá > 10% cần nhập PIN Manager');
            } else {
                console.error('Error applying discount:', error);
            }
        }
    };

    // Toggle split item selection
    const toggleSplitItem = (itemId: string) => {
        setSelectedSplitItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Execute split bill
    const handleSplitBill = async () => {
        if (!order || selectedSplitItems.size === 0) return;

        setIsSplitting(true);
        try {
            const response = await api.splitOrder(order.id, Array.from(selectedSplitItems));
            if (response.data) {
                // Reload current order
                const orderResponse = await api.getOrder(order.id);
                if (orderResponse.data) {
                    setOrder(orderResponse.data.order);
                    setOrderItems(orderResponse.data.order.items || []);
                }
                // Reset split mode
                setSplitMode(false);
                setSelectedSplitItems(new Set());
                toast.success('Tách bill thành công!', `Đã tách ${selectedSplitItems.size} món sang bill mới (¥${Math.round(response.data.new_order.total || 0).toLocaleString()})`);
            }
        } catch (error) {
            console.error('Error splitting order:', error);
            toast.error('Không thể tách bill', 'Vui lòng thử lại sau');
        } finally {
            setIsSplitting(false);
        }
    };

    // Calculate split total
    const splitTotal = orderItems
        .filter(item => selectedSplitItems.has(item.id))
        .reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    const handleAddOpenItem = async () => {
        if (!order || !openItemName || !openItemPrice) return;

        try {
            const itemData: AddItemRequest = {
                open_item_name: openItemName,
                open_item_price: parseFloat(openItemPrice),
                display_in_kitchen: openItemToKitchen,
                quantity: 1,
            };

            const response = await api.addOrderItem(order.id, itemData);
            if (response.data) {
                setOrderItems(prev => [...prev, response.data!.item]);
                // Reload order
                const orderResponse = await api.getOrder(order.id);
                if (orderResponse.data) {
                    setOrder(orderResponse.data.order);
                }
            }

            // Reset form
            setOpenItemName('');
            setOpenItemPrice('');
            setShowOpenItem(false);
        } catch (error) {
            console.error('Error adding open item:', error);
        }
    };

    // Remove item - internal implementation
    const doRemoveItem = async (itemId: string) => {
        if (!order) return;

        try {
            await api.removeOrderItem(order.id, itemId);
            setOrderItems(prev => prev.filter(item => item.id !== itemId));
            // Reload order
            const orderResponse = await api.getOrder(order.id);
            if (orderResponse.data) {
                setOrder(orderResponse.data.order);
            }
        } catch (error) {
            console.error('Error removing item:', error);
        }
    };

    // Remove item with PIN check
    const handleRemoveItem = (itemId: string) => {
        requirePinForEdit(() => doRemoveItem(itemId));
    };

    const handlePayment = async (method: string) => {
        if (!order) return;

        try {
            await api.payOrder(order.id, [
                { method, amount: order.total }
            ]);
            await api.closeTable(table.id);
            onClose();
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    };

    // Send pending items to kitchen
    const handleSendToKitchen = async () => {
        if (!order) return;

        setIsSendingToKitchen(true);
        try {
            const response = await api.sendToKitchen(order.id);
            if (response.data?.sent_count && response.data.sent_count > 0) {
                // Reload order items to get updated kitchen_status
                await loadOrder();
            }
        } catch (error) {
            console.error('Error sending to kitchen:', error);
        } finally {
            setIsSendingToKitchen(false);
        }
    };

    // Count pending kitchen items
    const pendingKitchenCount = useMemo(() => {
        return orderItems.filter(
            item => item.display_in_kitchen && item.kitchen_status === 'pending'
        ).length;
    }, [orderItems]);

    // Filter products by category and search query
    const filteredProducts = useMemo(() => {
        let result = products.filter(p => p.is_available);

        if (selectedCategory) {
            result = result.filter(p => p.category_id === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name_vi.toLowerCase().includes(query) ||
                p.name_ja?.toLowerCase().includes(query) ||
                p.sku?.toLowerCase().includes(query)
            );
        }

        return result;
        return result;
    }, [products, selectedCategory, searchQuery]);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            // Find exact match SKU or Name
            const exactMatch = products.find(p =>
                (p.sku && p.sku.toLowerCase() === query) ||
                p.name_vi.toLowerCase() === query
            );

            if (exactMatch && exactMatch.is_available) {
                handleQuickAddProduct(exactMatch);
                setSearchQuery('');
            } else if (filteredProducts.length === 1 && filteredProducts[0].is_available) {
                // If search yields exactly one result (e.g. unique partial match), auto add
                handleQuickAddProduct(filteredProducts[0]);
                setSearchQuery('');
            }
        }
    };

    // If table is available, show open button
    if (table.status === 'available' && !order) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8">
                <div className="text-center">
                    <div className={`w-20 h-20 ${isVirtualTable ? 'bg-orange-100' : 'bg-emerald-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Users size={40} className={isVirtualTable ? 'text-orange-600' : 'text-emerald-600'} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{table.name}</h3>
                    <p className="text-slate-500 mb-6">
                        {isVirtualTable
                            ? 'Tạo đơn hàng mới để bắt đầu.'
                            : 'Bàn đang trống. Mở bàn để bắt đầu order.'}
                    </p>
                    <button
                        onClick={handleOpenTable}
                        disabled={isLoading}
                        className={`px-6 py-3 ${isVirtualTable ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-semibold rounded-xl transition disabled:opacity-50`}
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (isVirtualTable ? 'Tạo đơn mới' : 'Mở bàn')}
                    </button>
                </div>
            </div>
        );
    }

    // Check if showing "Table Map" vs "Order View".
    // Actually OrderPanel is only shown when table selected.
    // We implement the 2-column layout here.

    return (
        <div className="flex h-full bg-slate-100 overflow-hidden relative">
            {/* LEFT COLUMN: Product List */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
                {/* Header: Categories & Search */}
                <div className="bg-white p-3 border-b border-slate-200 flex flex-col gap-3">
                    {/* Search & Info */}
                    <div className="flex justify-between items-center gap-3">
                        <h2 className="font-bold text-lg text-slate-800 flex-shrink-0">
                            {table.name}
                            <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {categories.find(c => c.id === selectedCategory)?.name_vi || 'Tất cả'}
                            </span>
                        </h2>
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Tìm món (Tên/SKU)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Categories Scroll */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedCategory
                                ? 'bg-blue-600 text-white shadow-blue-200 shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Tất cả
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white shadow-blue-200 shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {cat.name_vi}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProducts.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onQuickAdd={handleQuickAddProduct}
                                onEdit={handleOpenProductModal}
                            />
                        ))}

                        {/* Open Item Card */}
                        <button
                            onClick={() => setShowOpenItem(true)}
                            className="flex flex-col items-center justify-center p-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group aspect-square md:aspect-auto md:h-[80px]"
                        >
                            <PlusCircle className="text-slate-400 group-hover:text-blue-500 mb-1" size={24} />
                            <span className="text-xs font-medium text-slate-500 group-hover:text-blue-600">Món ngoài menu</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* FLOATING CART BUTTON - Mobile only (hidden on md+) */}
            <button
                onClick={() => setShowCart(true)}
                className="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-400/50 flex items-center justify-center active:scale-95 transition-transform"
            >
                <Receipt size={24} />
                {orderItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                        {orderItems.length}
                    </span>
                )}
            </button>

            {/* Mobile Cart Overlay */}
            {showCart && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-50"
                    onClick={() => setShowCart(false)}
                />
            )}

            {/* RIGHT COLUMN: Cart - Slide from right on mobile only */}
            <div className={`
                fixed md:relative inset-y-0 right-0 z-50
                w-full max-w-[400px] md:w-[380px]
                flex flex-col bg-white h-full shadow-xl
                transform transition-transform duration-300 ease-out
                ${showCart ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
            `}>
                {/* Cart Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mb-0.5">
                            <Clock size={14} />
                            {order && <span className="ml-1">{new Date(order.created_at || Date.now()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Order #{order?.order_number || 'New'}</h2>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                if (order) {
                                    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/receipt/${order.id}/print?type=preliminary`, '_blank');
                                }
                            }}
                            disabled={!order || orderItems.length === 0}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-700 font-medium transition text-xs disabled:opacity-50"
                        >
                            <Receipt size={16} />
                            <span>In tạm tính</span>
                        </button>
                        <button
                            onClick={() => {
                                if (window.innerWidth < 768) {
                                    setShowCart(false);
                                } else {
                                    handleClose();
                                }
                            }}
                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {orderItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            {/* ShoppingCart requires import but we can use Receipt or Package */}
                            <Receipt size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">Chưa có món nào</p>
                            <p className="text-sm">Thêm món từ menu bên trái</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orderItems.map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => splitMode && toggleSplitItem(item.id)}
                                    className={`flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 transition-all ${splitMode
                                        ? selectedSplitItems.has(item.id)
                                            ? 'bg-blue-50 -mx-2 px-2 rounded-lg'
                                            : 'hover:bg-slate-50 cursor-pointer -mx-2 px-2 rounded-lg'
                                        : 'group relative hover:bg-slate-50 -mx-2 px-2 rounded-lg'
                                        }`}
                                >
                                    {splitMode && (
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${selectedSplitItems.has(item.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                                            {selectedSplitItems.has(item.id) && <Check size={14} strokeWidth={3} />}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="font-semibold text-slate-800 text-sm truncate">{item.product_name_vi || item.open_item_name}</p>
                                            {/* Kitchen Status Badge */}
                                            {item.display_in_kitchen ? (
                                                item.kitchen_status === 'pending' ? (
                                                    <span className="w-2 h-2 rounded-full bg-amber-400" title="Chờ gửi bếp"></span>
                                                ) : item.kitchen_status === 'preparing' ? (
                                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Đang nấu"></span>
                                                ) : item.kitchen_status === 'ready' ? (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Sẵn sàng"></span>
                                                ) : null
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <p className="text-slate-500">¥{item.unit_price?.toLocaleString()}</p>

                                            {item.note && (
                                                <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[120px] truncate">
                                                    <Edit3 size={10} /> {item.note}
                                                </span>
                                            )}

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditNote(item); }}
                                                className="text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Sửa ghi chú"
                                            >
                                                <Edit3 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {!splitMode && (
                                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item, item.quantity - 1); }}
                                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm rounded-md transition"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="font-bold text-slate-700 w-6 text-center text-sm">{item.quantity}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(item, item.quantity + 1); }}
                                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm rounded-md transition"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    )}

                                    <div className="text-right ml-1">
                                        <p className="font-bold text-slate-900 text-sm">¥{(item.unit_price * item.quantity).toLocaleString()}</p>
                                        {!splitMode && item.kitchen_status === 'pending' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                title="Xóa món"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Split Mode Actions */}
                {splitMode && (
                    <div className="p-4 bg-blue-50 border-t border-blue-200 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-blue-800 font-bold text-lg">
                            <span>Tổng tách</span>
                            <span>¥{splitTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSplitMode(false)}
                                className="flex-1 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSplitBill}
                                disabled={selectedSplitItems.size === 0 || isSplitting}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSplitting ? <Loader2 className="animate-spin" /> : <Scissors size={18} />}
                                Tách bill
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer: Totals & Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-slate-500 text-sm">Tổng cộng</span>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-slate-900">
                                ¥{(order ? Number(order.total) : calculateTemporaryTotal()).toLocaleString()}
                            </div>
                            {(order?.discount_amount || 0) > 0 && (
                                <div className="text-xs text-red-500">Giảm: -¥{Number(order?.discount_amount || 0).toLocaleString()}</div>
                            )}
                        </div>
                    </div>

                    {/* Action buttons - only show for open orders */}
                    {order?.status === 'open' ? (
                        <div className="flex flex-col gap-3">
                            {/* Utility Row - Secondary Actions */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setSplitMode(true)}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
                                >
                                    <Scissors size={16} />
                                    <span className="text-sm font-medium">Tách</span>
                                </button>
                                <button
                                    onClick={handleNoteOrder}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
                                >
                                    <Edit3 size={16} />
                                    <span className="text-sm font-medium">Ghi chú</span>
                                </button>
                                <button
                                    onClick={() => setShowDebtModal(true)}
                                    disabled={!order || orderItems.length === 0}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                                >
                                    <CreditCard size={16} />
                                    <span className="text-sm font-medium">Ghi nợ</span>
                                </button>
                            </div>

                            {/* Primary Action Row */}
                            <div className="grid grid-cols-5 gap-2 h-14">
                                {/* GỬI BẾP Button - 2 cols */}
                                <button
                                    onClick={handleSendToKitchen}
                                    disabled={!order || pendingKitchenCount === 0 || isSendingToKitchen}
                                    className="col-span-2 flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 transition relative font-bold shadow-md shadow-orange-100"
                                >
                                    {isSendingToKitchen ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <Bell size={24} />
                                    )}
                                    <span className="text-sm">GỬI BẾP</span>
                                    {pendingKitchenCount > 0 && (
                                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                            {pendingKitchenCount}
                                        </span>
                                    )}
                                </button>

                                {/* THANH TOÁN Button - 3 cols */}
                                <button
                                    onClick={() => setShowCheckout(true)}
                                    disabled={!order || orderItems.length === 0}
                                    className="col-span-3 bg-indigo-600 text-white rounded-xl flex flex-col items-center justify-center hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed transition shadow-md shadow-indigo-200"
                                >
                                    <span className="text-base font-bold">THANH TOÁN</span>
                                    {order && <span className="text-xs opacity-90 font-medium">¥{Number(order.total).toLocaleString()}</span>}
                                </button>
                            </div>
                        </div>
                    ) : order ? (
                        /* Show status badge for completed orders */
                        <div className="flex items-center justify-center gap-3 py-3">
                            {order.status === 'paid' && (
                                <>
                                    <div className="flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-xl">
                                        <span className="text-lg">✅</span>
                                        <span className="font-bold">ĐÃ THANH TOÁN</span>
                                        <span className="text-sm opacity-75">¥{Number(order.total).toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={handlePrintReceipt}
                                        className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                                    >
                                        <Printer size={20} />
                                        <span className="font-medium">In hóa đơn</span>
                                    </button>
                                </>
                            )}
                            {order.status === 'cancelled' && (
                                <div className="flex items-center gap-2 px-6 py-3 bg-red-100 text-red-700 rounded-xl">
                                    <span className="text-lg">❌</span>
                                    <span className="font-bold">ĐÃ HỦY</span>
                                </div>
                            )}
                            {order.status === 'debt' && (
                                <>
                                    <div className="flex items-center gap-2 px-6 py-3 bg-amber-100 text-amber-700 rounded-xl">
                                        <span className="text-lg">💳</span>
                                        <span className="font-bold">KHÁCH NỢ</span>
                                        <span className="text-sm opacity-75">¥{Number(order.total).toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={() => setShowCheckout(true)}
                                        className="flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
                                    >
                                        <CreditCard size={20} />
                                        <span className="font-medium">Thu tiền</span>
                                    </button>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>


            {/* Open Item Modal */}
            {showOpenItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-4">Thêm món mở</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên món</label>
                                <input
                                    type="text"
                                    value={openItemName}
                                    onChange={(e) => setOpenItemName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                    placeholder="VD: Rau luộc thêm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Giá (¥)</label>
                                <input
                                    type="number"
                                    value={openItemPrice}
                                    onChange={(e) => setOpenItemPrice(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                    placeholder="300"
                                />
                            </div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={openItemToKitchen}
                                    onChange={(e) => setOpenItemToKitchen(e.target.checked)}
                                    className="w-4 h-4 text-blue-700 rounded"
                                />
                                <span className="text-sm text-slate-700">Gửi đến bếp</span>
                            </label>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                onClick={() => setShowOpenItem(false)}
                                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddOpenItem}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Thêm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Modal - Add with quantity and note */}
            {showProductModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-1">{selectedProduct.name_vi}</h3>
                        <p className="text-sm text-slate-500 mb-4">{selectedProduct.name_ja}</p>

                        {/* Quantity */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Số lượng</label>
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setProductQuantity(q => Math.max(1, q - 1))}
                                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
                                >
                                    <Minus size={20} />
                                </button>
                                <span className="text-3xl font-bold w-16 text-center">{productQuantity}</span>
                                <button
                                    onClick={() => setProductQuantity(q => q + 1)}
                                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Note input */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú</label>
                            <input
                                type="text"
                                value={productNote}
                                onChange={(e) => setProductNote(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                placeholder="VD: Ít cay, không hành..."
                            />
                            {/* Quick note buttons */}
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['Ít cay', 'Không hành', 'Thêm rau', 'Nước riêng', 'Ít đường'].map(note => (
                                    <button
                                        key={note}
                                        onClick={() => setProductNote(prev => prev ? `${prev}, ${note}` : note)}
                                        className="px-3 py-1 text-xs bg-slate-100 hover:bg-blue-50 rounded-full text-slate-600 transition"
                                    >
                                        + {note}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Total */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 flex justify-between items-center">
                            <span className="text-slate-600">Thành tiền</span>
                            <span className="text-xl font-bold text-blue-700">
                                ¥{(selectedProduct.price * productQuantity).toLocaleString()}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowProductModal(false);
                                    setSelectedProduct(null);
                                    setProductNote('');
                                    setProductQuantity(1);
                                }}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddProductWithNote}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-lg shadow-blue-200"
                            >
                                Thêm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Note Modal */}
            {editingItemNote && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold mb-1">Ghi chú món ăn</h3>
                        <p className="text-sm text-slate-500 mb-4">{editingItemNote.productName}</p>

                        <div className="mb-4">
                            <input
                                type="text"
                                value={editingItemNote.note}
                                onChange={(e) => setEditingItemNote({ ...editingItemNote, note: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none font-medium"
                                placeholder="Nhập ghi chú (VD: Ít cay, không hành...)"
                                autoFocus
                            />
                            {/* Quick note buttons */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {['Ít cay', 'Không hành', 'Thêm rau', 'Nước riêng', 'Không đá', 'Ít ngọt'].map(note => (
                                    <button
                                        key={note}
                                        onClick={() => setEditingItemNote(prev => prev ? {
                                            ...prev,
                                            note: prev.note ? `${prev.note}, ${note}` : note
                                        } : null)}
                                        className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-blue-50 rounded-lg text-slate-600 transition border border-transparent hover:border-blue-200"
                                    >
                                        + {note}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setEditingItemNote(prev => prev ? { ...prev, note: '' } : null)}
                                    className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition border border-transparent hover:border-red-200 ml-auto"
                                >
                                    Xóa ghi chú
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEditingItemNote(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveNote}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200"
                            >
                                Lưu ghi chú
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Discount Modal */}
            {
                showDiscount && order && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-lg font-bold mb-4">Giảm giá</h3>

                            {/* Type toggle */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setDiscountType('percent')}
                                    className={`flex-1 py-2 rounded-lg font-medium transition ${discountType === 'percent'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                        }`}
                                >
                                    % Phần trăm
                                </button>
                                <button
                                    onClick={() => setDiscountType('fixed')}
                                    className={`flex-1 py-2 rounded-lg font-medium transition ${discountType === 'fixed'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-700'
                                        }`}
                                >
                                    ¥ Cố định
                                </button>
                            </div>

                            {/* Value input */}
                            <div className="mb-4">
                                <input
                                    type="number"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                    className="w-full px-4 py-3 text-2xl text-center border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                    placeholder={discountType === 'percent' ? '10' : '500'}
                                />
                                <p className="text-center text-sm text-slate-500 mt-1">
                                    {discountType === 'percent'
                                        ? `Giảm: ¥${discountValue ? Math.round(order.subtotal * parseFloat(discountValue) / 100).toLocaleString() : 0}`
                                        : `Giảm: ¥${discountValue ? parseInt(discountValue).toLocaleString() : 0}`
                                    }
                                </p>
                            </div>

                            {/* Quick discount buttons */}
                            <div className="flex gap-2 mb-4">
                                {discountType === 'percent'
                                    ? ['5', '10', '15', '20'].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setDiscountValue(v)}
                                            className="flex-1 py-2 bg-slate-100 hover:bg-blue-50 rounded-lg text-slate-700 font-medium"
                                        >
                                            {v}%
                                        </button>
                                    ))
                                    : ['100', '200', '500', '1000'].map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setDiscountValue(v)}
                                            className="flex-1 py-2 bg-slate-100 hover:bg-blue-50 rounded-lg text-slate-700 font-medium"
                                        >
                                            ¥{v}
                                        </button>
                                    ))
                                }
                            </div>

                            {/* Reason */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={discountReason}
                                    onChange={(e) => setDiscountReason(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                                    placeholder="Lý do giảm giá (tùy chọn)"
                                />
                            </div>

                            {/* Warning for > 10% */}
                            {discountType === 'percent' && parseFloat(discountValue) > 10 && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                                    ⚠️ Giảm giá &gt; 10% cần xác nhận PIN Manager
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowDiscount(false);
                                        setDiscountValue('');
                                        setDiscountReason('');
                                    }}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleApplyDiscount}
                                    disabled={!discountValue}
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50"
                                >
                                    Áp dụng
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Payment Modal */}
            {
                showPayment && order && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-lg font-bold mb-2">Thanh toán</h3>
                            <p className="text-3xl font-bold text-blue-700 mb-6">¥{order.total?.toLocaleString()}</p>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handlePayment('cash')}
                                    className="p-4 bg-emerald-100 hover:bg-emerald-200 rounded-xl text-center transition"
                                >
                                    <span className="text-2xl block mb-1">💴</span>
                                    <span className="font-medium text-emerald-700">Tiền mặt</span>
                                </button>
                                <button
                                    onClick={() => handlePayment('card')}
                                    className="p-4 bg-blue-100 hover:bg-blue-200 rounded-xl text-center transition"
                                >
                                    <span className="text-2xl block mb-1">💳</span>
                                    <span className="font-medium text-blue-700">Thẻ</span>
                                </button>
                                <button
                                    onClick={() => handlePayment('paypay')}
                                    className="p-4 bg-red-100 hover:bg-red-200 rounded-xl text-center transition"
                                >
                                    <span className="text-2xl block mb-1">📱</span>
                                    <span className="font-medium text-red-700">PayPay</span>
                                </button>
                                <button
                                    onClick={() => handlePayment('linepay')}
                                    className="p-4 bg-green-100 hover:bg-green-200 rounded-xl text-center transition"
                                >
                                    <span className="text-2xl block mb-1">💚</span>
                                    <span className="font-medium text-green-700">LinePay</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setShowPayment(false)}
                                className="w-full mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Checkout Modal */}
            {
                showCheckout && order && (
                    <FullscreenCheckout
                        order={order}
                        items={orderItems}
                        tableName={table.name}
                        onClose={() => setShowCheckout(false)}
                        onSuccess={() => {
                            // Don't auto-close table - let backend handle session management
                            // Split orders may still exist, table map will refresh and show remaining orders
                            setShowCheckout(false);
                            onClose();
                        }}
                    />
                )
            }

            {/* PIN Verification Modal for editing paid/cancelled orders */}
            {showPinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                🔒 Xác thực để chỉnh sửa
                            </h3>
                            <button
                                onClick={() => { setShowPinModal(false); setPinInput(''); setPendingAction(null); }}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 mb-4">
                            Đơn hàng đã hoàn thành. Nhập PIN quản lý để chỉnh sửa.
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Nhập PIN quản lý *</label>
                            <input
                                type="password"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                placeholder="Nhập PIN 6 số"
                                maxLength={6}
                                autoFocus
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && pinInput.length === 6) {
                                        handleVerifyPinAndExecute();
                                    }
                                }}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowPinModal(false); setPinInput(''); setPendingAction(null); }}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleVerifyPinAndExecute}
                                disabled={pinInput.length !== 6}
                                className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Debt Modal - Mark order as debt */}
            {showDebtModal && order && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                💳 Đánh dấu Khách Nợ
                            </h3>
                            <button
                                onClick={() => { setShowDebtModal(false); setDebtNote(''); }}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-amber-700 font-medium">Tổng tiền nợ:</span>
                                <span className="text-2xl font-bold text-amber-700">¥{Number(order.total).toLocaleString()}</span>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mb-4">
                            Bàn sẽ được reset về trống. Khách có thể thanh toán sau từ mục "Orders Nợ".
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Ghi chú (tên khách, SĐT...)</label>
                            <input
                                type="text"
                                value={debtNote}
                                onChange={(e) => setDebtNote(e.target.value)}
                                placeholder="VD: Anh Tuấn - 090xxx"
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDebtModal(false); setDebtNote(''); }}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={async () => {
                                    if (!order) return;
                                    setIsMarkingDebt(true);
                                    try {
                                        await api.markOrderAsDebt(order.id, debtNote || undefined);
                                        setShowDebtModal(false);
                                        setDebtNote('');
                                        onClose(); // Close and refresh table map
                                    } catch (error) {
                                        console.error('Failed to mark as debt:', error);
                                        toast.error('Không thể đánh dấu khách nợ', 'Vui lòng thử lại sau');
                                    } finally {
                                        setIsMarkingDebt(false);
                                    }
                                }}
                                disabled={isMarkingDebt}
                                className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isMarkingDebt ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                                Xác nhận Nợ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

