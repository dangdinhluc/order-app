// Shared types for menu components

export interface Product {
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

export interface Category {
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

export interface CartItem {
    product: Product;
    quantity: number;
    notes: string[];
    notesPriceModifier: number; // Total price modifier from selected toppings
}

export interface QuickNote {
    id: string;
    label: string;
    price_modifier: number;
}

export interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    note: string;
}

export interface KitchenTicket {
    ticket_id: string;
    ticket_number: number;
    sent_at: string;
    status: 'pending' | 'cooking' | 'served' | 'cancelled';
    items: OrderItem[];
}

export interface CurrentOrder {
    id: string;
    total: number;
    status: string;
    tickets: KitchenTicket[];
}

export interface TableSession {
    id: string;
    order_id: string;
    started_at: string;
}

export interface SlideshowImage {
    id: string;
    image_url: string;
    title?: string;
}

export type Language = string;
