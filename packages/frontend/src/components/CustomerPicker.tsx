import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { Customer } from '../services/api';
import { Search, X, UserPlus, Star, Phone, Mail } from 'lucide-react';

interface CustomerPickerProps {
    selectedCustomer?: Customer | null;
    onSelect: (customer: Customer | null) => void;
    disabled?: boolean;
}

export default function CustomerPicker({ selectedCustomer, onSelect, disabled }: CustomerPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
    const [isCreating, setIsCreating] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load customers when search changes
    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (isOpen) {
            searchTimeout.current = setTimeout(async () => {
                setIsLoading(true);
                try {
                    const res = await api.searchCustomers(searchQuery, 10);
                    if (res && 'data' in res && Array.isArray(res.data)) {
                        setCustomers(res.data);
                    } else {
                        setCustomers([]);
                    }
                } catch (error) {
                    console.error('Failed to search customers:', error);
                    setCustomers([]);
                }
                setIsLoading(false);
            }, 300);
        }

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery, isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setShowCreateForm(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateCustomer = async () => {
        if (!newCustomer.name.trim()) return;

        setIsCreating(true);
        try {
            const res = await api.createCustomer({
                name: newCustomer.name.trim(),
                phone: newCustomer.phone.trim() || undefined,
                email: newCustomer.email.trim() || undefined,
            });
            if (res && res.data && 'data' in res.data) {
                onSelect(res.data.data || null);
            }
            setIsOpen(false);
            setShowCreateForm(false);
            setNewCustomer({ name: '', phone: '', email: '' });
        } catch (error) {
            console.error('Failed to create customer:', error);
        }
        setIsCreating(false);
    };

        if (selectedCustomer) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{selectedCustomer.tier_icon || '⭐'}</span>
                        <span className="font-medium text-amber-800 truncate">{selectedCustomer.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-amber-600">
                        {selectedCustomer.phone && (
                            <span className="flex items-center gap-1">
                                <Phone size={10} />
                                {selectedCustomer.phone}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Star size={10} />
                            {selectedCustomer.loyalty_points || 0} điểm
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => onSelect(null)}
                    disabled={disabled}
                    className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-sm text-slate-600 transition"
            >
                <Search size={16} />
                <span>Thêm khách hàng tích điểm...</span>
            </button>

            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                            <Search size={16} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, SĐT, email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                                autoFocus
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Customer list */}
                    <div className="max-h-48 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-slate-400">
                                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto"></div>
                            </div>
                        ) : customers.length > 0 ? (
                            customers.map((customer) => (
                                <button
                                    key={customer.id}
                                    onClick={() => {
                                        onSelect(customer);
                                        setIsOpen(false);
                                    }}
                                    className="w-full px-3 py-2 hover:bg-slate-50 flex items-center gap-3 text-left transition"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                                        style={{ backgroundColor: customer.tier_color || '#f1f5f9' }}>
                                        {customer.tier_icon || '⭐'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{customer.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {customer.phone && <span>{customer.phone}</span>}
                                            <span className="text-amber-600">{customer.loyalty_points || 0} điểm</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-sm">
                                {searchQuery ? 'Không tìm thấy khách hàng' : 'Chưa có khách hàng nào'}
                            </div>
                        )}
                    </div>

                    {/* Create new customer */}
                    <div className="border-t border-slate-100">
                        {showCreateForm ? (
                            <div className="p-3 space-y-2">
                                <input
                                    type="text"
                                    placeholder="Tên khách hàng *"
                                    value={newCustomer.name}
                                    onChange={(e) => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                />
                                <div className="flex gap-2">
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                        <Phone size={14} className="text-slate-400" />
                                        <input
                                            type="tel"
                                            placeholder="Số điện thoại"
                                            value={newCustomer.phone}
                                            onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                                        <Mail size={14} className="text-slate-400" />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={newCustomer.email}
                                            onChange={(e) => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowCreateForm(false)}
                                        className="flex-1 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        onClick={handleCreateCustomer}
                                        disabled={!newCustomer.name.trim() || isCreating}
                                        className="flex-1 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg transition"
                                    >
                                        {isCreating ? 'Đang tạo...' : 'Tạo khách'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm text-blue-600 hover:bg-blue-50 transition"
                            >
                                <UserPlus size={16} />
                                Tạo khách hàng mới
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
