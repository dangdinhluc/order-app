import { offlineStore } from '../utils/offlineStore';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || '';
// API Service for Order App



export interface Language {
    code: string;
    name: string;
    flag_icon: string;
    is_active: boolean;
    is_default: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code: string;
    };
}

class ApiService {
    private token: string | null = null;

    constructor() {
        this.token = localStorage.getItem('token');
    }

    setToken(token: string | null) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const headers: HeadersInit = {
            ...(options.headers || {}),
        };

        // Auto set Content-Type to json if body is object and not FormData
        if (!(options.body instanceof FormData)) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        if (this.token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers,
                credentials: 'include',
            });

            // Handle non-JSON responses or empty responses
            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { success: response.ok };
            }

            if (!response.ok) {
                throw new Error(data.error?.message || 'An error occurred');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);

            // Fallback to offline storage for critical POST/PUT/DELETE requests
            const isCriticalAction = options.method && ['POST', 'PUT', 'DELETE'].includes(options.method);
            const isNetworkError = error instanceof TypeError && error.message === 'Failed to fetch';

            if (isCriticalAction && isNetworkError) {
                console.warn('📡 Network error detected. Saving request to offline queue...');
                const localId = uuidv4();
                await offlineStore.add({
                    localId,
                    endpoint,
                    method: options.method as string,
                    body: options.body ? JSON.parse(options.body as string) : null,
                });

                // Return a "fake" success to keep the UI running
                return {
                    success: true,
                    data: { offline: true, localId } as any
                };
            }

            throw error;
        }
    }

    // Upload
    getUploadUrl(path: string | undefined) {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${API_URL}${path}`;
    }

    async uploadImage(file: File) {
        const formData = new FormData();
        formData.append('image', file);
        return this.request<{ imageUrl: string }>('/api/products/upload', {
            method: 'POST',
            body: formData,
        });
    }

    // Auth
    async login(email: string, password: string) {
        const response = await this.request<{ token: string; user: User }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (response.data?.token) {
            this.setToken(response.data.token);
        }
        return response;
    }

    logout() {
        this.setToken(null);
    }

    // Categories
    async getCategories() {
        return this.request<{ categories: Category[] }>('/api/categories');
    }

    async createCategory(data: Partial<Category>) {
        return this.request<{ category: Category }>('/api/categories', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCategory(id: string, data: Partial<Category>) {
        return this.request<{ category: Category }>(`/api/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteCategory(id: string) {
        return this.request<{ message: string }>(`/api/categories/${id}`, {
            method: 'DELETE',
        });
    }

    // Products
    async getProducts(categoryId?: string) {
        const params = categoryId ? `?category_id=${categoryId}` : '';
        return this.request<{ products: Product[] }>(`/api/products${params}`);
    }

    async createProduct(data: Partial<Product>) {
        return this.request<{ product: Product }>('/api/products', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateProduct(id: string, data: Partial<Product>) {
        return this.request<{ product: Product }>(`/api/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteProduct(id: string) {
        return this.request<{ message: string }>(`/api/products/${id}`, {
            method: 'DELETE',
        });
    }

    async toggleProductAvailability(productId: string, isAvailable: boolean) {
        return this.request<{ product: Product }>(`/api/products/${productId}/availability`, {
            method: 'PATCH',
            body: JSON.stringify({ is_available: isAvailable }),
        });
    }

    // Users
    async getUsers() {
        return this.request<{ users: User[] }>('/api/users');
    }

    async createUser(data: Partial<User> & { password?: string, pin_code?: string }) {
        return this.request<{ user: User }>('/api/users', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateUser(id: string, data: Partial<User>) {
        return this.request<{ user: User }>(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(id: string) {
        return this.request<{ message: string }>(`/api/users/${id}`, {
            method: 'DELETE',
        });
    }

    async resetUserPin(id: string, pin_code: string) {
        return this.request<{ message: string }>(`/api/users/${id}/pin`, {
            method: 'PUT',
            body: JSON.stringify({ pin_code }),
        });
    }

    // Vouchers
    async getVouchers() {
        return this.request<{ vouchers: Voucher[] }>('/api/vouchers');
    }

    async createVoucher(data: CreateVoucherDTO) {
        return this.request<{ voucher: Voucher }>('/api/vouchers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async toggleVoucher(id: string) {
        return this.request<{ voucher: Voucher }>(`/api/vouchers/${id}/toggle`, {
            method: 'PATCH',
            body: JSON.stringify({}),
        });
    }

    // Areas & Tables Management
    async getAreas() {
        return this.request<{ areas: Area[] }>('/api/areas');
    }

    async createArea(data: CreateAreaDTO) {
        return this.request<{ area: Area }>('/api/areas', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateArea(id: string, data: CreateAreaDTO) {
        return this.request<{ area: Area }>(`/api/areas/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteArea(id: string) {
        return this.request<{ message: string }>(`/api/areas/${id}`, {
            method: 'DELETE',
        });
    }

    // Stations Management (Kitchen/Bar)
    async getStations() {
        return this.request<{ stations: Station[] }>('/api/stations');
    }

    async getActiveStations() {
        return this.request<{ stations: Station[] }>('/api/stations/active');
    }

    async createStation(data: Partial<Station>) {
        return this.request<{ station: Station }>('/api/stations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateStation(id: string, data: Partial<Station>) {
        return this.request<{ station: Station }>(`/api/stations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteStation(id: string) {
        return this.request<{ message: string }>(`/api/stations/${id}`, {
            method: 'DELETE',
        });
    }

    async createTable(data: CreateTableDTO) {
        return this.request<{ table: Table }>('/api/tables', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTable(id: string, data: UpdateTableDTO) {
        return this.request<{ table: Table }>(`/api/tables/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteTable(id: string) {
        return this.request<{ message: string }>(`/api/tables/${id}`, {
            method: 'DELETE',
        });
    }

    // Tables
    async getTables() {
        return this.request<{ tables: Table[] }>('/api/tables');
    }

    async openTable(tableId: string, customerCount = 1) {
        return this.request<{ session: TableSession; qr_token: string }>(`/api/tables/${tableId}/open`, {
            method: 'POST',
            body: JSON.stringify({ customer_count: customerCount }),
        });
    }

    async closeTable(tableId: string) {
        return this.request<void>(`/api/tables/${tableId}/close`, {
            method: 'POST',
        });
    }

    async transferTable(fromTableId: string, toTableId: string) {
        return this.request<{ new_token: string }>(`/api/tables/${fromTableId}/transfer`, {
            method: 'POST',
            body: JSON.stringify({ to_table_id: toTableId }),
        });
    }

    async mergeTables(targetTableId: string, fromTableId: string) {
        return this.request<void>(`/api/tables/${targetTableId}/merge`, {
            method: 'POST',
            body: JSON.stringify({ from_table_id: fromTableId }),
        });
    }

    async getTableQR(tableId: string) {
        return this.request<{ qr_url: string; token: string; table_number: number }>(`/api/tables/${tableId}/qr`);
    }

    async getQRCode(tableId: string) {
        return this.request<{ qrcode: string; url: string; table_id: string }>(`/api/qrcode/${tableId}`);
    }

    async getAllQRCodes() {
        return this.request<{ qrcodes: { table_id: string; table_number: number; table_name: string; qrcode: string; url: string }[] }>('/api/qrcode/batch/all');
    }

    // Orders
    async getOrders(params?: { status?: string; table_id?: string; date?: string; limit?: number }) {
        const queryParams: Record<string, string> = {};
        if (params?.status) queryParams.status = params.status;
        if (params?.table_id) queryParams.table_id = params.table_id;
        if (params?.date) queryParams.date = params.date;
        queryParams.limit = String(params?.limit || 200);
        const searchParams = new URLSearchParams(queryParams);
        return this.request<{ orders: Order[] }>(`/api/orders?${searchParams}`);
    }

    async getOrderHistory(params: { start_date?: string; end_date?: string; payment_method?: string }) {
        const urlParams = new URLSearchParams(params as Record<string, string>);
        return this.request<{ orders: Order[] }>(`/api/orders/history?${urlParams}`);
    }

    async getOrderStats() {
        return this.request<{
            open: number;
            paid: number;
            cancelled: number;
            todayRevenue: number;
            totalRevenue: number;
        }>('/api/orders/stats');
    }

    async cancelOrder(orderId: string, pin: string, reason?: string) {
        return this.request<{ order: Order; message: string }>(`/api/orders/${orderId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ pin, reason })
        });
    }

    // Debt Orders (Khách nợ)
    async markOrderAsDebt(orderId: string, note?: string, pin?: string) {
        return this.request<{ order_id: string; status: string; message: string }>(`/api/orders/${orderId}/mark-debt`, {
            method: 'POST',
            body: JSON.stringify({ note, pin }),
        });
    }

    async getDebtOrders() {
        return this.request<{ orders: Order[]; total: number; total_amount: number }>('/api/orders/debt');
    }

    // Delete empty order (no items) - used for auto-cleanup of takeaway/retail
    async deleteEmptyOrder(orderId: string) {
        return this.request<{ message: string }>(`/api/orders/${orderId}`, {
            method: 'DELETE',
        });
    }

    // Verify PIN for accessing paid/cancelled orders
    async verifyPin(pin: string) {
        return this.request<{ verified: boolean; user?: { id: string; name: string; role: string } }>('/api/auth/verify-pin', {
            method: 'POST',
            body: JSON.stringify({ pin }),
        });
    }

    async getPaymentMethods() {
        return this.request<{ payment_methods: PaymentMethod[] }>('/api/public/payment-methods');
    }

    async getOrder(orderId: string) {
        return this.request<{ order: OrderWithItems }>(`/api/orders/${orderId}`);
    }

    async createOrder(tableId?: string, orderType: 'dine_in' | 'takeaway' | 'retail' = 'dine_in', note?: string) {
        return this.request<{ order: Order }>('/api/orders', {
            method: 'POST',
            body: JSON.stringify({
                table_id: tableId || null,
                order_type: orderType,
                note
            }),
        });
    }

    async addOrderItem(orderId: string, item: AddItemRequest) {
        return this.request<{ item: OrderItem }>(`/api/orders/${orderId}/items`, {
            method: 'POST',
            body: JSON.stringify(item),
        });
    }

    async updateOrderItem(orderId: string, itemId: string, data: { quantity?: number; note?: string }) {
        return this.request<{ item: OrderItem }>(`/api/orders/${orderId}/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async removeOrderItem(orderId: string, itemId: string, pin?: string, reason?: string) {
        return this.request<void>(`/api/orders/${orderId}/items/${itemId}`, {
            method: 'DELETE',
            body: JSON.stringify({ pin, reason }),
        });
    }

    async applyDiscount(orderId: string, type: 'percent' | 'fixed', value: number, reason?: string, pin?: string) {
        return this.request<{ order: Order }>(`/api/orders/${orderId}/discount`, {
            method: 'POST',
            body: JSON.stringify({ type, value, reason, pin }),
        });
    }


    async payOrder(orderId: string, payments: PaymentInput[], voucher_code?: string) {
        return this.request<{ order: Order }>(`/api/orders/${orderId}/pay`, {
            method: 'POST',
            body: JSON.stringify({ payments, voucher_code }),
        });
    }

    async payOrderPartial(
        orderId: string,
        itemIds: string[],
        payments: PaymentInput[],
        discountAmount?: number,
        discountReason?: string
    ) {
        return this.request<{
            paid_order?: Order;
            original_order?: Order;
            is_partial: boolean;
            paid_items_count?: number;
            remaining_items_count?: number;
            remaining_total?: number;
            message: string;
        }>(`/api/orders/${orderId}/pay-partial`, {
            method: 'POST',
            body: JSON.stringify({
                item_ids: itemIds,
                payments,
                discount_amount: discountAmount,
                discount_reason: discountReason
            }),
        });
    }

    async validateVoucher(code: string, orderTotal: number) {
        return this.request<{ valid: boolean; discount: number; voucher: any }>('/api/vouchers/validate', {
            method: 'POST',
            body: JSON.stringify({ code, orderTotal }),
        });
    }

    async splitOrder(orderId: string, itemIds: string[]) {
        return this.request<{ original_order_id: string; new_order: Order }>(`/api/orders/${orderId}/split`, {
            method: 'POST',
            body: JSON.stringify({ item_ids: itemIds }),
        });
    }

    async sendToKitchen(orderId: string) {
        return this.request<{ sent_count: number; items: { id: string; name: string; quantity: number }[] }>(`/api/orders/${orderId}/send-to-kitchen`, {
            method: 'POST',
        });
    }

    // Kitchen
    async getKitchenQueue(stationId?: string) {
        const url = stationId
            ? `/api/kitchen/queue?station_id=${stationId}`
            : '/api/kitchen/queue';
        return this.request<{ queue: KitchenItem[]; grouped: GroupedKitchenItems[]; total_items: number }>(url);
    }

    async getKitchenHistory() {
        return this.request<{ history: KitchenItem[] }>('/api/kitchen/history');
    }

    async updateKitchenItemStatus(itemId: string, status: string) {
        return this.request<{ item: OrderItem }>(`/api/kitchen/items/${itemId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async markItemReady(itemId: string) {
        return this.request<{ item: OrderItem }>(`/api/kitchen/items/${itemId}/ready`, {
            method: 'POST',
        });
    }

    // Reports
    async getDashboardSummary() {
        return this.request<DashboardSummary>('/api/reports/dashboard/summary');
    }

    async getSalesReport(startDate?: string, endDate?: string) {
        const params = new URLSearchParams();
        if (startDate) params.set('start_date', startDate);
        if (endDate) params.set('end_date', endDate);
        return this.request<{ periods: SalesPeriod[]; totals: SalesTotals }>(`/api/reports/sales?${params}`);
    }

    // Settings
    async getSettings() {
        return this.request<Record<string, any>>('/api/settings');
    }

    async updateSetting(key: string, value: any) {
        return this.request<{ message: string }>(`/api/settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
        });
    }

    async updateSettings(settings: Record<string, any>) {
        return this.request<{ message: string }>('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        });
    }

    async uploadSettingsImage(file: File) {
        const formData = new FormData();
        formData.append('image', file);
        return this.request<{ imageUrl: string }>('/api/settings/upload', {
            method: 'POST',
            body: formData,
        });
    }

    // Payment Methods

    async getAllPaymentMethods() {
        return this.request<{ payment_methods: PaymentMethod[] }>('/api/settings/payment-methods/all');
    }

    async createPaymentMethod(data: Partial<PaymentMethod>) {
        return this.request<{ payment_method: PaymentMethod }>('/api/settings/payment-methods', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updatePaymentMethod(id: string, data: Partial<PaymentMethod>) {
        return this.request<{ payment_method: PaymentMethod }>(`/api/settings/payment-methods/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deletePaymentMethod(id: string) {
        return this.request<{ message: string }>(`/api/settings/payment-methods/${id}`, {
            method: 'DELETE',
        });
    }

    // Audit Logs
    async getAuditLogs(params?: any) {
        const searchParams = new URLSearchParams(params);
        return this.request<{ logs: any[], total: number }>(`/api/audit?${searchParams}`);
    }

    async getAuditActions() {
        return this.request<{ actions: string[] }>('/api/audit/actions');
    }

    async getAuditSummary() {
        return this.request<any>('/api/audit/summary');
    }

    // =====================================
    // V3 Admin Settings
    // =====================================

    // Slideshow
    async getSlideshow() {
        return this.request<{ images: any[] }>('/api/settings/slideshow');
    }

    async addSlideshowImage(image_url: string, title = '', sort_order = 0) {
        return this.request<{ image: any }>('/api/settings/slideshow', {
            method: 'POST',
            body: JSON.stringify({ image_url, title, sort_order }),
        });
    }

    async deleteSlideshowImage(id: string) {
        return this.request<{ message: string }>(`/api/settings/slideshow/${id}`, {
            method: 'DELETE',
        });
    }

    // Featured Products
    async getFeaturedProducts() {
        return this.request<{ products: any[] }>('/api/settings/products-featured');
    }

    async setProductFeatured(productId: string, is_featured: boolean) {
        return this.request<{ message: string }>(`/api/settings/products/${productId}/featured`, {
            method: 'PATCH',
            body: JSON.stringify({ is_featured }),
        });
    }

    async setProductBadge(productId: string, featured_badge: string | null) {
        return this.request<{ message: string }>(`/api/settings/products/${productId}/badge`, {
            method: 'PATCH',
            body: JSON.stringify({ featured_badge }),
        });
    }

    // Tablet Menu Visibility
    async getTabletMenu() {
        return this.request<{ categories: any[] }>('/api/settings/tablet-menu');
    }

    async toggleTabletMenuVisibility(type: 'category' | 'product', id: string, is_visible: boolean) {
        return this.request<{ message: string }>('/api/settings/tablet-menu/toggle', {
            method: 'POST',
            body: JSON.stringify({ type, id, is_visible }),
        });
    }

    // Quick Notes
    async getQuickNotes(productId: string) {
        return this.request<{ notes: any[] }>(`/api/settings/quick-notes/${productId}`);
    }

    async addQuickNote(product_id: string, label: string, price_modifier = 0, sort_order = 0) {
        return this.request<{ note: any }>('/api/settings/quick-notes', {
            method: 'POST',
            body: JSON.stringify({ product_id, label, price_modifier, sort_order }),
        });
    }

    async deleteQuickNote(id: string) {
        return this.request<{ message: string }>(`/api/settings/quick-notes/${id}`, {
            method: 'DELETE',
        });
    }

    // Cash Management
    async getCashStatus() {
        return this.request<{ shift: any, pay_in: number, pay_out: number, cash_sales: number, current_balance: number }>('/api/cash/current');
    }

    async openCashShift(start_amount: number, note?: string) {
        return this.request<{ shift: any }>('/api/cash/open', {
            method: 'POST',
            body: JSON.stringify({ start_amount, note }),
        });
    }

    async closeCashShift(end_amount: number, note?: string) {
        return this.request<{ shift: any }>('/api/cash/close', {
            method: 'POST',
            body: JSON.stringify({ end_amount, note }),
        });
    }

    async createCashTransaction(type: 'pay_in' | 'pay_out', amount: number, reason: string) {
        return this.request<{ transaction: any }>('/api/cash/transaction', {
            method: 'POST',
            body: JSON.stringify({ type, amount, reason }),
        });
    }

    async getCashHistory() {
        return this.request<{ shifts: any[] }>('/api/cash/history');
    }

    // Badges
    async getBadges() {
        return this.request<{ badges: Badge[] }>('/api/badges');
    }

    async createBadge(data: Partial<Badge>) {
        return this.request<{ badge: Badge }>('/api/badges', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateBadge(id: string, data: Partial<Badge>) {
        return this.request<{ badge: Badge }>(`/api/badges/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteBadge(id: string) {
        return this.request<{ message: string }>(`/api/badges/${id}`, {
            method: 'DELETE',
        });
    }

    // Combos
    async getComboItems(comboId: string) {
        return this.request<{ items: any[] }>(`/api/combos/${comboId}`);
    }

    async updateComboItems(comboId: string, items: { product_id: string; quantity: number }[]) {
        return this.request<{ success: boolean; message: string }>(`/api/combos/${comboId}`, {
            method: 'PUT',
            body: JSON.stringify({ items }),
        });
    }

    // Loyalty
    async getLoyaltyTiers() {
        return this.request<{ data: any[] }>(`/api/loyalty/tiers`);
    }

    async getLoyaltyRewards() {
        return this.request<{ data: any[] }>(`/api/loyalty/rewards`);
    }

    async getLoyaltyStats() {
        return this.request<{ data: any }>(`/api/loyalty/stats`);
    }

    async createLoyaltyTier(data: any) {
        return this.request<{ data: any }>(`/api/loyalty/tiers`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateLoyaltyTier(id: string, data: any) {
        return this.request<{ data: any }>(`/api/loyalty/tiers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async createLoyaltyReward(data: any) {
        return this.request<{ data: any }>(`/api/loyalty/rewards`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateLoyaltyReward(id: string, data: any) {
        return this.request<{ data: any }>(`/api/loyalty/rewards/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteLoyaltyReward(id: string) {
        return this.request<{ success: boolean }>(`/api/loyalty/rewards/${id}`, {
            method: 'DELETE',
        });
    }

    async getCustomerLoyalty(customerId: string) {
        return this.request<{ data: any }>(`/api/loyalty/customers/${customerId}`);
    }

    async earnLoyaltyPoints(customerId: string, orderId: string, amount: number) {
        return this.request<{ data: any }>(`/api/loyalty/customers/${customerId}/earn`, {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId, amount }),
        });
    }

    async redeemLoyaltyReward(customerId: string, rewardId: string) {
        return this.request<{ data: any }>(`/api/loyalty/customers/${customerId}/redeem`, {
            method: 'POST',
            body: JSON.stringify({ reward_id: rewardId }),
        });
    }

    // Customer search for POS
    async searchCustomers(query?: string, limit = 20) {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        params.append('limit', limit.toString());
        return this.request<{ data: Customer[] }>(`/api/loyalty/customers?${params.toString()}`);
    }

    async createCustomer(data: { name: string; phone?: string; email?: string; birthday?: string }) {
        return this.request<{ data: Customer }>('/api/loyalty/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async linkOrderCustomer(orderId: string, customerId: string | null) {
        return this.request<{ data: { order: Order } }>(`/api/orders/${orderId}/customer`, {
            method: 'PATCH',
            body: JSON.stringify({ customer_id: customerId }),
        });
    }

    // Languages
    async getLanguages() {
        return this.request<{ languages: Language[] }>('/api/languages');
    }

    async createLanguage(data: Partial<Language>) {
        return this.request<Language>('/api/languages', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateLanguage(code: string, data: Partial<Language>) {
        return this.request<Language>(`/api/languages/${code}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
}

// Types
export interface User {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'cashier' | 'kitchen';
    is_active: boolean;
}

export interface Category {
    id: string;
    name_vi: string;
    name_ja?: string;
    name_en?: string;
    sort_order: number;
    name_translations?: Record<string, string>;
}

export interface Product {
    id: string;
    category_id: string;
    sku?: string;
    name_vi: string;
    name_ja?: string;
    name_en?: string;
    name_translations?: Record<string, string>;
    description_translations?: Record<string, string>;
    price: number;
    display_in_kitchen: boolean;
    is_available: boolean;
    image_url?: string;
    category_name_vi?: string;
    // Badges
    is_best_seller?: boolean;
    is_chef_choice?: boolean;
    is_combo?: boolean;
    badge_ids?: string[];
    badges?: Badge[];
    // Stations
    station_ids?: string[];
    stations?: Station[];
}

export interface Badge {
    id: string;
    name_vi: string;
    name_en?: string;
    color: string;
    icon?: string;
    sort_order: number;
}

export interface Station {
    id: string;
    name: string;
    code: string;
    color: string;
    icon: string;
    is_active: boolean;
    sort_order: number;
}

export interface Area {
    id: string;
    name: string;
    name_vi?: string;
    name_ja?: string;
    color?: string;
    sort_order: number;
    is_active: boolean;
}

export interface Table {
    id: string;
    number: number;
    name: string;
    capacity: number;
    status: 'available' | 'occupied' | 'reserved' | 'cleaning';
    position_x: number;
    position_y: number;
    area_id?: string;
    session_id?: string;
    session_token?: string;
    session_started_at?: string;
    customer_count?: number;
    current_order_id?: string;
    current_order_total?: number;
    current_order_status?: string;
}

export interface TableSession {
    id: string;
    table_id: string;
    session_token: string;
    started_at: string;
    customer_count: number;
}

export interface Order {
    id: string;
    order_number: number;
    table_id: string;
    customer_id?: string;
    order_type?: 'dine_in' | 'takeaway' | 'retail';
    status: 'open' | 'pending_payment' | 'paid' | 'cancelled' | 'debt';
    subtotal: number;
    discount_amount: number;
    surcharge_amount: number;
    total: number;
    created_at: string;
    table_number?: number;
    table_name?: string;
    user_id?: string;
    cashier_name?: string;
    payment_method?: string;
    note?: string;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id?: string;
    open_item_name?: string;
    open_item_price?: number;
    quantity: number;
    unit_price: number;
    note?: string;
    kitchen_status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
    display_in_kitchen: boolean;
    product_name_vi?: string;
    product_name_ja?: string;
}

export interface OrderWithItems extends Order {
    items: OrderItem[];
    payments: Payment[];
}

export interface Payment {
    id: string;
    method: 'cash' | 'card' | 'paypay' | 'linepay' | 'other';
    amount: number;
    received_amount?: number;
    change_amount?: number;
}

export interface AddItemRequest {
    product_id?: string;
    open_item_name?: string;
    open_item_price?: number;
    display_in_kitchen?: boolean;
    quantity: number;
    note?: string;
}

export interface PaymentInput {
    method: string;
    amount: number;
    received_amount?: number;
    change_amount?: number;
}

export interface PaymentMethod {
    id: string;
    name: string;
    code: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    sort_order: number;
    requires_change: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface KitchenItem extends OrderItem {
    table_number: number;
    table_name: string;
    table_id?: string;
    order_type?: 'dine_in' | 'takeaway' | 'retail';
    order_created_at: string;
    kitchen_started_at?: string;
    kitchen_ready_at?: string;
    created_at?: string;
}

export interface GroupedKitchenItems {
    product: string;
    items: KitchenItem[];
    total_qty: number;
}

export interface DashboardSummary {
    today: {
        total_sales: number;
        order_count: number;
    };
    occupied_tables: number;
    kitchen_queue: number;
}

export interface Voucher {
    id: string;
    code: string;
    type: 'percent' | 'fixed';
    value: number;
    min_order_amount?: number;
    max_discount_amount?: number;
    is_active: boolean;
    expires_at?: string;
    created_at: string;
}

export interface CreateVoucherDTO {
    code: string;
    type: 'percent' | 'fixed';
    value: number;
    min_order_amount?: number;
    max_discount_amount?: number;
    expires_at?: string;
}

export interface Area {
    id: string;
    name: string;
    sort_order: number;
    tables: Table[];
}

export interface CreateAreaDTO {
    name: string;
    sort_order?: number;
}

export interface CreateTableDTO {
    number: number;
    name?: string;
    capacity?: number;
    area_id?: string;
    position_x?: number;
    position_y?: number;
}

export interface UpdateTableDTO extends Partial<CreateTableDTO> { }

export interface SalesPeriod {
    period: string;
    order_count: string;
    gross_sales: string;
    total_discounts: string;
    net_sales: string;
}

export interface SalesTotals {
    order_count: number;
    gross_sales: number;
    total_discounts: number;
    net_sales: number;
}

// deleted misplaced code

export interface Customer {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    birthday?: string;
    loyalty_points?: number;
    lifetime_points?: number;
    tier_id?: string;
    tier_name?: string;
    tier_icon?: string;
    tier_color?: string;
    referral_code?: string;
    created_at?: string;
}

export const api = new ApiService();
